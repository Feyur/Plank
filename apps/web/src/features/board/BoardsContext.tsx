import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '../../lib/api';
import { useRefresh } from '../realtime/useRefresh';
import * as api from './boardApi';
import type { BoardSummary, Folder } from './types';

interface BoardsState {
  boards: BoardSummary[];
  folders: Folder[];
  currentId: string | null;
  loading: boolean;
  error: string | null;
  select: (id: string) => void;
  create: (title: string) => Promise<void>;
  rename: (id: string, title: string) => void;
  setColor: (id: string, color: string | null) => void;
  setFolder: (id: string, folderId: string | null) => void;
  reorder: (id: string, position: number) => void;
  remove: (id: string) => void;
  createFolder: (name: string) => void;
  renameFolder: (id: string, name: string) => void;
  setFolderColor: (id: string, color: string | null) => void;
  removeFolder: (id: string) => void;
  reload: () => void;
}

const BoardsContext = createContext<BoardsState | null>(null);

// Список досок, папок и текущая доска живут в оболочке (левое меню),
// а детали доски грузит уже BoardScreen по currentId.
export function BoardsProvider({ children }: { children: ReactNode }) {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    setError(null);
    Promise.all([api.fetchBoards(), api.fetchFolders()])
      .then(([boardsData, foldersData]) => {
        setBoards(boardsData.boards);
        setFolders(foldersData.folders);
        setCurrentId((prev) =>
          prev && boardsData.boards.some((b) => b.id === prev)
            ? prev
            : (boardsData.boards[0]?.id ?? null),
        );
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Не удалось загрузить доски'))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);
  useRefresh(reload); // обновление по кнопке в шапке

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

  function setFolder(id: string, folderId: string | null) {
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, folderId } : b)));
    api.setBoardFolder(id, folderId).catch(reload);
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

  async function createFolder(name: string) {
    const { folder } = await api.createFolder(name);
    setFolders((prev) => [...prev, folder]);
  }

  function renameFolder(id: string, name: string) {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
    api.updateFolder(id, { name }).catch(reload);
  }

  function setFolderColor(id: string, color: string | null) {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, color } : f)));
    api.updateFolder(id, { color }).catch(reload);
  }

  function removeFolder(id: string) {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setBoards((prev) => prev.map((b) => (b.folderId === id ? { ...b, folderId: null } : b)));
    api.deleteFolder(id).catch(reload);
  }

  return (
    <BoardsContext.Provider
      value={{
        boards,
        folders,
        currentId,
        loading,
        error,
        select: setCurrentId,
        create,
        rename,
        setColor,
        setFolder,
        reorder,
        remove,
        createFolder,
        renameFolder,
        setFolderColor,
        removeFolder,
        reload,
      }}
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
