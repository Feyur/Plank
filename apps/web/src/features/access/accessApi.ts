import { apiFetch } from '../../lib/api';
import type { User } from '../auth/AuthContext';

export interface ManagedUser extends User {
  boardIds: string[];
}

export function createUser(
  email: string,
  password: string,
  handle: string,
  boardIds: string[],
): Promise<{ user: User }> {
  return apiFetch('/access/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, handle, boardIds }),
  });
}

export function fetchManagedUsers(): Promise<{ users: ManagedUser[] }> {
  return apiFetch('/access/users');
}

export function updateUserBoards(userId: string, boardIds: string[]): Promise<{ ok: true }> {
  return apiFetch(`/access/users/${userId}/boards`, {
    method: 'PATCH',
    body: JSON.stringify({ boardIds }),
  });
}
