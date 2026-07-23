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
  const { boards, currentId, select, create, rename, setFolder, reorder, remove } = useBoards();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  // Инлайн-ввод папки (window.prompt не работает в Tauri-обёртке).
  const [folderingId, setFolderingId] = useState<string | null>(null);
  const [folderDraft, setFolderDraft] = useState('');
  // Свёрнутые папки помним локально — это личное состояние навигации.
  const [collapsed, setCollapsed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('plank-folders-collapsed') ?? '[]');
    } catch {
      return [];
    }
  });

  function toggleFolder(name: string) {
    setCollapsed((prev) => {
      const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
      localStorage.setItem('plank-folders-collapsed', JSON.stringify(next));
      return next;
    });
  }

  // Доски вне папок сверху, затем папки по алфавиту. Внутри — общий порядок position.
  const rootBoards = boards.filter((b) => !b.folder);
  const folders = [...new Set(boards.filter((b) => b.folder).map((b) => b.folder as string))].sort(
    (a, b) => a.localeCompare(b, 'ru'),
  );
  const ordered = [
    ...rootBoards,
    ...folders.flatMap((f) => boards.filter((b) => b.folder === f)),
  ];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = ordered.map((b) => b.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(ordered, oldIndex, newIndex);
    const idx = reordered.findIndex((b) => b.id === active.id);
    const prev = reordered[idx - 1];
    const next = reordered[idx + 1];
    const position =
      !prev && !next ? 1024 : !prev ? next.position / 2 : !next ? prev.position + 1024 : (prev.position + next.position) / 2;
    reorder(String(active.id), position);
  }

  function startFoldering(board: BoardSummary) {
    setMenuId(null);
    setFolderDraft(board.folder ?? '');
    setFolderingId(board.id);
  }

  function submitFolder(boardId: string) {
    setFolder(boardId, folderDraft.trim() || null);
    setFolderingId(null);
  }

  function renderRow(board: BoardSummary, indent: boolean) {
    if (folderingId === board.id) {
      return (
        <div key={board.id} style={{ marginLeft: indent ? 16 : 0, padding: '1px 0' }}>
          <input
            autoFocus
            list="plank-folder-names"
            value={folderDraft}
            onChange={(e) => setFolderDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitFolder(board.id);
              }
              if (e.key === 'Escape') setFolderingId(null);
            }}
            onBlur={() => setFolderingId(null)}
            placeholder="Папка, Enter — сохранить"
            style={{
              width: '100%',
              height: 34,
              border: '1px solid var(--color-accent)',
              borderRadius: 8,
              padding: '0 10px',
              font: 'var(--text-ui)',
              color: 'var(--color-text)',
              background: 'var(--color-surface)',
              outline: 'none',
              boxShadow: 'var(--focus-ring)',
            }}
          />
        </div>
      );
    }
    return (
      <BoardRow
        key={board.id}
        board={board}
        indent={indent}
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
        onMoveToFolder={() => startFoldering(board)}
        onDelete={() => {
          setMenuId(null);
          if (window.confirm(`Удалить доску «${board.title}»? Все её списки и карточки удалятся.`)) {
            remove(board.id);
          }
        }}
      />
    );
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

      <datalist id="plank-folder-names">
        {folders.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ordered.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {rootBoards.map((board) => renderRow(board, false))}

          {folders.map((folder) => {
            const isOpen = !collapsed.includes(folder);
            const inFolder = boards.filter((b) => b.folder === folder);
            return (
              <div key={folder}>
                <button
                  type="button"
                  onClick={() => toggleFolder(folder)}
                  className="menu-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    width: '100%',
                    height: 30,
                    padding: '0 8px',
                    border: 'none',
                    borderRadius: 8,
                    color: 'var(--color-text-secondary)',
                    font: 'var(--text-ui)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginTop: 2,
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    style={{
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform .15s',
                      flexShrink: 0,
                    }}
                  >
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" style={{ flexShrink: 0 }}>
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                  </svg>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {folder}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted-soft)' }}>
                    {inFolder.length}
                  </span>
                </button>
                {isOpen && inFolder.map((board) => renderRow(board, true))}
              </div>
            );
          })}
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
  indent: boolean;
  active: boolean;
  editing: boolean;
  menuOpen: boolean;
  onOpen: () => void;
  onToggleMenu: () => void;
  onStartRename: () => void;
  onRename: (title: string) => void;
  onCancelRename: () => void;
  onMoveToFolder: () => void;
  onDelete: () => void;
}

function BoardRow({
  board,
  indent,
  active,
  editing,
  menuOpen,
  onOpen,
  onToggleMenu,
  onStartRename,
  onRename,
  onCancelRename,
  onMoveToFolder,
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
        marginLeft: indent ? 16 : 0,
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
            <button type="button" className="menu-item" onClick={onMoveToFolder} style={menuItem('var(--color-text)')}>
              В папку…
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
