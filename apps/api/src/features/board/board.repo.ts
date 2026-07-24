import { pool } from '../../db';

export interface BoardRow {
  id: string;
  owner_id: string;
  title: string;
  color: string | null;
  folder_id: string | null;
  position: number;
  created_at: Date;
}

export interface ListRow {
  id: string;
  board_id: string;
  title: string;
  color: string | null;
  position: number;
  created_at: Date;
}

export interface CardRow {
  id: string;
  list_id: string;
  title: string;
  description: string;
  due_date: string | null;
  assignee_id: string | null;
  done: boolean;
  archived_at: Date | null;
  due_time: string | null;
  position: number;
  created_at: Date;
  updated_at: Date;
}

// Карточка в архиве — лёгкая проекция для панели архива.
export interface ArchivedCardRow {
  id: string;
  title: string;
  list_title: string;
  archived_at: Date;
}

export interface CardLabelRow {
  card_id: string;
  label_id: string;
}

export interface MemberRow {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
}

export interface ChecklistItemRow {
  id: string;
  card_id: string;
  text: string;
  done: boolean;
  position: number;
  created_at: Date;
}

export interface CommentRow {
  id: string;
  card_id: string;
  author_id: string;
  author_name: string;
  author_handle: string;
  author_avatar: string | null;
  text: string;
  created_at: Date;
}

export interface CardFields {
  title?: string;
  description?: string;
  dueDate?: string | null;
  dueTime?: string | null;
}

export interface LabelRow {
  id: string;
  board_id: string;
  name: string;
  color: string;
  created_at: Date;
}

export const boardRepo = {
  // Все доски инстанса — команда работает с общим набором досок.
  async allBoards(): Promise<BoardRow[]> {
    const { rows } = await pool.query<BoardRow>('select * from boards order by position');
    return rows;
  },

  async findBoardById(id: string): Promise<BoardRow | null> {
    const { rows } = await pool.query<BoardRow>('select * from boards where id = $1', [id]);
    return rows[0] ?? null;
  },

  async maxBoardPosition(): Promise<number | null> {
    const { rows } = await pool.query<{ max: number | null }>(
      'select max(position) as max from boards',
    );
    return rows[0].max;
  },

  async createBoard(ownerId: string, title: string, position: number): Promise<BoardRow> {
    const { rows } = await pool.query<BoardRow>(
      `with inserted as (
         insert into boards (owner_id, title, position) values ($1, $2, $3) returning *
       ), membership as (
         insert into board_members (board_id, user_id)
         select id, owner_id from inserted
       )
       select * from inserted`,
      [ownerId, title, position],
    );
    return rows[0];
  },

  async renameBoard(id: string, title: string): Promise<BoardRow | null> {
    const { rows } = await pool.query<BoardRow>(
      'update boards set title = $2 where id = $1 returning *',
      [id, title],
    );
    return rows[0] ?? null;
  },

  async setBoardPosition(id: string, position: number): Promise<void> {
    await pool.query('update boards set position = $2 where id = $1', [id, position]);
  },

  async setBoardColor(id: string, color: string | null): Promise<BoardRow | null> {
    const { rows } = await pool.query<BoardRow>(
      'update boards set color = $2 where id = $1 returning *',
      [id, color],
    );
    return rows[0] ?? null;
  },

  async setBoardFolder(id: string, folderId: string | null): Promise<BoardRow | null> {
    const { rows } = await pool.query<BoardRow>(
      'update boards set folder_id = $2 where id = $1 returning *',
      [id, folderId],
    );
    return rows[0] ?? null;
  },

  async deleteBoard(id: string): Promise<void> {
    await pool.query('delete from boards where id = $1', [id]);
  },

  async listsByBoard(boardId: string): Promise<ListRow[]> {
    const { rows } = await pool.query<ListRow>(
      'select * from lists where board_id = $1 order by position',
      [boardId],
    );
    return rows;
  },

  async cardsByBoard(boardId: string): Promise<CardRow[]> {
    const { rows } = await pool.query<CardRow>(
      `select c.* from cards c
         join lists l on l.id = c.list_id
        where l.board_id = $1 and c.archived_at is null
        order by c.position`,
      [boardId],
    );
    return rows;
  },

  async archivedCardsByBoard(boardId: string): Promise<ArchivedCardRow[]> {
    const { rows } = await pool.query<ArchivedCardRow>(
      `select c.id, c.title, l.title as list_title, c.archived_at from cards c
         join lists l on l.id = c.list_id
        where l.board_id = $1 and c.archived_at is not null
        order by c.archived_at desc`,
      [boardId],
    );
    return rows;
  },

  async setCardArchived(cardId: string, archived: boolean): Promise<CardRow> {
    const { rows } = await pool.query<CardRow>(
      `update cards set archived_at = case when $2 then now() else null end, updated_at = now()
        where id = $1 returning *`,
      [cardId, archived],
    );
    return rows[0];
  },

  async createList(boardId: string, title: string, position: number): Promise<ListRow> {
    const { rows } = await pool.query<ListRow>(
      'insert into lists (board_id, title, position) values ($1, $2, $3) returning *',
      [boardId, title, position],
    );
    return rows[0];
  },

  async maxListPosition(boardId: string): Promise<number | null> {
    const { rows } = await pool.query<{ max: number | null }>(
      'select max(position) as max from lists where board_id = $1',
      [boardId],
    );
    return rows[0].max;
  },

  async renameList(id: string, title: string): Promise<ListRow | null> {
    const { rows } = await pool.query<ListRow>(
      'update lists set title = $2 where id = $1 returning *',
      [id, title],
    );
    return rows[0] ?? null;
  },

  async setListColor(id: string, color: string | null): Promise<ListRow | null> {
    const { rows } = await pool.query<ListRow>(
      'update lists set color = $2 where id = $1 returning *',
      [id, color],
    );
    return rows[0] ?? null;
  },

  async setListPosition(id: string, position: number): Promise<void> {
    await pool.query('update lists set position = $2 where id = $1', [id, position]);
  },

  async deleteList(id: string): Promise<void> {
    await pool.query('delete from lists where id = $1', [id]);
  },

  async createCard(listId: string, title: string, position: number): Promise<CardRow> {
    const { rows } = await pool.query<CardRow>(
      'insert into cards (list_id, title, position) values ($1, $2, $3) returning *',
      [listId, title, position],
    );
    return rows[0];
  },

  async cardById(id: string): Promise<CardRow | null> {
    const { rows } = await pool.query<CardRow>('select * from cards where id = $1', [id]);
    return rows[0] ?? null;
  },

  async maxCardPosition(listId: string): Promise<number | null> {
    const { rows } = await pool.query<{ max: number | null }>(
      'select max(position) as max from cards where list_id = $1',
      [listId],
    );
    return rows[0].max;
  },

  async updateCard(id: string, fields: CardFields): Promise<CardRow> {
    // Обновляем только переданные поля; всегда двигаем updated_at.
    const { rows } = await pool.query<CardRow>(
      `update cards set
         title       = coalesce($2, title),
         description = coalesce($3, description),
         due_date    = case when $4 then $5::date else due_date end,
         due_time    = case when $6 then $7 else due_time end,
         updated_at  = now()
       where id = $1
       returning *`,
      [
        id,
        fields.title ?? null,
        fields.description ?? null,
        fields.dueDate !== undefined,
        fields.dueDate ?? null,
        fields.dueTime !== undefined,
        fields.dueTime ?? null,
      ],
    );
    return rows[0];
  },

  // Метки карточек всей доски одним запросом (порядок — по создан-ию метки,
  // чтобы чипы на карточках шли стабильно).
  async cardLabelsByBoard(boardId: string): Promise<CardLabelRow[]> {
    const { rows } = await pool.query<CardLabelRow>(
      `select cl.card_id, cl.label_id from card_labels cl
         join cards c on c.id = cl.card_id
         join lists l on l.id = c.list_id
         join labels lb on lb.id = cl.label_id
        where l.board_id = $1
        order by lb.created_at`,
      [boardId],
    );
    return rows;
  },

  async labelsOfCard(cardId: string): Promise<LabelRow[]> {
    const { rows } = await pool.query<LabelRow>(
      `select l.* from labels l
         join card_labels cl on cl.label_id = l.id
        where cl.card_id = $1
        order by l.created_at`,
      [cardId],
    );
    return rows;
  },

  async addCardLabel(cardId: string, labelId: string): Promise<void> {
    await pool.query(
      'insert into card_labels (card_id, label_id) values ($1, $2) on conflict do nothing',
      [cardId, labelId],
    );
  },

  async removeCardLabel(cardId: string, labelId: string): Promise<void> {
    await pool.query('delete from card_labels where card_id = $1 and label_id = $2', [
      cardId,
      labelId,
    ]);
  },

  async setCardAssignee(cardId: string, userId: string | null): Promise<CardRow> {
    const { rows } = await pool.query<CardRow>(
      'update cards set assignee_id = $2, updated_at = now() where id = $1 returning *',
      [cardId, userId],
    );
    return rows[0];
  },

  // Копия карточки в том же списке: поля + метки + чек-лист (без комментариев).
  async duplicateCard(cardId: string, position: number): Promise<CardRow> {
    const { rows } = await pool.query<CardRow>(
      `insert into cards (list_id, title, description, due_date, due_time, assignee_id, position)
       select list_id, title, description, due_date, due_time, assignee_id, $2
         from cards where id = $1
       returning *`,
      [cardId, position],
    );
    const copy = rows[0];
    await pool.query(
      'insert into card_labels (card_id, label_id) select $2, label_id from card_labels where card_id = $1',
      [cardId, copy.id],
    );
    await pool.query(
      `insert into checklist_items (card_id, text, done, position)
       select $2, text, done, position from checklist_items where card_id = $1`,
      [cardId, copy.id],
    );
    return copy;
  },

  async setCardDone(cardId: string, done: boolean): Promise<CardRow> {
    const { rows } = await pool.query<CardRow>(
      'update cards set done = $2, updated_at = now() where id = $1 returning *',
      [cardId, done],
    );
    return rows[0];
  },

  // Участники команды (все пользователи инстанса) — для выбора ответственного.
  async members(): Promise<MemberRow[]> {
    const { rows } = await pool.query<MemberRow>(
      'select id, name, handle, avatar from users order by name',
    );
    return rows;
  },

  async memberById(id: string): Promise<MemberRow | null> {
    const { rows } = await pool.query<MemberRow>(
      'select id, name, handle, avatar from users where id = $1',
      [id],
    );
    return rows[0] ?? null;
  },

  async checklistByBoard(boardId: string): Promise<ChecklistItemRow[]> {
    const { rows } = await pool.query<ChecklistItemRow>(
      `select ci.* from checklist_items ci
         join cards c on c.id = ci.card_id
         join lists l on l.id = c.list_id
        where l.board_id = $1
        order by ci.position`,
      [boardId],
    );
    return rows;
  },

  async checklistByCard(cardId: string): Promise<ChecklistItemRow[]> {
    const { rows } = await pool.query<ChecklistItemRow>(
      'select * from checklist_items where card_id = $1 order by position',
      [cardId],
    );
    return rows;
  },

  async maxChecklistPosition(cardId: string): Promise<number | null> {
    const { rows } = await pool.query<{ max: number | null }>(
      'select max(position) as max from checklist_items where card_id = $1',
      [cardId],
    );
    return rows[0].max;
  },

  async createChecklistItem(
    cardId: string,
    text: string,
    position: number,
  ): Promise<ChecklistItemRow> {
    const { rows } = await pool.query<ChecklistItemRow>(
      'insert into checklist_items (card_id, text, position) values ($1, $2, $3) returning *',
      [cardId, text, position],
    );
    return rows[0];
  },

  async updateChecklistItem(
    id: string,
    text: string | null,
    done: boolean | null,
  ): Promise<ChecklistItemRow | null> {
    const { rows } = await pool.query<ChecklistItemRow>(
      'update checklist_items set text = coalesce($2, text), done = coalesce($3, done) where id = $1 returning *',
      [id, text, done],
    );
    return rows[0] ?? null;
  },

  async setChecklistItemPosition(id: string, position: number): Promise<ChecklistItemRow | null> {
    const { rows } = await pool.query<ChecklistItemRow>(
      'update checklist_items set position = $2 where id = $1 returning *',
      [id, position],
    );
    return rows[0] ?? null;
  },

  async deleteChecklistItem(id: string): Promise<void> {
    await pool.query('delete from checklist_items where id = $1', [id]);
  },

  async checklistCardId(id: string): Promise<string | null> {
    const { rows } = await pool.query<{ card_id: string }>(
      'select card_id from checklist_items where id = $1',
      [id],
    );
    return rows[0]?.card_id ?? null;
  },

  async commentsByBoard(boardId: string): Promise<CommentRow[]> {
    const { rows } = await pool.query<CommentRow>(
      `select cm.*, u.name as author_name, u.handle as author_handle, u.avatar as author_avatar from card_comments cm
         join users u on u.id = cm.author_id
         join cards c on c.id = cm.card_id
         join lists l on l.id = c.list_id
        where l.board_id = $1
        order by cm.created_at`,
      [boardId],
    );
    return rows;
  },

  async commentsByCard(cardId: string): Promise<CommentRow[]> {
    const { rows } = await pool.query<CommentRow>(
      `select cm.*, u.name as author_name, u.handle as author_handle, u.avatar as author_avatar from card_comments cm
         join users u on u.id = cm.author_id
        where cm.card_id = $1
        order by cm.created_at`,
      [cardId],
    );
    return rows;
  },

  async createComment(cardId: string, authorId: string, text: string): Promise<CommentRow> {
    const { rows } = await pool.query<{ id: string }>(
      'insert into card_comments (card_id, author_id, text) values ($1, $2, $3) returning id',
      [cardId, authorId, text],
    );
    const { rows: full } = await pool.query<CommentRow>(
      `select cm.*, u.name as author_name, u.handle as author_handle, u.avatar as author_avatar from card_comments cm
         join users u on u.id = cm.author_id
        where cm.id = $1`,
      [rows[0].id],
    );
    return full[0];
  },

  async commentAuthor(id: string): Promise<string | null> {
    const { rows } = await pool.query<{ author_id: string }>(
      'select author_id from card_comments where id = $1',
      [id],
    );
    return rows[0]?.author_id ?? null;
  },

  async deleteComment(id: string): Promise<void> {
    await pool.query('delete from card_comments where id = $1', [id]);
  },

  async labelsByBoard(boardId: string): Promise<LabelRow[]> {
    const { rows } = await pool.query<LabelRow>(
      'select * from labels where board_id = $1 order by created_at',
      [boardId],
    );
    return rows;
  },

  async createLabel(boardId: string, name: string, color: string): Promise<LabelRow> {
    const { rows } = await pool.query<LabelRow>(
      'insert into labels (board_id, name, color) values ($1, $2, $3) returning *',
      [boardId, name, color],
    );
    return rows[0];
  },

  async updateLabel(id: string, name: string, color: string): Promise<LabelRow | null> {
    const { rows } = await pool.query<LabelRow>(
      'update labels set name = $2, color = $3 where id = $1 returning *',
      [id, name, color],
    );
    return rows[0] ?? null;
  },

  async deleteLabel(id: string): Promise<void> {
    await pool.query('delete from labels where id = $1', [id]);
  },

  async labelById(id: string): Promise<LabelRow | null> {
    const { rows } = await pool.query<LabelRow>('select * from labels where id = $1', [id]);
    return rows[0] ?? null;
  },

  async moveCard(id: string, listId: string, position: number): Promise<CardRow> {
    const { rows } = await pool.query<CardRow>(
      'update cards set list_id = $2, position = $3, updated_at = now() where id = $1 returning *',
      [id, listId, position],
    );
    return rows[0];
  },

  async deleteCard(id: string): Promise<void> {
    await pool.query('delete from cards where id = $1', [id]);
  },

  // Владелец списка/карточки — для проверки прав на каждом эндпоинте.
  async ownerOfList(listId: string): Promise<{ boardId: string; ownerId: string } | null> {
    const { rows } = await pool.query<{ board_id: string; owner_id: string }>(
      `select l.board_id, b.owner_id from lists l
         join boards b on b.id = l.board_id
        where l.id = $1`,
      [listId],
    );
    return rows[0] ? { boardId: rows[0].board_id, ownerId: rows[0].owner_id } : null;
  },

  async ownerOfCard(cardId: string): Promise<{ listId: string; ownerId: string } | null> {
    const { rows } = await pool.query<{ list_id: string; owner_id: string }>(
      `select c.list_id, b.owner_id from cards c
         join lists l on l.id = c.list_id
         join boards b on b.id = l.board_id
        where c.id = $1`,
      [cardId],
    );
    return rows[0] ? { listId: rows[0].list_id, ownerId: rows[0].owner_id } : null;
  },
};
