import type { FastifyInstance } from 'fastify';
import { pool } from '../../db';
import { requireAuth } from '../auth/auth.routes';
import { broadcastBoardChange } from '../realtime/realtime';

// Папки для группировки досок в сайдбаре: общие на команду, простой CRUD.
// Доска ссылается на папку через boards.folder_id (on delete set null).

interface FolderRow {
  id: string;
  name: string;
  color: string | null;
  position: number;
}

const toFolder = (row: FolderRow) => ({
  id: row.id,
  name: row.name,
  color: row.color,
  position: row.position,
});

const uuidPattern = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
const idParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', pattern: uuidPattern } },
} as const;

export async function foldersRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/folders', async (_request, reply) => {
    const { rows } = await pool.query<FolderRow>(
      'select id, name, color, position from folders order by position, name',
    );
    return reply.send({ folders: rows.map(toFolder) });
  });

  app.post<{ Body: { name: string } }>(
    '/folders',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          additionalProperties: false,
          properties: { name: { type: 'string', minLength: 1, maxLength: 60 } },
        },
      },
    },
    async (request, reply) => {
      const { rows } = await pool.query<FolderRow>(
        `insert into folders (name, position)
         values ($1, coalesce((select max(position) from folders), 0) + 1024)
         returning id, name, color, position`,
        [request.body.name.trim()],
      );
      broadcastBoardChange();
      return reply.code(201).send({ folder: toFolder(rows[0]) });
    },
  );

  app.patch<{ Params: { id: string }; Body: { name?: string; color?: string | null } }>(
    '/folders/:id',
    {
      schema: {
        params: idParams,
        body: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 60 },
            color: { type: ['string', 'null'], pattern: '^[a-z]{2,16}$' },
          },
        },
      },
    },
    async (request, reply) => {
      const { name, color } = request.body;
      const { rows } = await pool.query<FolderRow>(
        `update folders set
           name  = coalesce($2, name),
           color = case when $3 then $4 else color end
         where id = $1
         returning id, name, color, position`,
        [request.params.id, name ?? null, color !== undefined, color ?? null],
      );
      if (rows.length === 0) return reply.code(404).send({ error: 'Не найдено' });
      broadcastBoardChange();
      return reply.send({ folder: toFolder(rows[0]) });
    },
  );

  // Удаляем папку; доски внутри становятся «без папки» (on delete set null).
  app.delete<{ Params: { id: string } }>(
    '/folders/:id',
    { schema: { params: idParams } },
    async (request, reply) => {
      const { rowCount } = await pool.query('delete from folders where id = $1', [
        request.params.id,
      ]);
      if (rowCount === 0) return reply.code(404).send({ error: 'Не найдено' });
      broadcastBoardChange();
      return reply.send({ ok: true });
    },
  );
}
