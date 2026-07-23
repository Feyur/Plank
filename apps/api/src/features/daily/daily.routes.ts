import type { FastifyInstance } from 'fastify';
import { pool } from '../../db';
import { requireAuth } from '../auth/auth.routes';

// Дейли — командный асинхронный стендап. На выбранную дату отдаём запись
// КАЖДОГО участника (пусто, если не заполнял), а править можно только свою.
// Логика простая — держим прямо в роутах, как в notes.

interface DailyRow {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  done: string | null;
  doing: string | null;
  next: string | null;
  updated_at: Date | null;
}

function toPerson(row: DailyRow) {
  return {
    user: { id: row.id, name: row.name, handle: row.handle, avatar: row.avatar },
    done: row.done ?? '',
    doing: row.doing ?? '',
    next: row.next ?? '',
    updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
  };
}

const datePattern = '^\\d{4}-\\d{2}-\\d{2}$';
const section = { type: 'string', maxLength: 5000 } as const;

export async function dailyRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  // Все участники + их запись на дату (left join — кто не заполнял, тоже в списке).
  app.get<{ Querystring: { date: string } }>(
    '/daily',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['date'],
          additionalProperties: false,
          properties: { date: { type: 'string', pattern: datePattern } },
        },
      },
    },
    async (request, reply) => {
      const { rows } = await pool.query<DailyRow>(
        `select u.id, u.name, u.handle, u.avatar,
                d.done, d.doing, d.next, d.updated_at
           from users u
           left join daily_entries d on d.user_id = u.id and d.entry_date = $1
          order by u.name`,
        [request.query.date],
      );
      return reply.send({ date: request.query.date, people: rows.map(toPerson) });
    },
  );

  // Обновляем/создаём ТОЛЬКО свою запись на дату.
  app.put<{ Body: { date: string; done: string; doing: string; next: string } }>(
    '/daily',
    {
      schema: {
        body: {
          type: 'object',
          required: ['date', 'done', 'doing', 'next'],
          additionalProperties: false,
          properties: { date: { type: 'string', pattern: datePattern }, done: section, doing: section, next: section },
        },
      },
    },
    async (request, reply) => {
      const { date, done, doing, next } = request.body;
      await pool.query(
        `insert into daily_entries (user_id, entry_date, done, doing, next)
         values ($1, $2, $3, $4, $5)
         on conflict (user_id, entry_date)
         do update set done = $3, doing = $4, next = $5, updated_at = now()`,
        [request.user.sub, date, done, doing, next],
      );
      return reply.send({ ok: true });
    },
  );
}
