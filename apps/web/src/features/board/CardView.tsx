import type { CSSProperties, HTMLAttributes, Ref } from 'react';
import { Avatar } from './avatar';
import { formatDue, isDueSoon } from './dates';
import { colorOf } from './labelColors';
import type { Card } from './types';

interface CardViewProps extends HTMLAttributes<HTMLDivElement> {
  card: Card;
  innerRef?: Ref<HTMLDivElement>;
  onToggleDone?: (done: boolean) => void;
}

const baseStyle: CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border-soft)',
  borderRadius: 'var(--radius-card)',
  boxShadow: 'var(--shadow-card)',
  padding: '11px 13px',
  cursor: 'pointer',
  touchAction: 'none',
  userSelect: 'none',
};

// Чисто визуальная карточка — используется и в колонке, и как «призрак»
// при перетаскивании. Без drag-логики.
export function CardView({
  card,
  innerRef,
  style,
  className,
  onToggleDone,
  ...rest
}: CardViewProps) {
  const soon = card.dueDate ? isDueSoon(card.dueDate) : false;

  return (
    <div ref={innerRef} className={className} style={{ ...baseStyle, ...style }} {...rest}>
      {card.labels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          {card.labels.map((label) => {
            const c = colorOf(label.color);
            return (
              <span
                key={label.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: c.bg,
                  color: c.fg,
                }}
              >
                {label.name}
              </span>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        <CheckDot done={card.done} onToggle={onToggleDone} />
        <div
          style={{
            flex: 1,
            font: 'var(--text-card-title)',
            color: card.done ? 'var(--color-text-muted)' : 'var(--color-text)',
            textDecoration: card.done ? 'line-through' : 'none',
            textDecorationColor: 'var(--color-success)',
            textWrap: 'pretty',
          }}
        >
          {card.title}
        </div>
      </div>

      {(card.dueDate ||
        card.checklist.length > 0 ||
        card.comments.length > 0 ||
        card.assignee) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          {card.dueDate && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 7px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                background: soon ? 'var(--color-danger-bg)' : 'var(--color-meta-bg)',
                color: soon ? 'var(--color-danger)' : 'var(--color-meta-fg)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="16" rx="2.5" />
                <line x1="3" y1="9.5" x2="21" y2="9.5" />
                <line x1="8" y1="2.5" x2="8" y2="6.5" />
                <line x1="16" y1="2.5" x2="16" y2="6.5" />
              </svg>
              {formatDue(card.dueDate, card.dueTime)}
            </span>
          )}
          {card.checklist.length > 0 &&
            (() => {
              const done = card.checklist.filter((i) => i.done).length;
              const all = done === card.checklist.length;
              return (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 7px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    background: all ? 'var(--color-success-bg)' : 'var(--color-meta-bg)',
                    color: all ? 'var(--color-success)' : 'var(--color-meta-fg)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {done}/{card.checklist.length}
                </span>
              );
            })()}
          {card.comments.length > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11.5,
                fontWeight: 600,
                color: 'var(--color-text-muted)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <rect x="3" y="4" width="18" height="13" rx="3" />
                <path d="M8 17 L8 21 L13 17" />
              </svg>
              {card.comments.length}
            </span>
          )}
          <span style={{ flex: 1 }} />
          {card.assignee && (
            <Avatar
              id={card.assignee.id}
              name={card.assignee.name}
              avatar={card.assignee.avatar}
              size={24}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Кружок «выполнено» слева от заголовка. Клик закрывает/открывает задачу;
// pointerDown гасим, чтобы не начать перетаскивание карточки. На статичном
// «призраке» (без onToggle) показываем только у выполненных.
function CheckDot({ done, onToggle }: { done: boolean; onToggle?: (done: boolean) => void }) {
  if (!onToggle && !done) return null;

  const dot = {
    width: 19,
    height: 19,
    flexShrink: 0,
    marginTop: 1,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    background: done ? 'var(--color-success)' : 'transparent',
    border: done ? 'none' : '1.6px solid var(--drag-placeholder)',
    color: '#fff',
  } as const;

  const check = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  if (!onToggle) {
    return <span style={dot}>{done && check}</span>;
  }

  return (
    <button
      type="button"
      className="card-check"
      aria-label={done ? 'Снять отметку выполнения' : 'Отметить выполненной'}
      title={done ? 'Снять отметку' : 'Отметить выполненной'}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(!done);
      }}
      style={{ ...dot, cursor: 'pointer' }}
    >
      {done && check}
    </button>
  );
}
