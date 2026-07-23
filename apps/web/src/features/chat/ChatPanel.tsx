import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../../lib/avatar';
import { useAuth } from '../auth/AuthContext';
import * as api from '../board/boardApi';
import { formatCommentTime } from '../board/dates';
import type { ChatMessage } from '../board/types';
import { useRealtime } from '../realtime/useRealtime';

// Чат доски: выезжающая справа панель с общим потоком сообщений.
// onSeen сообщает наверх время последнего сообщения — для точки «непрочитано».
export function ChatPanel({
  boardId,
  onClose,
  onSeen,
}: {
  boardId: string;
  onClose: () => void;
  onSeen: (lastAt: string | null) => void;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  function markSeen(list: ChatMessage[]) {
    onSeen(list.length > 0 ? list[list.length - 1].createdAt : null);
  }

  async function reload() {
    try {
      const data = await api.fetchChat(boardId);
      setMessages(data.messages);
      markSeen(data.messages);
    } catch {
      setMessages([]);
    }
  }

  useEffect(() => {
    setMessages(null);
    reload();
  }, [boardId]);

  useRealtime(reload);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // К последнему сообщению — при загрузке и при новых.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages?.length]);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    try {
      const { message } = await api.sendChatMessage(boardId, text);
      setMessages((prev) => {
        const next = [...(prev ?? []), message];
        markSeen(next);
        return next;
      });
    } catch {
      setDraft(text); // не потерять текст при ошибке сети
    }
  }

  function remove(id: string) {
    setMessages((prev) => (prev ? prev.filter((m) => m.id !== id) : prev));
    api.deleteChatMessage(id).catch(() => reload());
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 54,
        right: 0,
        bottom: 0,
        width: 'min(380px, 100vw)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-dropdown)',
        zIndex: 85,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '14px 16px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <h2 style={{ margin: 0, font: 'var(--text-section-title)', flex: 1 }}>Чат доски</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть чат"
          style={{
            width: 32,
            height: 32,
            border: 'none',
            borderRadius: 9,
            background: 'var(--color-border-soft)',
            color: 'var(--color-text-secondary)',
            fontSize: 17,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      <div
        ref={scrollRef}
        className="scrl"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages === null ? (
          <p style={{ color: 'var(--color-text-muted)', font: 'var(--text-secondary)' }}>
            Загрузка…
          </p>
        ) : messages.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', font: 'var(--text-secondary)' }}>
            Пока тихо. Напишите первым — чат видят все участники доски.
          </p>
        ) : (
          messages.map((message) => (
            <div key={message.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
              <Avatar
                id={message.author.id}
                name={message.author.name}
                avatar={message.author.avatar}
                size={26}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <span style={{ font: 'var(--text-ui)', fontWeight: 700 }}>
                    {message.author.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted-soft)' }}>
                    {formatCommentTime(message.createdAt)}
                  </span>
                  {message.author.id === user?.id && (
                    <button
                      type="button"
                      onClick={() => remove(message.id)}
                      aria-label="Удалить сообщение"
                      style={{
                        marginLeft: 'auto',
                        border: 'none',
                        background: 'none',
                        color: 'var(--color-text-muted-soft)',
                        cursor: 'pointer',
                        fontSize: 12,
                        padding: 0,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div
                  style={{
                    font: 'var(--text-ui)',
                    fontWeight: 500,
                    color: 'var(--color-text-secondary-strong)',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word',
                  }}
                >
                  {message.text}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '12px 16px',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Написать в чат…"
          autoFocus
          style={{
            flex: 1,
            height: 38,
            border: '1px solid var(--color-border)',
            borderRadius: 9,
            padding: '0 12px',
            font: 'var(--text-ui)',
            color: 'var(--color-text)',
            background: 'var(--color-surface)',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={send}
          aria-label="Отправить"
          style={{
            height: 38,
            padding: '0 15px',
            border: 'none',
            borderRadius: 9,
            background: 'var(--color-accent)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
