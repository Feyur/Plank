import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config, SESSION_COOKIE } from '../../config';
import { isAccessAdminEmail } from '../access/access.policy';
import { InvalidAvatarError } from './avatar';
import { normalizeHandle } from './handle';
import { pgUserRepo } from './auth.repo';
import {
  AuthError,
  authenticateUser,
  registerUser,
  toPublicUser,
  updateProfile,
} from './auth.service';

const emailPattern = '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$';
const handlePattern = '^[A-Za-zА-Яа-яЁё0-9_]{3,32}$';

const credentialsSchema = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', pattern: emailPattern, maxLength: 254 },
    password: { type: 'string', minLength: 8, maxLength: 200 },
  },
} as const;

const registerSchema = {
  type: 'object',
  required: ['email', 'name', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', pattern: emailPattern, maxLength: 254 },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    password: { type: 'string', minLength: 8, maxLength: 200 },
  },
} as const;

interface Credentials {
  email: string;
  password: string;
}
interface Registration extends Credentials {
  name: string;
}

function setSessionCookie(reply: FastifyReply, userId: string): void {
  const token = reply.server.jwt.sign({ sub: userId }, { expiresIn: '30d' });
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

// Проверка сессии для защищённых роутов. Наружу — общее сообщение,
// без подробностей почему именно не пустили.
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    await reply.code(401).send({ error: 'Требуется вход' });
  }
}

// Перебор паролей: не больше 10 попыток в минуту с одного IP.
const loginRateLimit = {
  rateLimit: {
    max: 10,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Слишком много попыток. Подождите минуту.',
    }),
  },
};

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: Registration }>(
    '/auth/register',
    { schema: { body: registerSchema }, config: loginRateLimit },
    async (request, reply) => {
      if (!config.registrationEnabled) {
        return reply.code(403).send({ error: 'Регистрация закрыта. Обратитесь к администратору.' });
      }
      if (isAccessAdminEmail(request.body.email)) {
        return reply.code(403).send({ error: 'Этот аккаунт создаётся только администратором.' });
      }
      try {
        const user = await registerUser(pgUserRepo, {
          email: request.body.email.trim(),
          name: request.body.name.trim(),
          password: request.body.password,
        });
        setSessionCookie(reply, user.id);
        return reply.code(201).send({ user });
      } catch (err) {
        if (err instanceof AuthError && err.code === 'EMAIL_TAKEN') {
          return reply.code(409).send({ error: 'Пользователь с таким email уже существует' });
        }
        throw err;
      }
    },
  );

  app.post<{ Body: Credentials }>(
    '/auth/login',
    { schema: { body: credentialsSchema }, config: loginRateLimit },
    async (request, reply) => {
      try {
        const user = await authenticateUser(pgUserRepo, {
          email: request.body.email.trim(),
          password: request.body.password,
        });
        setSessionCookie(reply, user.id);
        return reply.send({ user });
      } catch (err) {
        if (err instanceof AuthError) {
          return reply.code(401).send({ error: 'Неверный email или пароль' });
        }
        throw err;
      }
    },
  );

  app.post('/auth/logout', async (_request, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return reply.send({ ok: true });
  });

  app.get('/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    const user = await pgUserRepo.findById(request.user.sub);
    if (!user) {
      // Токен валиден, но пользователя уже нет — считаем сессию недействительной.
      reply.clearCookie(SESSION_COOKIE, { path: '/' });
      return reply.code(401).send({ error: 'Требуется вход' });
    }
    return reply.send({ user: toPublicUser(user) });
  });

  app.patch<{ Body: { name: string; role: string; handle: string; avatar?: string | null } }>(
    '/auth/me',
    {
      preHandler: requireAuth,
      schema: {
        body: {
          type: 'object',
          required: ['name', 'role', 'handle'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            role: { type: 'string', minLength: 1, maxLength: 60 },
            handle: { type: 'string', pattern: handlePattern, maxLength: 32 },
            // Точную форму (пресет или картинка нужного размера) проверяет сервис.
            avatar: { type: ['string', 'null'], maxLength: 100000 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await updateProfile(pgUserRepo, request.user.sub, {
          name: request.body.name,
          role: request.body.role,
          handle: normalizeHandle(request.body.handle),
          avatar: request.body.avatar,
        });
        return reply.send({ user });
      } catch (err) {
        if (err instanceof AuthError && err.code === 'HANDLE_TAKEN') {
          return reply.code(409).send({ error: 'Этот ник уже занят' });
        }
        if (err instanceof InvalidAvatarError) {
          return reply.code(400).send({ error: 'Недопустимый аватар' });
        }
        throw err;
      }
    },
  );
}
