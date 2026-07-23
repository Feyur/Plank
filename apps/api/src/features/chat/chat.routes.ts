import type { FastifyInstance } from 'fastify';
import { pool } from '../../db';
import { requireBoardParamAccess } from '../access/board-access';
import { requireAuth } from '../auth/auth.routes';
import { broadcastBoardChange } from '../realtime/realtime';

// Чат доски — общий поток коротких сообщений (вопрос — ответ), без тредов.
// Логика тривиальна, держим в роутах, как notes.

interface MessageRow {
  id: string;
  author_id: string;
  author_name: string;
  author_handle: string;
  author_avatar: string | null;
  text: string;
  created_at: Date;
}

function toMessage(row: MessageRow) {
  return {
    id: row.id,
    author: {
      id: row.author_id,
      name: row.author_name,
      handle: row.author_handle,
      avatar: row.author_avatar,
    },
    text: row.text,
    createdAt: row.created_at.toISOString(),
  };
}

const uuidPattern = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
const idParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', pattern: uuidPattern } },
} as const;

const SELECT_MESSAGE = `
  select m.id, m.author_id, m.text, m.created_at,
         u.name as author_name, u.handle as author_handle, u.avatar as author_avatar
    from board_messages m
    join users u on u.id = m.author_id`;

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  // Любая мутация чата — сигнал клиентам обновиться (как на доске).
  app.addHook('onResponse', async (request, reply) => {
    if (request.method !== 'GET' && reply.statusCode < 300) {
      broadcastBoardChange();
    }
  });

  app.get<{ Params: { id: string }; Querystring: { limit?: number } }>(
    '/boards/:id/chat',
    {
      preHandler: requireBoardParamAccess,
      schema: {
        params: idParams,
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: { limit: { type: 'integer', minimum: 1, maximum: 200 } },
        },
      },
    },
    async (request, reply) => {
      const limit = request.query.limit ?? 100;
      const { rows } = await pool.query<MessageRow>(
        `${SELECT_MESSAGE} where m.board_id = $1 order by m.created_at desc limit $2`,
        [request.params.id, limit],
      );
      return reply.send({ messages: rows.reverse().map(toMessage) });
    },
  );

  app.post<{ Params: { id: string }; Body: { text: string } }>(
    '/boards/:id/chat',
    {
      preHandler: requireBoardParamAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['text'],
          additionalProperties: false,
          properties: { text: { type: 'string', minLength: 1, maxLength: 2000 } },
        },
      },
    },
    async (request, reply) => {
      const { rows } = await pool.query<{ id: string }>(
        'insert into board_messages (board_id, author_id, text) values ($1, $2, $3) returning id',
        [request.params.id, request.user.sub, request.body.text.trim()],
      );
      const { rows: full } = await pool.query<MessageRow>(`${SELECT_MESSAGE} where m.id = $1`, [
        rows[0].id,
      ]);
      return reply.code(201).send({ message: toMessage(full[0]) });
    },
  );

  // Удалить можно только своё сообщение.
  app.delete<{ Params: { id: string } }>(
    '/chat/:id',
    { schema: { params: idParams } },
    async (request, reply) => {
      const { rowCount } = await pool.query(
        'delete from board_messages where id = $1 and author_id = $2',
        [request.params.id, request.user.sub],
      );
      if (rowCount === 0) return reply.code(404).send({ error: 'Не найдено' });
      return reply.send({ ok: true });
    },
  );
}
