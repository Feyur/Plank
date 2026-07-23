import { describe, it, expect } from 'vitest';
import { applyCardMove } from './boardMove';
import type { Board } from './types';

function card(id: string, listId: string, position: number) {
  return {
    id,
    listId,
    title: id,
    description: '',
    dueDate: null,
    dueTime: null,
    done: false,
    labels: [],
    assignee: null,
    checklist: [],
    comments: [],
    position,
  };
}

// Доска: список A [a1,a2,a3], список B [b1]
function makeBoard(): Board {
  return {
    id: 'board',
    title: 'Доска',
    color: null,
    labels: [],
    lists: [
      {
        id: 'A',
        title: 'A',
        color: null,
        position: 1024,
        cards: [card('a1', 'A', 1024), card('a2', 'A', 2048), card('a3', 'A', 3072)],
      },
      { id: 'B', title: 'B', color: null, position: 2048, cards: [card('b1', 'B', 1024)] },
    ],
  };
}

const ids = (board: Board, listId: string) =>
  board.lists.find((l) => l.id === listId)!.cards.map((c) => c.id);

describe('applyCardMove — тот же список', () => {
  it('переносит первую карточку в конец', () => {
    const res = applyCardMove(makeBoard(), 'a1', 'a3');
    expect(res).not.toBeNull();
    expect(ids(res!.board, 'A')).toEqual(['a2', 'a3', 'a1']);
    expect(res!.listId).toBe('A');
    expect(res!.position).toBeGreaterThan(3072); // встала после a3
  });

  it('переносит последнюю карточку в начало', () => {
    const res = applyCardMove(makeBoard(), 'a3', 'a1');
    expect(ids(res!.board, 'A')).toEqual(['a3', 'a1', 'a2']);
    expect(res!.position).toBeLessThan(1024); // встала перед a1
  });
});

describe('applyCardMove — другой список', () => {
  it('переносит карточку на место карточки в другом списке', () => {
    const res = applyCardMove(makeBoard(), 'a1', 'b1');
    expect(ids(res!.board, 'A')).toEqual(['a2', 'a3']);
    expect(ids(res!.board, 'B')).toEqual(['a1', 'b1']);
    expect(res!.listId).toBe('B');
    const moved = res!.board.lists.find((l) => l.id === 'B')!.cards.find((c) => c.id === 'a1')!;
    expect(moved.listId).toBe('B');
  });

  it('переносит карточку в пустую колонку (over = id колонки)', () => {
    const board = makeBoard();
    board.lists[1].cards = [];
    const res = applyCardMove(board, 'a2', 'B');
    expect(ids(res!.board, 'A')).toEqual(['a1', 'a3']);
    expect(ids(res!.board, 'B')).toEqual(['a2']);
    expect(res!.position).toBe(1024);
  });
});

describe('applyCardMove — нет изменения', () => {
  it('возвращает null при сбросе карточки на саму себя', () => {
    expect(applyCardMove(makeBoard(), 'a2', 'a2')).toBeNull();
  });

  it('возвращает null для неизвестной карточки', () => {
    expect(applyCardMove(makeBoard(), 'нет', 'a1')).toBeNull();
  });
});
