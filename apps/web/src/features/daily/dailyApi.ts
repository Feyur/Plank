import { apiFetch } from '../../lib/api';
import type { Member } from '../board/types';

export interface DailyPerson {
  user: Member;
  done: string;
  doing: string;
  next: string;
  updatedAt: string | null;
}

export function fetchDaily(date: string): Promise<{ date: string; people: DailyPerson[] }> {
  return apiFetch(`/daily?date=${encodeURIComponent(date)}`);
}

export function saveDaily(
  date: string,
  entry: { done: string; doing: string; next: string },
): Promise<{ ok: true }> {
  return apiFetch('/daily', { method: 'PUT', body: JSON.stringify({ date, ...entry }) });
}
