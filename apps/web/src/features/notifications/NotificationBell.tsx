import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Avatar } from '../../lib/avatar';
import { useAuth } from '../auth/AuthContext';
import { formatCommentTime } from '../board/dates';
import { useRealtime } from '../realtime/useRealtime';

interface Notification {
  id: string;
  type: 'mention';
  createdAt: string;
  readAt: string | null;
  actor: { id: string; name: string; handle: string; avatar: string | null };
  board: { id: string; title: string };
  card: { id: string; title: string };
  commentText: string;
}

async function fetchNotifications(): Promise<Notification[]> {
  const data = await apiFetch<{ notifications: Notification[] }>('/notifications');
  return data.notifications;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  async function reload() {
    if (!user) return;
    try {
      setNotifications(await fetchNotifications());
    } catch {
      // Колокольчик не должен мешать работе с доской, если сеть временно недоступна.
    }
  }

  useEffect(() => {
    if (user) reload();
    else setNotifications([]);
  }, [user?.id]);

  useRealtime(reload);

  const unread = notifications.filter((notification) => !notification.readAt).length;

  async function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || unread === 0) return;

    try {
      await apiFetch('/notifications/read', { method: 'PATCH' });
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? new Date().toISOString(),
        })),
      );
    } catch {
      // При ошибке оставляем счётчик: пользователь сможет попробовать ещё раз.
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Уведомления, непрочитанных: ${unread}` : 'Уведомления'}
        title="Уведомления"
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          border: '1px solid var(--color-input-border)',
          borderRadius: 9,
          background: 'var(--color-surface)',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
        >
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unread > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 99,
              background: 'var(--color-danger)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              lineHeight: '16px',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 348,
              maxWidth: 'calc(100vw - 24px)',
              maxHeight: 420,
              overflow: 'auto',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-dropdown)',
              zIndex: 95,
              padding: 8,
            }}
          >
            <div style={{ padding: '4px 8px 9px', font: 'var(--text-ui)', fontWeight: 800 }}>
              Упоминания
            </div>
            {notifications.length === 0 ? (
              <p style={{ margin: '4px 8px 10px', color: 'var(--color-text-muted)', fontSize: 13 }}>
                Пока вас не упоминали.
              </p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    padding: '10px 8px',
                    borderTop: '1px solid var(--color-border-soft)',
                    background: notification.readAt ? 'transparent' : 'rgba(91,91,214,.055)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 3 }}>
                    <Avatar
                      id={notification.actor.id}
                      name={notification.actor.name}
                      avatar={notification.actor.avatar}
                      size={20}
                    />
                    <span
                      style={{
                        font: 'var(--text-ui)',
                        fontWeight: 700,
                        color: 'var(--color-text)',
                      }}
                    >
                      {notification.actor.name}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                      · {formatCommentTime(notification.createdAt)}
                    </span>
                  </div>
                  <div
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: 12,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {notification.board.title} · {notification.card.title}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      color: 'var(--color-text-secondary-strong)',
                      font: 'var(--text-ui)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {notification.commentText}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
