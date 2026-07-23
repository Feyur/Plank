import { useState, type KeyboardEvent } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { boardColorOf } from './boardColors';
import { useBoards } from './BoardsContext';
import type { BoardSummary } from './types';

const overline = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--color-text-muted-soft)',
  padding: '2px 8px 8px',
};

export function BoardsNav({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  const { boards, currentId, select, create, rename, reorder, remove } = useBoards();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = boards.map((b) => b.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(boards, oldIndex, newIndex);
    const idx = reordered.findIndex((b) => b.id === active.id);
    const prev = reordered[idx - 1];
    const next = reordered[idx + 1];
    const position =
      !prev && !next ? 1024 : !prev ? next.position / 2 : !next ? prev.position + 1024 : (prev.position + next.position) / 2;
    reorder(String(active.id), position);
  }

  function submitCreate() {
    const title = draft.trim();
    if (title) create(title).then(onOpen).catch(() => undefined);
    setDraft('');
    setCreating(false);
  }

  function onCreateKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitCreate();
    }
    if (event.key === 'Escape') {
      setDraft('');
      setCreating(false);
    }
  }

  return (
    <div>
      <div style={overline}>Доски</div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={boards.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {boards.map((board) => (
            <BoardRow
              key={board.id}
              board={board}
              active={open && board.id === currentId}
              editing={editingId === board.id}
              menuOpen={menuId === board.id}
              onOpen={() => {
                select(board.id);
                onOpen();
              }}
              onToggleMenu={() => setMenuId((m) => (m === board.id ? null : board.id))}
              onStartRename={() => {
                setMenuId(null);
                setEditingId(board.id);
              }}
              onRename={(title) => {
                if (title.trim()) rename(board.id, title.trim());
                setEditingId(null);
              }}
              onCancelRename={() => setEditingId(null)}
              onDelete={() => {
                setMenuId(null);
                if (window.confirm(`Удалить доску «${board.title}»? Все её списки и карточки удалятся.`)) {
                  remove(board.id);
                }
              }}
            />
          ))}
        </SortableContext>
      </DndContext>

      {creating ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onCreateKey}
          onBlur={submitCreate}
          placeholder="Название доски…"
          style={{
            width: '100%',
            height: 34,
            marginTop: 2,
            border: '1px solid var(--color-accent)',
            borderRadius: 8,
            padding: '0 10px',
            font: 'var(--text-ui)',
            color: 'var(--color-text)',
            outline: 'none',
            boxShadow: 'var(--focus-ring)',
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            height: 34,
            padding: '0 8px',
            border: 'none',
            borderRadius: 8,
            background: 'transparent',
            color: 'var(--color-text-muted)',
            font: 'var(--text-ui)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1, width: 8, textAlign: 'center' }}>+</span> Новая доска
        </button>
      )}
    </div>
  );
}

interface BoardRowProps {
  board: BoardSummary;
  active: boolean;
  editing: boolean;
  menuOpen: boolean;
  onOpen: () => void;
  onToggleMenu: () => void;
  onStartRename: () => void;
  onRename: (title: string) => void;
  onCancelRename: () => void;
  onDelete: () => void;
}

function BoardRow({
  board,
  active,
  editing,
  menuOpen,
  onOpen,
  onToggleMenu,
  onStartRename,
  onRename,
  onCancelRename,
  onDelete,
}: BoardRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: board.id,
    disabled: editing,
  });
  const [value, setValue] = useState(board.title);

  if (editing) {
    return (
      <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, padding: '1px 0' }}>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => onRename(value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onRename(value);
            }
            if (e.key === 'Escape') onCancelRename();
          }}
          style={{
            width: '100%',
            height: 34,
            border: '1px solid var(--color-accent)',
            borderRadius: 8,
            padding: '0 10px',
            font: 'var(--text-ui)',
            color: 'var(--color-text)',
            outline: 'none',
            boxShadow: 'var(--focus-ring)',
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'relative',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div
        {...attributes}
        {...listeners}
        onClick={onOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          height: 34,
          padding: '0 8px',
          borderRadius: 8,
          background: active ? 'var(--color-border-soft)' : 'transparent',
          color: active ? 'var(--color-text)' : 'var(--color-text-secondary)',
          font: 'var(--text-ui)',
          cursor: 'pointer',
          touchAction: 'none',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 3,
            background: boardColorOf(board.color).dot,
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {board.title}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Меню доски"
          style={{
            width: 24,
            height: 24,
            flexShrink: 0,
            border: 'none',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: 15,
            lineHeight: 1,
          }}
        >
          ⋯
        </button>
      </div>

      {menuOpen && (
        <>
          <div onClick={onToggleMenu} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div
            style={{
              position: 'absolute',
              top: 32,
              right: 4,
              width: 170,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              boxShadow: 'var(--shadow-dropdown)',
              zIndex: 95,
              padding: 6,
            }}
          >
            <button type="button" className="menu-item" onClick={onStartRename} style={menuItem('var(--color-text)')}>
              Переименовать
            </button>
            <button type="button" className="menu-item" onClick={onDelete} style={menuItem('var(--color-danger)')}>
              Удалить
            </button>
          </div>
        </>
      )}
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
