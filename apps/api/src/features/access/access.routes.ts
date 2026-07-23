import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { pgUserRepo } from '../auth/auth.repo';
import { requireAuth } from '../auth/auth.routes';
import { pgAccessRepo } from './access.repo';
import { isAccessAdminEmail } from './access.policy';
import {
  AccessError,
  createManagedUser,
  listManagedUsers,
  updateManagedUserBoards,
} from './access.service';

const emailPattern = '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$';
const uuidPattern = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
const handlePattern = '^[A-Za-zА-Яа-яЁё0-9_]{3,32}$';

interface NewManagedUser {
  email: string;
  password: string;
  handle: string;
  boardIds: string[];
}

async function requireAccessAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = await pgUserRepo.findById(request.user.sub);
  if (!user || !isAccessAdminEmail(user.email)) {
    await reply.code(403).send({ error: 'Недостаточно прав' });
  }
}

export async function accessRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireAccessAdmin);

  app.get('/access/users', async (request, reply) => {
    const actor = await pgUserRepo.findById(request.user.sub);
    if (!actor) return reply.code(403).send({ error: 'Недостаточно прав' });
    return reply.send({ users: await listManagedUsers(pgAccessRepo, actor.email) });
  });

  app.post<{ Body: NewManagedUser }>(
    '/access/users',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
          errorResponseBuilder: () => ({
            statusCode: 429,
            error: 'Слишком много попыток. Подождите минуту.',
          }),
        },
      },
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password', 'handle', 'boardIds'],
          additionalProperties: false,
          properties: {
            email: { type: 'string', pattern: emailPattern, maxLength: 254 },
            password: { type: 'string', minLength: 8, maxLength: 200 },
            handle: { type: 'string', pattern: handlePattern, maxLength: 32 },
            boardIds: {
              type: 'array',
              minItems: 1,
              uniqueItems: true,
              maxItems: 200,
              items: { type: 'string', pattern: uuidPattern },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const actor = await pgUserRepo.findById(request.user.sub);
      if (!actor) return reply.code(403).send({ error: 'Недостаточно прав' });

      try {
        const user = await createManagedUser(pgAccessRepo, actor.email, {
          email: request.body.email.trim(),
          password: request.body.password,
          handle: request.body.handle,
          boardIds: request.body.boardIds,
        });
        return reply.code(201).send({ user });
      } catch (err) {
        if (err instanceof AccessError && err.code === 'EMAIL_TAKEN') {
          return reply.code(409).send({ error: 'Пользователь с таким email уже существует' });
        }
        if (err instanceof AccessError && err.code === 'HANDLE_TAKEN') {
          return reply.code(409).send({ error: 'Этот ник уже занят' });
        }
        if (err instanceof AccessError && err.code === 'BOARD_NOT_FOUND') {
          return reply.code(404).send({ error: 'Одна из досок не найдена' });
        }
        if (err instanceof AccessError && err.code === 'NOT_ADMIN') {
          return reply.code(403).send({ error: 'Недостаточно прав' });
        }
        throw err;
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { boardIds: string[] } }>(
    '/access/users/:id/boards',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          additionalProperties: false,
          properties: { id: { type: 'string', pattern: uuidPattern } },
        },
        body: {
          type: 'object',
          required: ['boardIds'],
          additionalProperties: false,
          properties: {
            boardIds: {
              type: 'array',
              uniqueItems: true,
              maxItems: 200,
              items: { type: 'string', pattern: uuidPattern },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const actor = await pgUserRepo.findById(request.user.sub);
      if (!actor) return reply.code(403).send({ error: 'Недостаточно прав' });

      try {
        await updateManagedUserBoards(
          pgAccessRepo,
          actor.email,
          request.params.id,
          request.body.boardIds,
        );
        return reply.send({ ok: true });
      } catch (err) {
        if (err instanceof AccessError && err.code === 'USER_NOT_FOUND') {
          return reply.code(404).send({ error: 'Пользователь не найден' });
        }
        if (err instanceof AccessError && err.code === 'BOARD_NOT_FOUND') {
          return reply.code(404).send({ error: 'Одна из досок не найдена' });
        }
        if (err instanceof AccessError && err.code === 'PROTECTED_USER') {
          return reply.code(400).send({ error: 'Администратор доступа видит все доски' });
        }
        if (err instanceof AccessError && err.code === 'NOT_ADMIN') {
          return reply.code(403).send({ error: 'Недостаточно прав' });
        }
        throw err;
      }
    },
  );
}
