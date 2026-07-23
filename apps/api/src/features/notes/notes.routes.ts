import type { FastifyInstance, FastifyReply } from 'fastify';
import { pool } from '../../db';
import { requireAuth } from '../auth/auth.routes';

// Заметки — простое личное пространство (как заметки Apple). Всё owner-scoped:
// пользователь видит и правит только свои. Логика тривиальна, поэтому держим
// её прямо в роутах, без отдельного service.
interface NoteRow {
  id: string;
  body: string;
  updated_at: Date;
}

interface PublicNote {
  id: string;
  body: string;
  updatedAt: string;
}

const toNote = (row: NoteRow): PublicNote => ({
  id: row.id,
  body: row.body,
  updatedAt: row.updated_at.toISOString(),
});

const idParams = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    },
  },
} as const;

const bodySchema = {
  type: 'object',
  required: ['body'],
  additionalProperties: false,
  properties: { body: { type: 'string', maxLength: 50000 } },
} as const;

async function ownsNote(ownerId: string, id: string): Promise<boolean> {
  const { rows } = await pool.query('select 1 from notes where id = $1 and owner_id = $2', [
    id,
    ownerId,
  ]);
  return rows.length > 0;
}

function notFound(reply: FastifyReply) {
  return reply.code(404).send({ error: 'Не найдено' });
}

export async function notesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/notes', async (request, reply) => {
    const { rows } = await pool.query<NoteRow>(
      'select id, body, updated_at from notes where owner_id = $1 order by updated_at desc',
      [request.user.sub],
    );
    return reply.send({ notes: rows.map(toNote) });
  });

  app.post<{ Body: { body?: string } }>(
    '/notes',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: { body: { type: 'string', maxLength: 50000 } },
        },
      },
    },
    async (request, reply) => {
      const { rows } = await pool.query<NoteRow>(
        'insert into notes (owner_id, body) values ($1, $2) returning id, body, updated_at',
        [request.user.sub, request.body?.body ?? ''],
      );
      return reply.code(201).send({ note: toNote(rows[0]) });
    },
  );

  app.patch<{ Params: { id: string }; Body: { body: string } }>(
    '/notes/:id',
    { schema: { params: idParams, body: bodySchema } },
    async (request, reply) => {
      if (!(await ownsNote(request.user.sub, request.params.id))) return notFound(reply);
      const { rows } = await pool.query<NoteRow>(
        'update notes set body = $2, updated_at = now() where id = $1 returning id, body, updated_at',
        [request.params.id, request.body.body],
      );
      return reply.send({ note: toNote(rows[0]) });
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/notes/:id',
    { schema: { params: idParams } },
    async (request, reply) => {
      if (!(await ownsNote(request.user.sub, request.params.id))) return notFound(reply);
      await pool.query('delete from notes where id = $1', [request.params.id]);
      return reply.send({ ok: true });
    },
  );
}
