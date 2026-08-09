import { apiFetch } from '../../lib/api';
import type { Member } from '../board/types';

export interface AssignedCard {
  id: string;
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  done: boolean;
  listTitle: string;
  boardId: string;
  boardTitle: string;
  boardColor: string | null;
}

export function fetchPeople(): Promise<{ people: Member[] }> {
  return apiFetch('/assignments/people');
}

export function fetchAssignments(userId: string): Promise<{ cards: AssignedCard[] }> {
  return apiFetch(`/assignments?userId=${encodeURIComponent(userId)}`);
}
