import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';
import { config, SESSION_COOKIE } from './config';
import { accessRoutes } from './features/access/access.routes';
import { authRoutes } from './features/auth/auth.routes';
import { boardRoutes } from './features/board/board.routes';
import { dailyRoutes } from './features/daily/daily.routes';
import { notesRoutes } from './features/notes/notes.routes';
import { notificationsRoutes } from './features/notifications/notifications.routes';
import { realtimeRoutes } from './features/realtime/realtime';

// Фабрика приложения — отдельно от запуска, чтобы можно было тестировать
// через app.inject() без реального сетевого сокета.
export async function buildApp(): Promise<FastifyInstance> {
  // trustProxy: на проде перед приложением Caddy, реальный IP — в X-Forwarded-For
  // (нужен rate-limit'у, чтобы не считать все запросы одним клиентом-прокси).
  const app = Fastify({ logger: false, trustProxy: true });

  // Лимиты включаются точечно на роутах входа/регистрации (global: false).
  await app.register(rateLimit, { global: false });

  // Фронт и API живут на разных портах в dev — нужен CORS с cookie.
  // На проде оба за одним прокси, origin ограничен через WEB_ORIGIN.
  // methods обязательно перечисляем: дефолт @fastify/cors — только
  // GET,HEAD,POST, и браузер режет PATCH/DELETE на preflight.
  await app.register(cors, {
    origin: config.webOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'],
  });
  await app.register(cookie);
  await app.register(jwt, {
    secret: config.authSecret,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
  });
  await app.register(websocket);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes);
  await app.register(accessRoutes);
  await app.register(boardRoutes);
  await app.register(dailyRoutes);
  await app.register(notesRoutes);
  await app.register(notificationsRoutes);
  await app.register(realtimeRoutes);

  // В проде приложение само отдаёт собранный фронт (SPA-фолбэк на index.html).
  if (config.webDir) {
    await app.register(fastifyStatic, { root: config.webDir, wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET') return reply.sendFile('index.html');
      return reply.code(404).send({ error: 'Не найдено' });
    });
  }

  return app;
}
