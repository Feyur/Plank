import {
  boardRepo,
  type ArchivedCardRow,
  type CardFields,
  type CardLabelRow,
  type CardRow,
  type ChecklistItemRow,
  type CommentRow,
  type LabelRow,
  type ListRow,
  type MemberRow,
} from './board.repo';
import { config } from '../../config';
import { boardAccessRepo } from '../access/access.repo';
import { notificationsRepo } from '../notifications/notifications.repo';
import { mentionedUserIds } from '../notifications/notifications.service';

// Дробный шаг позиции: новый элемент встаёт в конец с запасом, чтобы между
// соседями всегда можно было вставить середину без перенумерации.
const POSITION_GAP = 1024;

export type BoardErrorCode = 'NOT_FOUND';

export class BoardError extends Error {
  constructor(public code: BoardErrorCode) {
    super(code);
    this.name = 'BoardError';
  }
}

export interface PublicLabel {
  id: string;
  name: string;
  color: string;
}

export interface PublicMember {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
}

export interface PublicChecklistItem {
  id: string;
  text: string;
  done: boolean;
  position: number;
}

export interface PublicComment {
  id: string;
  author: PublicMember;
  text: string;
  createdAt: string;
}

export interface PublicCard {
  id: string;
  listId: string;
  title: string;
  description: string;
  dueDate: string | null;
  dueTime: string | null;
  done: boolean;
  labels: PublicLabel[];
  assignee: PublicMember | null;
  checklist: PublicChecklistItem[];
  comments: PublicComment[];
  position: number;
}

export interface PublicList {
  id: string;
  title: string;
  color: string | null;
  position: number;
  cards: PublicCard[];
}

export interface PublicBoard {
  id: string;
  title: string;
  color: string | null;
  labels: PublicLabel[];
  lists: PublicList[];
}

export interface BoardSummary {
  id: string;
  title: string;
  color: string | null;
  folder: string | null;
  position: number;
}

function toBoardSummary(b: {
  id: string;
  title: string;
  color: string | null;
  folder: string | null;
  position: number;
}): BoardSummary {
  return { id: b.id, title: b.title, color: b.color, folder: b.folder, position: b.position };
}

function toLabel(row: LabelRow): PublicLabel {
  return { id: row.id, name: row.name, color: row.color };
}

function toChecklistItem(row: ChecklistItemRow): PublicChecklistItem {
  return { id: row.id, text: row.text, done: row.done, position: row.position };
}

function toComment(row: CommentRow): PublicComment {
  return {
    id: row.id,
    author: {
      id: row.author_id,
      name: row.author_name,
      handle: row.author_handle,
      avatar: row.author_avatar,
    },
    text: row.text,
    createdAt: row.created_at.toISOString(),
  };
}

function toCard(
  row: CardRow,
  labels: PublicLabel[],
  members: Map<string, PublicMember>,
  checklist: PublicChecklistItem[],
  comments: PublicComment[],
): PublicCard {
  return {
    id: row.id,
    listId: row.list_id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    dueTime: row.due_time,
    done: row.done,
    labels,
    assignee: row.assignee_id ? (members.get(row.assignee_id) ?? null) : null,
    checklist,
    comments,
    position: row.position,
  };
}

function assembleBoard(
  board: { id: string; title: string; color: string | null },
  lists: ListRow[],
  cards: CardRow[],
  labelRows: LabelRow[],
  memberRows: MemberRow[],
  checklistRows: ChecklistItemRow[],
  cardLabelRows: CardLabelRow[],
  commentRows: CommentRow[],
): PublicBoard {
  const labels = labelRows.map(toLabel);
  const labelsById = new Map(labels.map((l) => [l.id, l]));
  const membersById = new Map(memberRows.map((m) => [m.id, m]));
  const checklistByCard = new Map<string, PublicChecklistItem[]>();
  for (const row of checklistRows) {
    const list = checklistByCard.get(row.card_id) ?? [];
    list.push(toChecklistItem(row));
    checklistByCard.set(row.card_id, list);
  }
  const labelsByCard = new Map<string, PublicLabel[]>();
  for (const row of cardLabelRows) {
    const label = labelsById.get(row.label_id);
    if (!label) continue;
    const list = labelsByCard.get(row.card_id) ?? [];
    list.push(label);
    labelsByCard.set(row.card_id, list);
  }
  const commentsByCard = new Map<string, PublicComment[]>();
  for (const row of commentRows) {
    const list = commentsByCard.get(row.card_id) ?? [];
    list.push(toComment(row));
    commentsByCard.set(row.card_id, list);
  }
  return {
    id: board.id,
    title: board.title,
    color: board.color,
    labels,
    lists: lists.map((list) => ({
      id: list.id,
      title: list.title,
      color: list.color,
      position: list.position,
      cards: cards
        .filter((card) => card.list_id === list.id)
        .map((c) =>
          toCard(
            c,
            labelsByCard.get(c.id) ?? [],
            membersById,
            checklistByCard.get(c.id) ?? [],
            commentsByCard.get(c.id) ?? [],
          ),
        ),
    })),
  };
}

const DEFAULT_LISTS = ['Бэклог', 'В работе', 'Готово', 'На паузе'];

// Стартовый набор меток на каждую новую доску (пользователь потом правит/дополняет).
const STARTER_LABELS = [
  { name: 'Дизайн', color: 'purple' },
  { name: 'Разработка', color: 'blue' },
  { name: 'Срочно', color: 'red' },
  { name: 'Исследование', color: 'green' },
  { name: 'Маркетинг', color: 'amber' },
];

// Демо-карточки только для самой первой (автоматической) доски, чтобы экран
// не был пустым. label — имя из STARTER_LABELS.
const SAMPLE_CARDS: Record<string, { title: string; label?: string; dueDate?: string }[]> = {
  Бэклог: [
    { title: 'Подготовить презентацию по статусу команды', dueDate: '2026-04-17' },
    { title: 'Запросить у аналитики свежие метрики по фиче' },
    { title: 'Сформировать список рисков по текущему релизу', label: 'Срочно' },
  ],
  'В работе': [
    { title: 'Собрать таблицу по загрузке разработчиков на апрель', label: 'Исследование' },
    { title: 'Просмотреть открытые баги и раздать по исполнителям', dueDate: '2026-03-25' },
  ],
};

async function createLists(boardId: string): Promise<ListRow[]> {
  const lists: ListRow[] = [];
  for (let i = 0; i < DEFAULT_LISTS.length; i++) {
    lists.push(await boardRepo.createList(boardId, DEFAULT_LISTS[i], (i + 1) * POSITION_GAP));
  }
  return lists;
}

async function createStarterLabels(boardId: string): Promise<Map<string, string>> {
  const byName = new Map<string, string>();
  for (const l of STARTER_LABELS) {
    const row = await boardRepo.createLabel(boardId, l.name, l.color);
    byName.set(row.name, row.id);
  }
  return byName;
}

async function resolveCard(row: CardRow): Promise<PublicCard> {
  const [labels, member, checklist, comments] = await Promise.all([
    boardRepo.labelsOfCard(row.id),
    row.assignee_id ? boardRepo.memberById(row.assignee_id) : null,
    boardRepo.checklistByCard(row.id),
    boardRepo.commentsByCard(row.id),
  ]);
  const members = new Map<string, PublicMember>();
  if (member) members.set(member.id, member);
  return toCard(
    row,
    labels.map(toLabel),
    members,
    checklist.map(toChecklistItem),
    comments.map(toComment),
  );
}

async function createDefaultBoard(ownerId: string): Promise<void> {
  const board = await boardRepo.createBoard(ownerId, 'Мои задачи', POSITION_GAP);
  const lists = await createLists(board.id);
  const labelByName = await createStarterLabels(board.id);

  for (const list of lists) {
    const samples = SAMPLE_CARDS[list.title] ?? [];
    for (let i = 0; i < samples.length; i++) {
      const card = await boardRepo.createCard(list.id, samples[i].title, (i + 1) * POSITION_GAP);
      if (samples[i].dueDate) await boardRepo.updateCard(card.id, { dueDate: samples[i].dueDate });
      const labelId = samples[i].label ? labelByName.get(samples[i].label!) : undefined;
      if (labelId) await boardRepo.addCardLabel(card.id, labelId);
    }
  }
}

export async function listBoards(seedOwnerId: string): Promise<BoardSummary[]> {
  let boards = await boardAccessRepo.boardsForUser(seedOwnerId, config.accessAdminEmails);
  if (boards.length === 0 && (await boardRepo.allBoards()).length === 0) {
    await createDefaultBoard(seedOwnerId);
    boards = await boardAccessRepo.boardsForUser(seedOwnerId, config.accessAdminEmails);
  }
  return boards.map(toBoardSummary);
}

export async function getBoard(boardId: string): Promise<PublicBoard> {
  const board = await boardRepo.findBoardById(boardId);
  if (!board) {
    throw new BoardError('NOT_FOUND');
  }
  const [lists, cards, labels, members, checklist, cardLabels, comments] = await Promise.all([
    boardRepo.listsByBoard(board.id),
    boardRepo.cardsByBoard(board.id),
    boardRepo.labelsByBoard(board.id),
    boardAccessRepo.membersForBoard(board.id, config.accessAdminEmails),
    boardRepo.checklistByBoard(board.id),
    boardRepo.cardLabelsByBoard(board.id),
    boardRepo.commentsByBoard(board.id),
  ]);
  return assembleBoard(board, lists, cards, labels, members, checklist, cardLabels, comments);
}

export async function addComment(
  cardId: string,
  authorId: string,
  text: string,
): Promise<PublicComment> {
  await assertCardExists(cardId);
  const boardId = await boardAccessRepo.boardIdForCard(cardId);
  if (!boardId) throw new BoardError('NOT_FOUND');

  const members = await boardAccessRepo.membersForBoard(boardId, config.accessAdminEmails);
  const comment = await boardRepo.createComment(cardId, authorId, text);
  await notificationsRepo.createMentions({
    userIds: mentionedUserIds(text, members, authorId),
    actorId: authorId,
    boardId,
    cardId,
    commentId: comment.id,
  });
  return toComment(comment);
}

// Удалять комментарий может только его автор.
export async function removeComment(commentId: string, userId: string): Promise<void> {
  const author = await boardRepo.commentAuthor(commentId);
  if (!author || author !== userId) {
    throw new BoardError('NOT_FOUND');
  }
  await boardRepo.deleteComment(commentId);
}

export async function listMembers(boardId: string): Promise<PublicMember[]> {
  return boardAccessRepo.membersForBoard(boardId, config.accessAdminEmails);
}

export async function setCardAssignee(cardId: string, userId: string | null): Promise<PublicCard> {
  await assertCardExists(cardId);
  const boardId = await boardAccessRepo.boardIdForCard(cardId);
  if (
    !boardId ||
    (userId && !(await boardAccessRepo.hasBoardAccess(userId, boardId, config.accessAdminEmails)))
  ) {
    throw new BoardError('NOT_FOUND');
  }
  const card = await boardRepo.setCardAssignee(cardId, userId);
  return resolveCard(card);
}

export async function setCardDone(cardId: string, done: boolean): Promise<PublicCard> {
  await assertCardExists(cardId);
  const card = await boardRepo.setCardDone(cardId, done);
  return resolveCard(card);
}

export async function duplicateCard(cardId: string): Promise<PublicCard> {
  const card = await boardRepo.cardById(cardId);
  if (!card) throw new BoardError('NOT_FOUND');
  const max = await boardRepo.maxCardPosition(card.list_id);
  const copy = await boardRepo.duplicateCard(cardId, (max ?? 0) + POSITION_GAP);
  return resolveCard(copy);
}

export interface PublicArchivedCard {
  id: string;
  title: string;
  listTitle: string;
  archivedAt: string;
}

function toArchivedCard(row: ArchivedCardRow): PublicArchivedCard {
  return {
    id: row.id,
    title: row.title,
    listTitle: row.list_title,
    archivedAt: row.archived_at.toISOString(),
  };
}

export async function listArchivedCards(boardId: string): Promise<PublicArchivedCard[]> {
  const rows = await boardRepo.archivedCardsByBoard(boardId);
  return rows.map(toArchivedCard);
}

export async function setCardArchived(cardId: string, archived: boolean): Promise<void> {
  await assertCardExists(cardId);
  await boardRepo.setCardArchived(cardId, archived);
}

const CHECKLIST_GAP = 1024;

export async function addChecklistItem(cardId: string, text: string): Promise<PublicChecklistItem> {
  await assertCardExists(cardId);
  const max = await boardRepo.maxChecklistPosition(cardId);
  const row = await boardRepo.createChecklistItem(cardId, text, (max ?? 0) + CHECKLIST_GAP);
  return toChecklistItem(row);
}

export async function editChecklistItem(
  itemId: string,
  fields: { text?: string; done?: boolean },
): Promise<PublicChecklistItem> {
  const row = await boardRepo.updateChecklistItem(itemId, fields.text ?? null, fields.done ?? null);
  if (!row) throw new BoardError('NOT_FOUND');
  return toChecklistItem(row);
}

export async function removeChecklistItem(itemId: string): Promise<void> {
  if (!(await boardRepo.checklistCardId(itemId))) {
    throw new BoardError('NOT_FOUND');
  }
  await boardRepo.deleteChecklistItem(itemId);
}

export async function createBoard(ownerId: string, title: string): Promise<BoardSummary> {
  const max = await boardRepo.maxBoardPosition();
  const board = await boardRepo.createBoard(ownerId, title, (max ?? 0) + POSITION_GAP);
  await createLists(board.id);
  await createStarterLabels(board.id);
  return toBoardSummary(board);
}

export async function renameBoard(boardId: string, title: string): Promise<BoardSummary> {
  const board = await boardRepo.renameBoard(boardId, title);
  if (!board) throw new BoardError('NOT_FOUND');
  return toBoardSummary(board);
}

export async function setBoardColor(boardId: string, color: string | null): Promise<BoardSummary> {
  const board = await boardRepo.setBoardColor(boardId, color);
  if (!board) throw new BoardError('NOT_FOUND');
  return toBoardSummary(board);
}

export async function setBoardFolder(
  boardId: string,
  folder: string | null,
): Promise<BoardSummary> {
  const board = await boardRepo.setBoardFolder(boardId, folder);
  if (!board) throw new BoardError('NOT_FOUND');
  return toBoardSummary(board);
}

export async function moveBoard(boardId: string, position: number): Promise<void> {
  if (!(await boardRepo.findBoardById(boardId))) {
    throw new BoardError('NOT_FOUND');
  }
  await boardRepo.setBoardPosition(boardId, position);
}

export async function removeBoard(boardId: string): Promise<void> {
  if (!(await boardRepo.findBoardById(boardId))) {
    throw new BoardError('NOT_FOUND');
  }
  await boardRepo.deleteBoard(boardId);
}

export async function addList(boardId: string, title: string): Promise<PublicList> {
  const board = await boardRepo.findBoardById(boardId);
  if (!board) {
    throw new BoardError('NOT_FOUND');
  }
  const max = await boardRepo.maxListPosition(boardId);
  const list = await boardRepo.createList(boardId, title, (max ?? 0) + POSITION_GAP);
  return { id: list.id, title: list.title, color: list.color, position: list.position, cards: [] };
}

export async function renameList(listId: string, title: string): Promise<void> {
  const row = await boardRepo.renameList(listId, title);
  if (!row) throw new BoardError('NOT_FOUND');
}

export async function setListColor(listId: string, color: string | null): Promise<void> {
  const row = await boardRepo.setListColor(listId, color);
  if (!row) throw new BoardError('NOT_FOUND');
}

export async function moveList(listId: string, position: number): Promise<void> {
  await assertListExists(listId);
  await boardRepo.setListPosition(listId, position);
}

export async function removeList(listId: string): Promise<void> {
  await assertListExists(listId);
  await boardRepo.deleteList(listId);
}

export async function addCard(listId: string, title: string): Promise<PublicCard> {
  await assertListExists(listId);
  const max = await boardRepo.maxCardPosition(listId);
  const card = await boardRepo.createCard(listId, title, (max ?? 0) + POSITION_GAP);
  return resolveCard(card);
}

export async function editCard(cardId: string, fields: CardFields): Promise<PublicCard> {
  await assertCardExists(cardId);
  const card = await boardRepo.updateCard(cardId, fields);
  return resolveCard(card);
}

export async function moveCard(
  cardId: string,
  listId: string,
  position: number,
): Promise<PublicCard> {
  const [cardBoardId, listBoardId] = await Promise.all([
    boardAccessRepo.boardIdForCard(cardId),
    boardAccessRepo.boardIdForList(listId),
  ]);
  if (!cardBoardId || cardBoardId !== listBoardId) throw new BoardError('NOT_FOUND');
  const card = await boardRepo.moveCard(cardId, listId, position);
  return resolveCard(card);
}

export async function removeCard(cardId: string): Promise<void> {
  await assertCardExists(cardId);
  await boardRepo.deleteCard(cardId);
}

// Включает/выключает метку на карточке (меток может быть несколько).
export async function toggleCardLabel(
  cardId: string,
  labelId: string,
  active: boolean,
): Promise<PublicCard> {
  const row = await boardRepo.cardById(cardId);
  if (!row) throw new BoardError('NOT_FOUND');
  const [cardBoardId, labelBoardId] = await Promise.all([
    boardAccessRepo.boardIdForCard(cardId),
    boardAccessRepo.boardIdForLabel(labelId),
  ]);
  if (!cardBoardId || cardBoardId !== labelBoardId) throw new BoardError('NOT_FOUND');

  if (active) await boardRepo.addCardLabel(cardId, labelId);
  else await boardRepo.removeCardLabel(cardId, labelId);

  return resolveCard(row);
}

export async function moveChecklistItem(
  itemId: string,
  position: number,
): Promise<PublicChecklistItem> {
  const row = await boardRepo.setChecklistItemPosition(itemId, position);
  if (!row) throw new BoardError('NOT_FOUND');
  return toChecklistItem(row);
}

export async function createLabel(
  boardId: string,
  name: string,
  color: string,
): Promise<PublicLabel> {
  if (!(await boardRepo.findBoardById(boardId))) {
    throw new BoardError('NOT_FOUND');
  }
  return toLabel(await boardRepo.createLabel(boardId, name, color));
}

export async function editLabel(
  labelId: string,
  name: string,
  color: string,
): Promise<PublicLabel> {
  const row = await boardRepo.updateLabel(labelId, name, color);
  if (!row) throw new BoardError('NOT_FOUND');
  return toLabel(row);
}

export async function removeLabel(labelId: string): Promise<void> {
  if (!(await boardRepo.labelById(labelId))) {
    throw new BoardError('NOT_FOUND');
  }
  await boardRepo.deleteLabel(labelId);
}

async function assertListExists(listId: string): Promise<void> {
  if (!(await boardRepo.ownerOfList(listId))) {
    throw new BoardError('NOT_FOUND');
  }
}

async function assertCardExists(cardId: string): Promise<void> {
  if (!(await boardRepo.ownerOfCard(cardId))) {
    throw new BoardError('NOT_FOUND');
  }
}
