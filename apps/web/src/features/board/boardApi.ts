import { apiFetch, baseUrl } from '../../lib/api';
import type {
  ArchivedCard,
  Board,
  BoardSummary,
  Card,
  ChatMessage,
  ChecklistItem,
  Comment,
  Folder,
  Label,
  List,
  Member,
} from './types';

export function fetchBoards(): Promise<{ boards: BoardSummary[] }> {
  return apiFetch('/boards');
}

export function fetchMembers(boardId: string): Promise<{ users: Member[] }> {
  return apiFetch(`/users?boardId=${encodeURIComponent(boardId)}`);
}

export function setCardAssignee(id: string, userId: string | null): Promise<{ card: Card }> {
  return apiFetch(`/cards/${id}/assignee`, { method: 'PATCH', body: JSON.stringify({ userId }) });
}

export function setCardDone(id: string, done: boolean): Promise<{ card: Card }> {
  return apiFetch(`/cards/${id}/done`, { method: 'PATCH', body: JSON.stringify({ done }) });
}

export function setCardArchived(id: string, archived: boolean): Promise<{ ok: true }> {
  return apiFetch(`/cards/${id}/archive`, {
    method: 'PATCH',
    body: JSON.stringify({ archived }),
  });
}

export function fetchArchive(boardId: string): Promise<{ cards: ArchivedCard[] }> {
  return apiFetch(`/boards/${boardId}/archive`);
}

export function fetchBoard(id: string): Promise<{ board: Board }> {
  return apiFetch(`/boards/${id}`);
}

export function createBoard(title: string): Promise<{ board: BoardSummary }> {
  return apiFetch('/boards', { method: 'POST', body: JSON.stringify({ title }) });
}

export function renameBoard(id: string, title: string): Promise<{ board: BoardSummary }> {
  return apiFetch(`/boards/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) });
}

export function setBoardColor(
  id: string,
  color: string | null,
): Promise<{ board: BoardSummary }> {
  return apiFetch(`/boards/${id}/color`, { method: 'PATCH', body: JSON.stringify({ color }) });
}

export function setBoardFolder(
  id: string,
  folderId: string | null,
): Promise<{ board: BoardSummary }> {
  return apiFetch(`/boards/${id}/folder`, { method: 'PATCH', body: JSON.stringify({ folderId }) });
}

export function fetchFolders(): Promise<{ folders: Folder[] }> {
  return apiFetch('/folders');
}

export function createFolder(name: string): Promise<{ folder: Folder }> {
  return apiFetch('/folders', { method: 'POST', body: JSON.stringify({ name }) });
}

export function updateFolder(
  id: string,
  patch: { name?: string; color?: string | null },
): Promise<{ folder: Folder }> {
  return apiFetch(`/folders/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function deleteFolder(id: string): Promise<{ ok: true }> {
  return apiFetch(`/folders/${id}`, { method: 'DELETE' });
}

export function duplicateCard(id: string): Promise<{ card: Card }> {
  return apiFetch(`/cards/${id}/duplicate`, { method: 'POST' });
}

export function fetchChat(boardId: string, limit?: number): Promise<{ messages: ChatMessage[] }> {
  const suffix = limit ? `?limit=${limit}` : '';
  return apiFetch(`/boards/${boardId}/chat${suffix}`);
}

export function sendChatMessage(boardId: string, text: string): Promise<{ message: ChatMessage }> {
  return apiFetch(`/boards/${boardId}/chat`, { method: 'POST', body: JSON.stringify({ text }) });
}

export function deleteChatMessage(id: string): Promise<{ ok: true }> {
  return apiFetch(`/chat/${id}`, { method: 'DELETE' });
}

export function moveBoard(id: string, position: number): Promise<{ ok: true }> {
  return apiFetch(`/boards/${id}/position`, {
    method: 'PATCH',
    body: JSON.stringify({ position }),
  });
}

export function deleteBoard(id: string): Promise<{ ok: true }> {
  return apiFetch(`/boards/${id}`, { method: 'DELETE' });
}

export function createCard(listId: string, title: string): Promise<{ card: Card }> {
  return apiFetch('/cards', { method: 'POST', body: JSON.stringify({ listId, title }) });
}

export function createList(boardId: string, title: string): Promise<{ list: List }> {
  return apiFetch('/lists', { method: 'POST', body: JSON.stringify({ boardId, title }) });
}

export interface CardPatch {
  title?: string;
  description?: string;
  dueDate?: string | null;
  dueTime?: string | null;
}

export function renameList(id: string, title: string): Promise<{ ok: true }> {
  return apiFetch(`/lists/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) });
}

export function setListColor(id: string, color: string | null): Promise<{ ok: true }> {
  return apiFetch(`/lists/${id}/color`, { method: 'PATCH', body: JSON.stringify({ color }) });
}

export function moveList(id: string, position: number): Promise<{ ok: true }> {
  return apiFetch(`/lists/${id}/position`, { method: 'PATCH', body: JSON.stringify({ position }) });
}

export function deleteList(id: string): Promise<{ ok: true }> {
  return apiFetch(`/lists/${id}`, { method: 'DELETE' });
}

export function updateCard(id: string, patch: CardPatch): Promise<{ card: Card }> {
  return apiFetch(`/cards/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function moveCard(id: string, listId: string, position: number): Promise<{ card: Card }> {
  return apiFetch(`/cards/${id}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ listId, position }),
  });
}

export function deleteCard(id: string): Promise<{ ok: true }> {
  return apiFetch(`/cards/${id}`, { method: 'DELETE' });
}

export function toggleCardLabel(
  id: string,
  labelId: string,
  active: boolean,
): Promise<{ card: Card }> {
  return apiFetch(`/cards/${id}/labels`, {
    method: 'PATCH',
    body: JSON.stringify({ labelId, active }),
  });
}

export function moveChecklistItem(id: string, position: number): Promise<{ item: ChecklistItem }> {
  return apiFetch(`/checklist/${id}/position`, {
    method: 'PATCH',
    body: JSON.stringify({ position }),
  });
}

export function addComment(cardId: string, text: string): Promise<{ comment: Comment }> {
  return apiFetch(`/cards/${cardId}/comments`, { method: 'POST', body: JSON.stringify({ text }) });
}

export function deleteComment(id: string): Promise<{ ok: true }> {
  return apiFetch(`/comments/${id}`, { method: 'DELETE' });
}

// URL для скачивания (обычная навигация браузера — cookie уходит сам).
export function exportBoardUrl(id: string): string {
  return `${baseUrl}/boards/${id}/export`;
}

export function createLabel(
  boardId: string,
  name: string,
  color: string,
): Promise<{ label: Label }> {
  return apiFetch(`/boards/${boardId}/labels`, {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });
}

export function updateLabel(id: string, name: string, color: string): Promise<{ label: Label }> {
  return apiFetch(`/labels/${id}`, { method: 'PATCH', body: JSON.stringify({ name, color }) });
}

export function deleteLabel(id: string): Promise<{ ok: true }> {
  return apiFetch(`/labels/${id}`, { method: 'DELETE' });
}

export function addChecklistItem(cardId: string, text: string): Promise<{ item: ChecklistItem }> {
  return apiFetch(`/cards/${cardId}/checklist`, { method: 'POST', body: JSON.stringify({ text }) });
}

export function updateChecklistItem(
  id: string,
  patch: { text?: string; done?: boolean },
): Promise<{ item: ChecklistItem }> {
  return apiFetch(`/checklist/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function deleteChecklistItem(id: string): Promise<{ ok: true }> {
  return apiFetch(`/checklist/${id}`, { method: 'DELETE' });
}
