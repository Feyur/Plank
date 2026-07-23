export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Member {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  position: number;
}

export interface Comment {
  id: string;
  author: Member;
  text: string;
  createdAt: string;
}

export interface Card {
  id: string;
  listId: string;
  title: string;
  description: string;
  dueDate: string | null;
  dueTime: string | null;
  done: boolean;
  labels: Label[];
  assignee: Member | null;
  checklist: ChecklistItem[];
  comments: Comment[];
  position: number;
}

export interface List {
  id: string;
  title: string;
  color: string | null;
  position: number;
  cards: Card[];
}

export interface Board {
  id: string;
  title: string;
  color: string | null;
  labels: Label[];
  lists: List[];
}

export interface BoardSummary {
  id: string;
  title: string;
  color: string | null;
  position: number;
}

export interface ArchivedCard {
  id: string;
  title: string;
  listTitle: string;
  archivedAt: string;
}
