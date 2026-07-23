import { useState, type KeyboardEvent } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BOARD_COLORS, boardColorOf, columnBackground } from './boardColors';
import { CardItem } from './CardItem';
import type { Card, List } from './types';

interface ColumnProps {
  list: List;
  boardColor: string | null;
  onOpenCard: (card: Card) => void;
  onToggleDone: (cardId: string, done: boolean) => void;
  onAddCard: (listId: string, title: string) => void;
  onRename: (listId: string, title: string) => void;
  onSetColor: (listId: string, color: string | null) => void;
  onDelete: (listId: string) => void;
}

export function Column({
  list,
  boardColor,
  onOpenCard,
  onToggleDone,
  onAddCard,
  onRename,
  onSetColor,
  onDelete,
}: ColumnProps) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState(list.title);

  // Эффективный цвет колонки (свой или унаследованный от доски).
  const eff = boardColorOf(list.color ?? boardColor);

  // Колонка сама sortable (перетаскивание за шапку); её узел одновременно
  // droppable-зона для карточек — сброс в пустую колонку попадает сюда.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
    disabled: editing,
  });

  function submitRename() {
    const title = draft.trim();
    if (title && title !== list.title) onRename(list.id, title);
    else setDraft(list.title);
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      className="board-column"
      style={{
        flex: '0 0 286px',
        width: 286,
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: columnBackground(list.color, boardColor),
        border: '1px solid var(--color-column-border)',
        borderRadius: 'var(--radius-panel)',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      <div
        {...attributes}
        {...listeners}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 13px 9px',
          cursor: 'grab',
          touchAction: 'none',
          position: 'relative',
        }}
      >
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitRename();
              }
              if (e.key === 'Escape') {
                setDraft(list.title);
                setEditing(false);
              }
            }}
            style={{
              flex: 1,
              height: 28,
              border: '1px solid var(--color-accent)',
              borderRadius: 7,
              padding: '0 8px',
              font: 'var(--text-ui)',
              fontWeight: 700,
              color: 'var(--color-text)',
              outline: 'none',
              boxShadow: 'var(--focus-ring)',
              background: 'var(--color-surface)',
            }}
          />
        ) : eff.headerText ? (
          <>
            <span
              style={{
                flex: '0 1 auto',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                background: eff.dot,
                color: eff.headerText,
                font: 'var(--text-ui)',
                fontWeight: 700,
                padding: '4px 11px',
                borderRadius: 8,
              }}
            >
              {list.title}
            </span>
            <div style={{ flex: 1 }} />
          </>
        ) : (
          <h2 style={{ margin: 0, font: 'var(--text-ui)', fontWeight: 700, flex: 1 }}>{list.title}</h2>
        )}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-text-muted)',
            background: 'var(--color-surface)',
            minWidth: 22,
            textAlign: 'center',
            padding: '2px 6px',
            borderRadius: 6,
          }}
        >
          {list.cards.length}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Меню списка"
          style={{
            width: 24,
            height: 24,
            border: 'none',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--color-text-muted-soft)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ⋯
        </button>

        {menuOpen && (
          <>
            <div
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ position: 'fixed', inset: 0, zIndex: 90 }}
            />
            <div
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 38,
                right: 8,
                width: 170,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                boxShadow: 'var(--shadow-dropdown)',
                zIndex: 95,
                padding: 6,
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  color: 'var(--color-text-muted-soft)',
                  padding: '4px 8px 7px',
                }}
              >
                Цвет колонки
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 7,
                  padding: '0 8px 8px',
                }}
              >
                {BOARD_COLORS.map((c) => {
                  const active = (list.color ?? 'default') === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      title={c.key === 'default' ? 'Как у доски' : c.label}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetColor(list.id, c.key === 'default' ? null : c.key);
                        setMenuOpen(false);
                      }}
                      style={{
                        height: 26,
                        borderRadius: 7,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background:
                          c.key === 'default' ? 'var(--color-border-soft)' : c.dot,
                        border: active
                          ? '2px solid var(--color-text)'
                          : '1px solid var(--color-border)',
                      }}
                    >
                      {c.key === 'default' && (
                        <span
                          style={{
                            width: 11,
                            height: 11,
                            borderRadius: 4,
                            background: boardColorOf(boardColor).dot,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <div style={{ height: 1, background: 'var(--color-border-soft)', margin: '2px 6px 6px' }} />
              <button
                type="button"
                className="menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setDraft(list.title);
                  setEditing(true);
                }}
                style={menuItem('var(--color-text)')}
              >
                Переименовать
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete(list.id);
                }}
                style={menuItem('var(--color-danger)')}
              >
                Удалить
              </button>
            </div>
          </>
        )}
      </div>

      <div className="scrl" style={{ overflowY: 'auto', padding: '2px 9px 4px', flex: 1, minHeight: 90 }}>
        <SortableContext items={list.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {list.cards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                onOpen={onOpenCard}
                onToggleDone={onToggleDone}
              />
            ))}
          </div>
        </SortableContext>

        {list.cards.length === 0 && (
          <div
            style={{
              margin: '4px 0 2px',
              padding: '16px 10px',
              borderRadius: 'var(--radius-card)',
              border: '1px dashed var(--drag-placeholder)',
              textAlign: 'center',
              font: 'var(--text-secondary)',
              color: 'var(--color-text-muted-soft)',
              pointerEvents: 'none',
            }}
          >
            Пусто. Перетащите карточку сюда
          </div>
        )}

        <AddCard onAdd={(title) => onAddCard(list.id, title)} />
      </div>
    </div>
  );
}

// Фон не задаём инлайном — им управляет класс .menu-item (иначе :hover не сработал бы).
function menuItem(color: string) {
  return {
    display: 'block',
    width: '100%',
    height: 32,
    padding: '0 8px',
    border: 'none',
    borderRadius: 7,
    color,
    font: 'var(--text-ui)',
    cursor: 'pointer',
    textAlign: 'left' as const,
  };
}

function AddCard({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  function submit() {
    const trimmed = title.trim();
    if (trimmed) onAdd(trimmed);
    setTitle('');
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
    if (event.key === 'Escape') {
      setTitle('');
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          marginTop: 9,
          padding: '8px 10px',
          border: 'none',
          borderRadius: 'var(--radius-card)',
          background: 'transparent',
          color: 'var(--color-text-muted)',
          font: 'var(--text-ui)',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        + Добавить карточку
      </button>
    );
  }

  return (
    <div style={{ marginTop: 9 }}>
      <textarea
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={submit}
        placeholder="Название карточки…"
        rows={2}
        style={{
          width: '100%',
          resize: 'none',
          border: '1px solid var(--color-accent)',
          borderRadius: 'var(--radius-card)',
          padding: '9px 11px',
          font: 'var(--text-card-title)',
          color: 'var(--color-text)',
          outline: 'none',
          boxShadow: '0 0 0 3px rgba(91,91,214,.12)',
        }}
      />
    </div>
  );
}
