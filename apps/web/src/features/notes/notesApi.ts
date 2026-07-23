import { apiFetch } from '../../lib/api';

export interface Note {
  id: string;
  body: string;
  updatedAt: string;
}

export function fetchNotes(): Promise<{ notes: Note[] }> {
  return apiFetch('/notes');
}

export function createNote(body = ''): Promise<{ note: Note }> {
  return apiFetch('/notes', { method: 'POST', body: JSON.stringify({ body }) });
}

export function updateNote(id: string, body: string): Promise<{ note: Note }> {
  return apiFetch(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify({ body }) });
}

export function deleteNote(id: string): Promise<{ ok: true }> {
  return apiFetch(`/notes/${id}`, { method: 'DELETE' });
}
