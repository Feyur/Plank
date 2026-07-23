import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';

// Простой in-memory реестр WebSocket-подключений. Данные по сокету не гоняем —
// только сигнал «доска изменилась», по которому клиенты перезапрашивают доску.
const sockets = new Set<WebSocket>();

export function broadcastBoardChange(): void {
  const message = JSON.stringify({ type: 'board-changed' });
  for (const socket of sockets) {
    try {
      socket.send(message);
    } catch {
      /* мёртвый сокет удалится по close */
    }
  }
}

export async function realtimeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/ws', { websocket: true }, (socket, request) => {
    // Пускаем только с валидной сессией (cookie с JWT).
    request
      .jwtVerify()
      .then(() => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
      })
      .catch(() => socket.close());
  });
}
