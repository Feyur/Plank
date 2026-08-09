import type { FastifyInstance } from 'fastify';
import { pool } from '../../db';
import { config } from '../../config';
import { boardAccessRepo } from '../access/access.repo';
import { requireAuth } from '../auth/auth.routes';

// «Задачи людей»: карточки конкретного исполнителя сразу по всем доскам,
// к которым у запрашивающего есть доступ. Плюс список людей для выбора.

interface AssignedRow {
  id: string;
  title: string;
  due_date: string | null;
  due_time: string | null;
  done: boolean;
  list_title: string;
  board_id: string;
  board_title: string;
  board_color: string | null;
}

interface PersonRow {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
}

const uuidField = {
  type: 'string',
  pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
} as const;

export async function assignmentsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  // Все люди команды — для переключателя исполнителя.
  app.get('/assignments/people', async (_request, reply) => {
    const { rows } = await pool.query<PersonRow>(
      'select id, name, handle, avatar from users order by name',
    );
    return reply.send({ people: rows });
  });

  // Карточки исполнителя по всем доступным запрашивающему доскам.
  app.get<{ Querystring: { userId: string } }>(
    '/assignments',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['userId'],
          additionalProperties: false,
          properties: { userId: uuidField },
        },
      },
    },
    async (request, reply) => {
      const boards = await boardAccessRepo.boardsForUser(request.user.sub, config.accessAdminEmails);
      const boardIds = boards.map((b) => b.id);
      if (boardIds.length === 0) return reply.send({ cards: [] });

      const { rows } = await pool.query<AssignedRow>(
        `select c.id, c.title, c.due_date, c.due_time, c.done,
                l.title as list_title,
                b.id as board_id, b.title as board_title, b.color as board_color
           from cards c
           join lists l on l.id = c.list_id
           join boards b on b.id = l.board_id
          where c.assignee_id = $1
            and c.archived_at is null
            and b.id = any($2::uuid[])
          order by b.title, l.position, c.position`,
        [request.query.userId, boardIds],
      );

      const cards = rows.map((r) => ({
        id: r.id,
        title: r.title,
        dueDate: r.due_date,
        dueTime: r.due_time,
        done: r.done,
        listTitle: r.list_title,
        boardId: r.board_id,
        boardTitle: r.board_title,
        boardColor: r.board_color,
      }));
      return reply.send({ cards });
    },
  );
}
