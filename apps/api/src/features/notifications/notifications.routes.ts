import type { FastifyInstance } from 'fastify';
import { config } from '../../config';
import { requireAuth } from '../auth/auth.routes';
import { notificationsRepo, type NotificationRow } from './notifications.repo';

function toPublicNotification(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type,
    createdAt: row.created_at.toISOString(),
    readAt: row.read_at?.toISOString() ?? null,
    actor: {
      id: row.actor_id,
      name: row.actor_name,
      handle: row.actor_handle,
      avatar: row.actor_avatar,
    },
    board: { id: row.board_id, title: row.board_title },
    card: { id: row.card_id, title: row.card_title },
    commentText: row.comment_text,
  };
}

export async function notificationsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/notifications', async (request, reply) => {
    const notifications = await notificationsRepo.listForUser(
      request.user.sub,
      config.accessAdminEmails,
    );
    return reply.send({ notifications: notifications.map(toPublicNotification) });
  });

  app.patch('/notifications/read', async (request, reply) => {
    await notificationsRepo.markAllRead(request.user.sub);
    return reply.send({ ok: true });
  });
}
