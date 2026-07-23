import type { Board, Card, List } from './types';

// Дробный шаг позиции — как на бэкенде: вставляем между соседями без
// перенумерации всех карточек.
export const POSITION_GAP = 1024;

export function positionBetween(cards: Card[], index: number): number {
  const prev = cards[index - 1];
  const next = cards[index + 1];
  if (!prev && !next) return POSITION_GAP;
  if (!prev) return next.position / 2;
  if (!next) return prev.position + POSITION_GAP;
  return (prev.position + next.position) / 2;
}

function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const copy = [...items];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

export interface MoveResult {
  board: Board;
  listId: string;
  position: number;
}

// Чистый расчёт перемещения карточки: куда она встала и с какой позицией.
// activeId — перетаскиваемая карточка; overId — карточка или колонка под курсором.
// Возвращает новую доску и данные для сохранения, либо null, если двигать нечего.
export function applyCardMove(board: Board, activeId: string, overId: string): MoveResult | null {
  if (activeId === overId) return null;

  const fromList = board.lists.find((l) => l.cards.some((c) => c.id === activeId));
  if (!fromList) return null;

  const overIsList = board.lists.some((l) => l.id === overId);
  const toListId = overIsList
    ? overId
    : board.lists.find((l) => l.cards.some((c) => c.id === overId))?.id;
  if (!toListId) return null;

  let lists: List[];
  if (fromList.id === toListId) {
    const oldIndex = fromList.cards.findIndex((c) => c.id === activeId);
    const newIndex = fromList.cards.findIndex((c) => c.id === overId);
    if (newIndex === -1) return null;
    const cards = arrayMove(fromList.cards, oldIndex, newIndex);
    lists = board.lists.map((l) => (l.id === toListId ? { ...l, cards } : l));
  } else {
    const card = fromList.cards.find((c) => c.id === activeId)!;
    const removed = board.lists.map((l) =>
      l.id === fromList.id ? { ...l, cards: l.cards.filter((c) => c.id !== activeId) } : l,
    );
    lists = removed.map((l) => {
      if (l.id !== toListId) return l;
      const overIdx = l.cards.findIndex((c) => c.id === overId);
      const insertAt = overIdx === -1 ? l.cards.length : overIdx;
      const cards = [...l.cards];
      cards.splice(insertAt, 0, { ...card, listId: toListId });
      return { ...l, cards };
    });
  }

  const target = lists.find((l) => l.id === toListId)!;
  const idx = target.cards.findIndex((c) => c.id === activeId);
  const position = positionBetween(target.cards, idx);
  const cards = [...target.cards];
  cards[idx] = { ...cards[idx], listId: toListId, position };
  lists = lists.map((l) => (l.id === toListId ? { ...l, cards } : l));

  return { board: { ...board, lists }, listId: toListId, position };
}
