import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import * as api from './boardApi';
import { ArchivePanel } from './ArchivePanel';
import type { CardPatch } from './boardApi';
import { boardColorOf, BOARD_COLORS } from './boardColors';
import { applyCardMove } from './boardMove';
import { useBoards } from './BoardsContext';
import { CardModal } from './CardModal';
import { CardView } from './CardView';
import { Column } from './Column';
import { colorOf } from './labelColors';
import { LabelsManager } from './LabelsManager';
import { useRealtime } from '../realtime/useRealtime';
import type { Board, Card, Label, Member } from './types';

export function BoardScreen() {
  const { currentId, setColor } = useBoards();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [openCard, setOpenCard] = useState<Card | null>(null);
  const [showLabels, setShowLabels] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState('');
  const [filterLabelId, setFilterLabelId] = useState<string | null>(null);

  const toast = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (!currentId) {
      setMembers([]);
      return;
    }
    api
      .fetchMembers(currentId)
      .then((data) => setMembers(data.users))
      .catch(() => setMembers([]));
  }, [currentId]);

  // Сохранение не прошло: сообщаем и тихо подтягиваем актуальное состояние.
  function syncFail() {
    toast('Не сохранилось — доска обновлена с сервера. Проверьте соединение.');
    if (currentId) refreshBoard(currentId);
  }

  function loadBoard(id: string) {
    setBoard(null);
    setError(null);
    api
      .fetchBoard(id)
      .then((data) => setBoard(data.board))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Не удалось загрузить доску'),
      );
  }

  // Тихое обновление (без «мигания» загрузки) — для realtime.
  function refreshBoard(id: string) {
    api
      .fetchBoard(id)
      .then((data) => {
        setBoard(data.board);
        // Открытая карточка не должна протухать: подтягиваем её из свежей
        // доски (чужие правки чек-листа/меток видны сразу); если карточку
        // удалили — закрываем модалку.
        setOpenCard((prev) => {
          if (!prev) return prev;
          return data.board.lists.flatMap((l) => l.cards).find((c) => c.id === prev.id) ?? null;
        });
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    if (currentId) loadBoard(currentId);
    else setBoard(null);
  }, [currentId]);

  useRealtime(() => {
    if (currentId) refreshBoard(currentId);
  });

  async function addList(title: string) {
    if (!board) return;
    try {
      const { list } = await api.createList(board.id, title);
      setBoard((prev) => (prev ? { ...prev, lists: [...prev.lists, list] } : prev));
    } catch {
      syncFail();
    }
  }

  function onDragStart(event: DragStartEvent) {
    const card = board?.lists.flatMap((l) => l.cards).find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);
    if (!over || !board) return;

    // Перетаскивали колонку — меняем порядок списков.
    if (board.lists.some((l) => l.id === active.id)) {
      moveListLocal(String(active.id), String(over.id));
      return;
    }

    const result = applyCardMove(board, String(active.id), String(over.id));
    if (!result) return;

    setBoard(result.board);
    api.moveCard(String(active.id), result.listId, result.position).catch(syncFail);
  }

  function moveListLocal(activeId: string, overId: string) {
    if (!board || activeId === overId) return;
    // over может быть и карточкой — тогда целимся в её колонку.
    const overListId = board.lists.some((l) => l.id === overId)
      ? overId
      : board.lists.find((l) => l.cards.some((c) => c.id === overId))?.id;
    if (!overListId || overListId === activeId) return;

    const oldIndex = board.lists.findIndex((l) => l.id === activeId);
    const newIndex = board.lists.findIndex((l) => l.id === overListId);
    const lists = arrayMove(board.lists, oldIndex, newIndex);
    const idx = lists.findIndex((l) => l.id === activeId);
    const prev = lists[idx - 1];
    const next = lists[idx + 1];
    const position =
      !prev && !next
        ? 1024
        : !prev
          ? next.position / 2
          : !next
            ? prev.position + 1024
            : (prev.position + next.position) / 2;

    lists[idx] = { ...lists[idx], position };
    setBoard({ ...board, lists });
    api.moveList(activeId, position).catch(syncFail);
  }

  function renameList(listId: string, title: string) {
    setBoard((prev) =>
      prev
        ? { ...prev, lists: prev.lists.map((l) => (l.id === listId ? { ...l, title } : l)) }
        : prev,
    );
    api.renameList(listId, title).catch(syncFail);
  }

  function setListColor(listId: string, color: string | null) {
    setBoard((prev) =>
      prev
        ? { ...prev, lists: prev.lists.map((l) => (l.id === listId ? { ...l, color } : l)) }
        : prev,
    );
    api.setListColor(listId, color).catch(syncFail);
  }

  function deleteList(listId: string) {
    const list = board?.lists.find((l) => l.id === listId);
    const suffix =
      list && list.cards.length > 0 ? ` Карточек внутри: ${list.cards.length} — они удалятся.` : '';
    if (!window.confirm(`Удалить список «${list?.title ?? ''}»?${suffix}`)) return;
    setBoard((prev) =>
      prev ? { ...prev, lists: prev.lists.filter((l) => l.id !== listId) } : prev,
    );
    api.deleteList(listId).catch(syncFail);
  }

  async function onAddCard(listId: string, title: string) {
    if (!board) return;
    try {
      const { card } = await api.createCard(listId, title);
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              lists: prev.lists.map((l) =>
                l.id === listId ? { ...l, cards: [...l.cards, card] } : l,
              ),
            }
          : prev,
      );
    } catch {
      syncFail();
    }
  }

  function patchCard(id: string, patch: CardPatch) {
    setBoard((prev) =>
      prev
        ? {
            ...prev,
            lists: prev.lists.map((l) => ({
              ...l,
              cards: l.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
            })),
          }
        : prev,
    );
    setOpenCard((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
    api.updateCard(id, patch).catch(syncFail);
  }

  function removeCard(id: string) {
    setBoard((prev) =>
      prev
        ? {
            ...prev,
            lists: prev.lists.map((l) => ({ ...l, cards: l.cards.filter((c) => c.id !== id) })),
          }
        : prev,
    );
    setOpenCard(null);
    api.deleteCard(id).catch(syncFail);
  }

  // Убрать карточку в архив: пропадает с доски (как удаление визуально),
  // но остаётся в архиве и её можно вернуть.
  function archiveCard(id: string) {
    setBoard((prev) =>
      prev
        ? {
            ...prev,
            lists: prev.lists.map((l) => ({ ...l, cards: l.cards.filter((c) => c.id !== id) })),
          }
        : prev,
    );
    setOpenCard(null);
    api.setCardArchived(id, true).catch(syncFail);
  }

  function toggleCardLabel(cardId: string, labelId: string, active: boolean) {
    const label = board?.labels.find((l) => l.id === labelId);
    if (!label) return;
    mapCard(cardId, (c) => ({
      ...c,
      labels: active ? [...c.labels, label] : c.labels.filter((l) => l.id !== labelId),
    }));
    api.toggleCardLabel(cardId, labelId, active).catch(syncFail);
  }

  function setCardAssignee(cardId: string, userId: string | null) {
    const assignee = userId ? (members.find((m) => m.id === userId) ?? null) : null;
    setBoard((prev) =>
      prev
        ? {
            ...prev,
            lists: prev.lists.map((l) => ({
              ...l,
              cards: l.cards.map((c) => (c.id === cardId ? { ...c, assignee } : c)),
            })),
          }
        : prev,
    );
    setOpenCard((prev) => (prev && prev.id === cardId ? { ...prev, assignee } : prev));
    api.setCardAssignee(cardId, userId).catch(syncFail);
  }

  function setCardDone(cardId: string, done: boolean) {
    mapCard(cardId, (c) => ({ ...c, done }));
    api.setCardDone(cardId, done).catch(syncFail);
  }

  // Применяет преобразование к карточке во всех местах стейта (доска + модалка).
  function mapCard(cardId: string, fn: (card: Card) => Card) {
    setBoard((prev) =>
      prev
        ? {
            ...prev,
            lists: prev.lists.map((l) => ({
              ...l,
              cards: l.cards.map((c) => (c.id === cardId ? fn(c) : c)),
            })),
          }
        : prev,
    );
    setOpenCard((prev) => (prev && prev.id === cardId ? fn(prev) : prev));
  }

  async function addChecklistItem(cardId: string, text: string) {
    try {
      const { item } = await api.addChecklistItem(cardId, text);
      mapCard(cardId, (c) => ({ ...c, checklist: [...c.checklist, item] }));
    } catch {
      syncFail();
    }
  }

  function toggleChecklistItem(cardId: string, itemId: string, done: boolean) {
    mapCard(cardId, (c) => ({
      ...c,
      checklist: c.checklist.map((it) => (it.id === itemId ? { ...it, done } : it)),
    }));
    api.updateChecklistItem(itemId, { done }).catch(syncFail);
  }

  function deleteChecklistItem(cardId: string, itemId: string) {
    mapCard(cardId, (c) => ({ ...c, checklist: c.checklist.filter((it) => it.id !== itemId) }));
    api.deleteChecklistItem(itemId).catch(syncFail);
  }

  async function addComment(cardId: string, text: string) {
    try {
      const { comment } = await api.addComment(cardId, text);
      mapCard(cardId, (c) => ({ ...c, comments: [...c.comments, comment] }));
    } catch {
      syncFail();
    }
  }

  function deleteComment(cardId: string, commentId: string) {
    mapCard(cardId, (c) => ({ ...c, comments: c.comments.filter((x) => x.id !== commentId) }));
    api.deleteComment(commentId).catch(syncFail);
  }

  // Перенос пункта чек-листа: позиция = середина между соседями (как у карточек).
  function moveChecklistItem(cardId: string, itemId: string, overItemId: string) {
    const card = board?.lists.flatMap((l) => l.cards).find((c) => c.id === cardId);
    if (!card) return;
    const oldIndex = card.checklist.findIndex((i) => i.id === itemId);
    const newIndex = card.checklist.findIndex((i) => i.id === overItemId);
    if (oldIndex === -1 || newIndex === -1) return;

    const items = arrayMove(card.checklist, oldIndex, newIndex);
    const idx = items.findIndex((i) => i.id === itemId);
    const prev = items[idx - 1];
    const next = items[idx + 1];
    const position =
      !prev && !next
        ? 1024
        : !prev
          ? next.position / 2
          : !next
            ? prev.position + 1024
            : (prev.position + next.position) / 2;
    items[idx] = { ...items[idx], position };

    mapCard(cardId, (c) => ({ ...c, checklist: items }));
    api.moveChecklistItem(itemId, position).catch(syncFail);
  }

  async function createLabel(name: string, color: string) {
    if (!board) return;
    try {
      const { label } = await api.createLabel(board.id, name, color);
      setBoard((prev) => (prev ? { ...prev, labels: [...prev.labels, label] } : prev));
    } catch {
      syncFail();
    }
  }

  function deleteLabel(id: string) {
    const strip = (c: Card): Card => ({ ...c, labels: c.labels.filter((l) => l.id !== id) });
    setBoard((prev) =>
      prev
        ? {
            ...prev,
            labels: prev.labels.filter((l) => l.id !== id),
            lists: prev.lists.map((l) => ({ ...l, cards: l.cards.map(strip) })),
          }
        : prev,
    );
    setOpenCard((prev) => (prev ? strip(prev) : prev));
    api.deleteLabel(id).catch(syncFail);
  }

  if (error) {
    return (
      <Centered>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 12px', color: 'var(--color-text-secondary)' }}>{error}</p>
          <button
            type="button"
            onClick={() => currentId && loadBoard(currentId)}
            style={retryStyle}
          >
            Повторить
          </button>
        </div>
      </Centered>
    );
  }
  if (!currentId) {
    return (
      <Centered>Нет доступных досок. Создайте новую или обратитесь к администратору.</Centered>
    );
  }
  if (!board) return <Centered>Загрузка доски…</Centered>;

  const boardColor = boardColorOf(board.color);
  const pickColor = (key: string) => {
    const color = key === 'default' ? null : key;
    setBoard((prev) => (prev ? { ...prev, color } : prev));
    setColor(board.id, color);
  };

  // Поиск/фильтр — по видимым карточкам (перетаскивание работает на полной доске).
  const q = query.trim().toLowerCase();
  const displayLists = board.lists.map((list) => ({
    ...list,
    cards: list.cards.filter((c) => {
      if (filterLabelId && !c.labels.some((l) => l.id === filterLabelId)) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.labels.some((l) => l.name.toLowerCase().includes(q)) ||
        !!c.assignee?.name.toLowerCase().includes(q)
      );
    }),
  }));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="board-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <BoardColorMenu current={board.color} onPick={pickColor} />
        <h1 style={{ margin: 0, font: 'var(--text-board-title)', letterSpacing: '-0.015em' }}>
          {board.title}
        </h1>
        <div style={{ flex: 1 }} />

        <div className="board-search" style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              display: 'flex',
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по карточкам…"
            style={{
              width: 220,
              height: 34,
              border: '1px solid var(--color-border)',
              borderRadius: 9,
              background: 'var(--color-surface)',
              padding: '0 12px 0 32px',
              font: 'var(--text-ui)',
              fontWeight: 500,
              color: 'var(--color-text)',
              outline: 'none',
            }}
          />
        </div>

        <FilterMenu labels={board.labels} activeId={filterLabelId} onSelect={setFilterLabelId} />

        <button type="button" onClick={() => setShowLabels(true)} style={toolbarBtn}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 2.8 12V4a1.2 1.2 0 0 1 1.2-1.2h8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8z" />
            <circle cx="7.5" cy="7.5" r="1.3" />
          </svg>
          Метки
        </button>

        <button
          type="button"
          onClick={() => window.location.assign(api.exportBoardUrl(board.id))}
          title="Скачать доску в Excel"
          style={toolbarBtn}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Экспорт
        </button>

        <button type="button" onClick={() => setShowArchive(true)} title="Архив доски" style={toolbarBtn}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="4" rx="1" />
            <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
          Архив
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div
          className="scrl board-scroll"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--gap-columns)',
            overflowX: 'auto',
            overflowY: 'hidden',
            padding: boardColor.bg === 'transparent' ? '0 0 8px' : '12px 12px 14px',
            margin: boardColor.bg === 'transparent' ? 0 : '0 -12px',
            borderRadius: 16,
            background: boardColor.bg,
            transition: 'background .2s',
          }}
        >
          <SortableContext
            items={board.lists.map((l) => l.id)}
            strategy={horizontalListSortingStrategy}
          >
            {displayLists.map((list) => (
              <Column
                key={list.id}
                list={list}
                boardColor={board.color}
                onOpenCard={setOpenCard}
                onToggleDone={setCardDone}
                onAddCard={onAddCard}
                onRename={renameList}
                onSetColor={setListColor}
                onDelete={deleteList}
              />
            ))}
          </SortableContext>
          <AddList onAdd={addList} />
        </div>

        <DragOverlay>
          {activeCard ? (
            <CardView
              card={activeCard}
              style={{
                transform: 'rotate(2.5deg)',
                boxShadow: 'var(--shadow-drag)',
                cursor: 'grabbing',
              }}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {openCard && (
        <CardModal
          card={openCard}
          labels={board.labels}
          members={members}
          onClose={() => setOpenCard(null)}
          onPatch={(patch) => patchCard(openCard.id, patch)}
          onToggleLabel={(labelId, active) => toggleCardLabel(openCard.id, labelId, active)}
          onSetAssignee={(userId) => setCardAssignee(openCard.id, userId)}
          onManageLabels={() => setShowLabels(true)}
          onAddChecklistItem={(text) => addChecklistItem(openCard.id, text)}
          onToggleChecklistItem={(itemId, done) => toggleChecklistItem(openCard.id, itemId, done)}
          onDeleteChecklistItem={(itemId) => deleteChecklistItem(openCard.id, itemId)}
          onMoveChecklistItem={(itemId, overId) => moveChecklistItem(openCard.id, itemId, overId)}
          onAddComment={(text) => addComment(openCard.id, text)}
          onDeleteComment={(commentId) => deleteComment(openCard.id, commentId)}
          onToggleDone={(done) => setCardDone(openCard.id, done)}
          onArchive={() => archiveCard(openCard.id)}
          onDelete={() => removeCard(openCard.id)}
        />
      )}

      {showLabels && (
        <LabelsManager
          labels={board.labels}
          onCreate={createLabel}
          onDelete={deleteLabel}
          onClose={() => setShowLabels(false)}
        />
      )}

      {showArchive && <ArchivePanel boardId={board.id} onClose={() => setShowArchive(false)} />}
    </div>
  );
}

// Квадратик у названия доски = выбор цвета доски (влияет на фон и на этот квадрат).
function BoardColorMenu({
  current,
  onPick,
}: {
  current: string | null;
  onPick: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const color = boardColorOf(current);

  return (
    <div style={{ position: 'relative', display: 'flex' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Цвет доски"
        title="Цвет доски"
        style={{
          width: 15,
          height: 15,
          borderRadius: 5,
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          background: color.dot,
          boxShadow: open ? 'var(--focus-ring)' : 'none',
        }}
      />
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              left: 0,
              zIndex: 95,
              width: 178,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-dropdown)',
              padding: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                color: 'var(--color-text-muted-soft)',
                marginBottom: 10,
              }}
            >
              Цвет доски
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 9 }}>
              {BOARD_COLORS.map((c) => {
                const active = (current ?? 'default') === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    title={c.label}
                    onClick={() => {
                      onPick(c.key);
                      setOpen(false);
                    }}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: c.key === 'default' ? 'var(--color-border-soft)' : c.dot,
                      border: active ? '2px solid var(--color-text)' : '1px solid var(--color-border)',
                    }}
                  >
                    {c.key === 'default' && (
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 4,
                          background: 'var(--color-accent)',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FilterMenu({
  labels,
  activeId,
  onSelect,
}: {
  labels: Label[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = labels.find((l) => l.id === activeId) ?? null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          height: 34,
          padding: '0 13px',
          border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: 9,
          background: active ? 'rgba(91,91,214,.08)' : 'var(--color-surface)',
          font: 'var(--text-ui)',
          color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          cursor: 'pointer',
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="6" y1="12" x2="18" y2="12" />
          <line x1="10" y1="18" x2="14" y2="18" />
        </svg>
        {active ? active.name : 'Фильтр'}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div
            style={{
              position: 'absolute',
              top: 40,
              right: 0,
              width: 220,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-dropdown)',
              zIndex: 95,
              padding: 8,
            }}
          >
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              style={filterItemStyle(!activeId)}
            >
              Все карточки
            </button>
            {labels.map((label) => {
              const c = colorOf(label.color);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => {
                    onSelect(label.id);
                    setOpen(false);
                  }}
                  style={filterItemStyle(activeId === label.id)}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: c.fg,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {label.name}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function filterItemStyle(active: boolean) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    height: 32,
    padding: '0 8px',
    border: 'none',
    borderRadius: 8,
    background: active ? 'var(--color-border-soft)' : 'transparent',
    color: 'var(--color-text)',
    font: 'var(--text-ui)',
    cursor: 'pointer',
    textAlign: 'left' as const,
  };
}

function AddList({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  function submit() {
    const trimmed = title.trim();
    if (trimmed) onAdd(trimmed);
    setTitle('');
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
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
          flex: '0 0 286px',
          width: 286,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '13px 15px',
          border: 'none',
          borderRadius: 'var(--radius-panel)',
          background: 'var(--add-list-bg)',
          font: 'var(--text-ui)',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Добавить ещё список
      </button>
    );
  }

  return (
    <div
      style={{
        flex: '0 0 286px',
        width: 286,
        background: 'var(--color-column-bg)',
        border: '1px solid var(--color-column-border)',
        borderRadius: 'var(--radius-panel)',
        padding: 11,
      }}
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={submit}
        placeholder="Название списка…"
        style={{
          width: '100%',
          height: 38,
          border: '1px solid var(--color-accent)',
          borderRadius: 9,
          padding: '0 12px',
          font: 'var(--text-ui)',
          fontWeight: 700,
          color: 'var(--color-text)',
          outline: 'none',
          boxShadow: 'var(--focus-ring)',
        }}
      />
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-muted)',
        font: 'var(--text-ui)',
      }}
    >
      {children}
    </div>
  );
}

const toolbarBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  height: 34,
  padding: '0 13px',
  border: '1px solid var(--color-border)',
  borderRadius: 9,
  background: 'var(--color-surface)',
  font: 'var(--text-ui)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
} as const;

const retryStyle = {
  height: 36,
  padding: '0 16px',
  border: 'none',
  borderRadius: 9,
  background: 'var(--color-accent)',
  color: '#fff',
  font: 'var(--text-ui)',
  cursor: 'pointer',
} as const;
