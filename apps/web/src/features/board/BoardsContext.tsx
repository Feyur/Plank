import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '../../lib/api';
import { useRefresh } from '../realtime/useRefresh';
import * as api from './boardApi';
import type { BoardSummary } from './types';

interface BoardsState {
  boards: BoardSummary[];
  currentId: string | null;
  loading: boolean;
  error: string | null;
  select: (id: string) => void;
  create: (title: string) => Promise<void>;
  rename: (id: string, title: string) => void;
  setColor: (id: string, color: string | null) => void;
  reorder: (id: string, position: number) => void;
  remove: (id: string) => void;
  reload: () => void;
}

const BoardsContext = createContext<BoardsState | null>(null);

// Список досок и текущая доска живут в оболочке (левое меню), а детали доски
// грузит уже BoardScreen по currentId.
export function BoardsProvider({ children }: { children: ReactNode }) {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    setError(null);
    api
      .fetchBoards()
      .then((data) => {
        setBoards(data.boards);
        setCurrentId((prev) =>
          prev && data.boards.some((b) => b.id === prev) ? prev : (data.boards[0]?.id ?? null),
        );
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Не удалось загрузить доски'))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);
  useRefresh(reload); // обновление списка досок по кнопке в шапке

  async function create(title: string) {
    const { board } = await api.createBoard(title);
    setBoards((prev) => [...prev, board]);
    setCurrentId(board.id);
  }

  function rename(id: string, title: string) {
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, title } : b)));
    api.renameBoard(id, title).catch(reload);
  }

  function setColor(id: string, color: string | null) {
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, color } : b)));
    api.setBoardColor(id, color).catch(reload);
  }

  function reorder(id: string, position: number) {
    setBoards((prev) =>
      prev.map((b) => (b.id === id ? { ...b, position } : b)).sort((a, b) => a.position - b.position),
    );
    api.moveBoard(id, position).catch(reload);
  }

  function remove(id: string) {
    const remaining = boards.filter((b) => b.id !== id);
    setBoards(remaining);
    if (currentId === id) setCurrentId(remaining[0]?.id ?? null);
    api.deleteBoard(id).catch(reload);
  }

  return (
    <BoardsContext.Provider
      value={{ boards, currentId, loading, error, select: setCurrentId, create, rename, setColor, reorder, remove, reload }}
    >
      {children}
    </BoardsContext.Provider>
  );
}

export function useBoards(): BoardsState {
  const ctx = useContext(BoardsContext);
  if (!ctx) throw new Error('useBoards используется вне BoardsProvider');
  return ctx;
}
