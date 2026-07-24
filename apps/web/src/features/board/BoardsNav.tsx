import { useState, type KeyboardEvent } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BOARD_COLORS, boardColorOf } from './boardColors';
import { useBoards } from './BoardsContext';
import type { BoardSummary, Folder } from './types';

const overline = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--color-text-muted-soft)',
  padding: '2px 8px 8px',
};

export function BoardsNav({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  const boardsCtx = useBoards();
  const { boards, folders, currentId, select, create, rename, setFolder, reorder, remove } = boardsCtx;
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderDraft, setFolderDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  // Свёрнутые папки помним локально (по id) — личное состояние навигации.
  const [collapsed, setCollapsed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('plank-folders-collapsed') ?? '[]');
    } catch {
      return [];
    }
  });

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id];
      localStorage.setItem('plank-folders-collapsed', JSON.stringify(next));
      return next;
    });
  }

  const rootBoards = boards.filter((b) => !b.folderId);
  const ordered = [
    ...rootBoards,
    ...folders.flatMap((f) => boards.filter((b) => b.folderId === f.id)),
  ];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    // Брошено на папку или в корневую зону — меняем принадлежность папке.
    if (overId === 'root') {
      setFolder(activeId, null);
      return;
    }
    if (overId.startsWith('folder-')) {
      setFolder(activeId, overId.slice('folder-'.length));
      return;
    }

    // Брошено на другую доску — переставляем и наследуем её папку.
    const activeBoard = boards.find((b) => b.id === activeId);
    const target = boards.find((b) => b.id === overId);
    if (!activeBoard || !target) return;
    if (activeBoard.folderId !== target.folderId) setFolder(activeId, target.folderId);

    const ids = ordered.map((b) => b.id);
    const reordered = arrayMove(ordered, ids.indexOf(activeId), ids.indexOf(overId));
    const idx = reordered.findIndex((b) => b.id === activeId);
    const prev = reordered[idx - 1];
    const next = reordered[idx + 1];
    const position =
      !prev && !next ? 1024 : !prev ? next.position / 2 : !next ? prev.position + 1024 : (prev.position + next.position) / 2;
    reorder(activeId, position);
  }

  function boardRow(board: BoardSummary, indent: boolean) {
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
        onUnfile={board.folderId ? () => setFolder(board.id, null) : undefined}
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

  function submitCreateFolder() {
    const name = folderDraft.trim();
    if (name) boardsCtx.createFolder(name);
    setFolderDraft('');
    setCreatingFolder(false);
  }

  function onCreateKey(event: KeyboardEvent<HTMLInputElement>, submit: () => void, cancel: () => void) {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
    if (event.key === 'Escape') cancel();
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ ...overline, flex: 1 }}>Доски</div>
        <button
          type="button"
          onClick={() => setCreatingFolder(true)}
          title="Новая папка"
          aria-label="Новая папка"
          style={{
            width: 24,
            height: 24,
            marginRight: 4,
            marginTop: -4,
            border: 'none',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            <path d="M12 10.5v5M9.5 13h5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ordered.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <RootZone empty={rootBoards.length === 0}>
            {rootBoards.map((board) => boardRow(board, false))}
          </RootZone>

          {folders.map((folder) => (
            <FolderSection
              key={folder.id}
              folder={folder}
              count={boards.filter((b) => b.folderId === folder.id).length}
              collapsed={collapsed.includes(folder.id)}
              menuOpen={menuId === folder.id}
              onToggleCollapse={() => toggleCollapse(folder.id)}
              onToggleMenu={() => setMenuId((m) => (m === folder.id ? null : folder.id))}
              onRename={(name) => boardsCtx.renameFolder(folder.id, name)}
              onColor={(color) => boardsCtx.setFolderColor(folder.id, color)}
              onDelete={() => {
                setMenuId(null);
                if (window.confirm(`Удалить папку «${folder.name}»? Доски внутри останутся, но выйдут из папки.`)) {
                  boardsCtx.removeFolder(folder.id);
                }
              }}
            >
              {boards.filter((b) => b.folderId === folder.id).map((board) => boardRow(board, true))}
            </FolderSection>
          ))}
        </SortableContext>
      </DndContext>

      {creatingFolder && (
        <input
          autoFocus
          value={folderDraft}
          onChange={(e) => setFolderDraft(e.target.value)}
          onKeyDown={(e) => onCreateKey(e, submitCreateFolder, () => setCreatingFolder(false))}
          onBlur={submitCreateFolder}
          placeholder="Название папки…"
          style={inputStyle}
        />
      )}

      {creating ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => onCreateKey(e, submitCreate, () => setCreating(false))}
          onBlur={submitCreate}
          placeholder="Название доски…"
          style={inputStyle}
        />
      ) : (
        <button type="button" onClick={() => setCreating(true)} style={addButton}>
          <span style={{ fontSize: 16, lineHeight: 1, width: 8, textAlign: 'center' }}>+</span> Новая доска
        </button>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  height: 34,
  marginTop: 2,
  border: '1px solid var(--color-accent)',
  borderRadius: 8,
  padding: '0 10px',
  font: 'var(--text-ui)',
  color: 'var(--color-text)',
  background: 'var(--color-surface)',
  outline: 'none',
  boxShadow: 'var(--focus-ring)',
} as const;

const addButton = {
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
  textAlign: 'left' as const,
} as const;

// Корневая зона (доски вне папок) — тоже drop-таргет, чтобы можно было вынуть
// доску из папки перетаскиванием наверх.
function RootZone({ empty, children }: { empty: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'root' });
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: empty ? 30 : undefined,
        borderRadius: 8,
        outline: isOver ? '2px dashed var(--color-accent)' : 'none',
        outlineOffset: -2,
      }}
    >
      {children}
    </div>
  );
}

function FolderSection({
  folder,
  count,
  collapsed,
  menuOpen,
  onToggleCollapse,
  onToggleMenu,
  onRename,
  onColor,
  onDelete,
  children,
}: {
  folder: Folder;
  count: number;
  collapsed: boolean;
  menuOpen: boolean;
  onToggleCollapse: () => void;
  onToggleMenu: () => void;
  onRename: (name: string) => void;
  onColor: (color: string | null) => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `folder-${folder.id}` });
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(folder.name);

  return (
    <div
      ref={setNodeRef}
      style={{
        marginTop: 2,
        borderRadius: 8,
        background: isOver ? 'var(--color-border-soft)' : 'transparent',
        outline: isOver ? '2px dashed var(--color-accent)' : 'none',
        outlineOffset: -2,
      }}
    >
      {renaming ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim()) onRename(name.trim());
            setRenaming(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (name.trim()) onRename(name.trim());
              setRenaming(false);
            }
            if (e.key === 'Escape') {
              setName(folder.name);
              setRenaming(false);
            }
          }}
          style={inputStyle}
        />
      ) : (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="menu-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              flex: 1,
              minWidth: 0,
              height: 30,
              padding: '0 8px',
              border: 'none',
              borderRadius: 8,
              color: 'var(--color-text-secondary)',
              font: 'var(--text-ui)',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              style={{ transform: collapsed ? 'none' : 'rotate(90deg)', transition: 'transform .15s', flexShrink: 0 }}
            >
              <polyline points="9 6 15 12 9 18" />
            </svg>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                background: boardColorOf(folder.color).dot,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {folder.name}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted-soft)' }}>{count}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
            aria-label="Меню папки"
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

          {menuOpen && (
            <>
              <div onClick={onToggleMenu} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
              <div
                style={{
                  position: 'absolute',
                  top: 30,
                  right: 4,
                  width: 184,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  boxShadow: 'var(--shadow-dropdown)',
                  zIndex: 95,
                  padding: 8,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5, marginBottom: 8 }}>
                  {BOARD_COLORS.filter((c) => c.key !== 'white').map((c) => {
                    const activeColor = (folder.color ?? 'default') === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        title={c.label}
                        onClick={() => {
                          onColor(c.key === 'default' ? null : c.key);
                          onToggleMenu();
                        }}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          cursor: 'pointer',
                          background: c.key === 'default' ? 'var(--color-border-soft)' : c.dot,
                          border: activeColor ? '2px solid var(--color-text)' : '1px solid var(--color-border)',
                        }}
                      />
                    );
                  })}
                </div>
                <button type="button" className="menu-item" onClick={() => { onToggleMenu(); setName(folder.name); setRenaming(true); }} style={menuItem('var(--color-text)')}>
                  Переименовать
                </button>
                <button type="button" className="menu-item" onClick={onDelete} style={menuItem('var(--color-danger)')}>
                  Удалить папку
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {!collapsed && children}
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
  onUnfile?: () => void;
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
  onUnfile,
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
          style={inputStyle}
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
          style={{ width: 8, height: 8, borderRadius: 3, background: boardColorOf(board.color).dot, flexShrink: 0 }}
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
              width: 180,
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
            {onUnfile && (
              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  onToggleMenu();
                  onUnfile();
                }}
                style={menuItem('var(--color-text)')}
              >
                Убрать из папки
              </button>
            )}
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
