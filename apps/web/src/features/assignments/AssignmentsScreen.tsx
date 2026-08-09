import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '../../lib/avatar';
import { useAuth } from '../auth/AuthContext';
import { boardColorOf } from '../board/boardColors';
import { formatDue, isDueSoon } from '../board/dates';
import { colorOf } from '../board/labelColors';
import { useRefresh } from '../realtime/useRefresh';
import * as api from './assignmentsApi';
import type { AssignedCard } from './assignmentsApi';
import type { Member } from '../board/types';

function firstName(name: string): string {
  return name.split(/\s+/)[0] || name;
}

// «Задачи людей»: выбираешь человека — видишь его карточки по всем доступным
// доскам, сгруппированные по проектам. Клик — открыть карточку на доске.
export function AssignmentsScreen({
  onOpenCard,
}: {
  onOpenCard: (boardId: string, cardId: string) => void;
}) {
  const { user } = useAuth();
  const [people, setPeople] = useState<Member[]>([]);
  const [personId, setPersonId] = useState<string | null>(user?.id ?? null);
  const [cards, setCards] = useState<AssignedCard[] | null>(null);

  useEffect(() => {
    api
      .fetchPeople()
      .then((data) => setPeople(data.people))
      .catch(() => setPeople([]));
  }, []);

  function reload(id: string) {
    api
      .fetchAssignments(id)
      .then((data) => setCards(data.cards))
      .catch(() => setCards([]));
  }

  useEffect(() => {
    if (!personId) return;
    setCards(null);
    reload(personId);
  }, [personId]);

  useRefresh(() => {
    if (personId) reload(personId);
  });

  // Группировка по доске (сохраняем порядок из ответа: по названию доски).
  const groups = useMemo(() => {
    const map = new Map<string, { title: string; color: string | null; items: AssignedCard[] }>();
    for (const c of cards ?? []) {
      const g = map.get(c.boardId) ?? { title: c.boardTitle, color: c.boardColor, items: [] };
      g.items.push(c);
      map.set(c.boardId, g);
    }
    return [...map.entries()];
  }, [cards]);

  const total = cards?.length ?? 0;
  const doneCount = cards?.filter((c) => c.done).length ?? 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, font: 'var(--text-board-title)', letterSpacing: '-0.015em' }}>
          Задачи людей
        </h1>
        <div style={{ marginTop: 4, color: 'var(--color-text-muted)', font: 'var(--text-secondary)' }}>
          выберите человека — все его карточки по всем доскам
        </div>
      </div>

      {/* Выбор человека */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: 4,
          marginBottom: 18,
          background: 'var(--color-border-soft)',
          borderRadius: 99,
          alignSelf: 'flex-start',
          maxWidth: '100%',
        }}
      >
        {people.map((p) => {
          const active = personId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPersonId(p.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                height: 32,
                padding: '0 13px 0 5px',
                borderRadius: 99,
                border: 'none',
                cursor: 'pointer',
                font: 'var(--text-ui)',
                fontWeight: active ? 700 : 500,
                background: active ? 'var(--color-surface)' : 'transparent',
                color: active ? 'var(--color-text)' : 'var(--color-text-secondary)',
                boxShadow: active ? 'var(--shadow-card)' : 'none',
              }}
            >
              <Avatar id={p.id} name={p.name} avatar={p.avatar} size={22} />
              {firstName(p.name)}
              {p.id === user?.id && (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted-soft)' }}>вы</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', maxWidth: 780 }}>
        {cards === null ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Загрузка…</p>
        ) : total === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', font: 'var(--text-secondary)' }}>
            Нет активных задач на доступных вам досках.
          </p>
        ) : (
          <>
            <div style={{ marginBottom: 14, fontSize: 12.5, color: 'var(--color-text-muted)' }}>
              Всего: {total} · выполнено: {doneCount}
            </div>
            {groups.map(([boardId, g]) => (
              <div key={boardId} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span
                    style={{ width: 9, height: 9, borderRadius: 3, background: boardColorOf(g.color).dot }}
                  />
                  <span style={{ font: 'var(--text-ui)', fontWeight: 700 }}>{g.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted-soft)' }}>
                    {g.items.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {g.items.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onOpenCard(c.boardId, c.id)}
                      className="plank-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        textAlign: 'left',
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid var(--color-border-soft)',
                        borderRadius: 'var(--radius-card)',
                        background: 'var(--color-surface)',
                        boxShadow: 'var(--shadow-card)',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          width: 17,
                          height: 17,
                          flexShrink: 0,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: c.done ? 'var(--color-success)' : 'transparent',
                          border: c.done ? 'none' : '1.6px solid var(--drag-placeholder)',
                          color: '#fff',
                        }}
                      >
                        {c.done && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          font: 'var(--text-ui)',
                          color: c.done ? 'var(--color-text-muted)' : 'var(--color-text)',
                          textDecoration: c.done ? 'line-through' : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.title}
                      </span>
                      <span
                        style={{
                          fontSize: 11.5,
                          color: 'var(--color-text-muted-soft)',
                          flexShrink: 0,
                          maxWidth: 130,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.listTitle}
                      </span>
                      {c.dueDate && (
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 7px',
                            borderRadius: 6,
                            background: isDueSoon(c.dueDate) ? colorOf('red').bg : 'var(--color-meta-bg)',
                            color: isDueSoon(c.dueDate) ? colorOf('red').fg : 'var(--color-meta-fg)',
                          }}
                        >
                          {formatDue(c.dueDate, c.dueTime)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
