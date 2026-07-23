import { pool } from '../../db';
import type { UserRow } from '../auth/auth.repo';
import type { BoardRow } from '../board/board.repo';

export interface ManagedUserInput {
  email: string;
  name: string;
  handle: string;
  passwordHash: string;
}

export interface ManagedUserRow extends UserRow {
  board_ids: string[];
}

export interface AccessRepo {
  findUserByEmail(email: string): Promise<UserRow | null>;
  findUserByHandle(handle: string): Promise<UserRow | null>;
  findUserById(id: string): Promise<UserRow | null>;
  createUserWithBoards(input: ManagedUserInput, boardIds: string[]): Promise<UserRow>;
  listUsersWithBoards(): Promise<ManagedUserRow[]>;
  replaceUserBoards(userId: string, boardIds: string[]): Promise<void>;
}

export class AccessRepoError extends Error {
  constructor(public code: 'EMAIL_TAKEN' | 'HANDLE_TAKEN' | 'BOARD_NOT_FOUND' | 'USER_NOT_FOUND') {
    super(code);
    this.name = 'AccessRepoError';
  }
}

export const pgAccessRepo: AccessRepo = {
  async findUserByEmail(email) {
    const { rows } = await pool.query<UserRow>(
      'select * from users where lower(email) = lower($1)',
      [email],
    );
    return rows[0] ?? null;
  },

  async findUserByHandle(handle) {
    const { rows } = await pool.query<UserRow>(
      'select * from users where lower(handle) = lower($1)',
      [handle],
    );
    return rows[0] ?? null;
  },

  async findUserById(id) {
    const { rows } = await pool.query<UserRow>('select * from users where id = $1', [id]);
    return rows[0] ?? null;
  },

  async createUserWithBoards(input, boardIds) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const boards = await client.query<{ id: string }>(
        'select id from boards where id = any($1::uuid[])',
        [boardIds],
      );
      if (boards.rows.length !== boardIds.length) {
        throw new AccessRepoError('BOARD_NOT_FOUND');
      }

      const { rows } = await client.query<UserRow>(
        `insert into users (email, name, handle, password_hash)
         values (lower($1), $2, lower($3), $4)
         returning *`,
        [input.email, input.name, input.handle, input.passwordHash],
      );
      await client.query(
        `insert into board_members (board_id, user_id)
         select unnest($1::uuid[]), $2`,
        [boardIds, rows[0].id],
      );
      await client.query('commit');
      return rows[0];
    } catch (err) {
      await client.query('rollback');
      if (err instanceof AccessRepoError) throw err;
      if ((err as { code?: string }).code === '23505') {
        throw new AccessRepoError('EMAIL_TAKEN');
      }
      throw err;
    } finally {
      client.release();
    }
  },

  async listUsersWithBoards() {
    const { rows } = await pool.query<ManagedUserRow>(
      `select u.*, coalesce(array_agg(bm.board_id order by bm.board_id)
         filter (where bm.board_id is not null), '{}') as board_ids
         from users u
         left join board_members bm on bm.user_id = u.id
         group by u.id
         order by u.name, u.email`,
    );
    return rows;
  },

  async replaceUserBoards(userId, boardIds) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const user = await client.query('select id from users where id = $1', [userId]);
      if (user.rows.length === 0) throw new AccessRepoError('USER_NOT_FOUND');

      if (boardIds.length > 0) {
        const boards = await client.query<{ id: string }>(
          'select id from boards where id = any($1::uuid[])',
          [boardIds],
        );
        if (boards.rows.length !== boardIds.length) throw new AccessRepoError('BOARD_NOT_FOUND');
      }

      await client.query('delete from board_members where user_id = $1', [userId]);
      if (boardIds.length > 0) {
        await client.query(
          `insert into board_members (board_id, user_id)
           select unnest($1::uuid[]), $2`,
          [boardIds, userId],
        );
      }
      await client.query('commit');
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  },
};

async function boardIdFromQuery(sql: string, id: string): Promise<string | null> {
  const { rows } = await pool.query<{ board_id: string }>(sql, [id]);
  return rows[0]?.board_id ?? null;
}

export const boardAccessRepo = {
  async boardsForUser(userId: string, adminEmails: string[]): Promise<BoardRow[]> {
    const { rows } = await pool.query<BoardRow>(
      `select distinct b.* from boards b
         join users u on u.id = $1
         left join board_members bm on bm.board_id = b.id and bm.user_id = u.id
        where lower(u.email) = any($2::text[]) or bm.user_id is not null
        order by b.position`,
      [userId, adminEmails],
    );
    return rows;
  },

  async hasBoardAccess(userId: string, boardId: string, adminEmails: string[]): Promise<boolean> {
    const { rows } = await pool.query<{ allowed: boolean }>(
      `select exists (
         select 1 from boards b
           join users u on u.id = $1
           left join board_members bm on bm.board_id = b.id and bm.user_id = u.id
          where b.id = $2
            and (lower(u.email) = any($3::text[]) or bm.user_id is not null)
       ) as allowed`,
      [userId, boardId, adminEmails],
    );
    return rows[0].allowed;
  },

  async membersForBoard(
    boardId: string,
    adminEmails: string[],
  ): Promise<{ id: string; name: string; handle: string; avatar: string | null }[]> {
    const { rows } = await pool.query<{
      id: string;
      name: string;
      handle: string;
      avatar: string | null;
    }>(
      `select distinct u.id, u.name, u.handle, u.avatar from users u
         left join board_members bm on bm.user_id = u.id and bm.board_id = $1
        where lower(u.email) = any($2::text[]) or bm.board_id is not null
        order by u.name`,
      [boardId, adminEmails],
    );
    return rows;
  },

  boardIdForList(listId: string): Promise<string | null> {
    return boardIdFromQuery('select board_id from lists where id = $1', listId);
  },

  boardIdForCard(cardId: string): Promise<string | null> {
    return boardIdFromQuery(
      `select l.board_id from cards c
         join lists l on l.id = c.list_id
        where c.id = $1`,
      cardId,
    );
  },

  boardIdForLabel(labelId: string): Promise<string | null> {
    return boardIdFromQuery('select board_id from labels where id = $1', labelId);
  },

  boardIdForChecklistItem(itemId: string): Promise<string | null> {
    return boardIdFromQuery(
      `select l.board_id from checklist_items ci
         join cards c on c.id = ci.card_id
         join lists l on l.id = c.list_id
        where ci.id = $1`,
      itemId,
    );
  },

  boardIdForComment(commentId: string): Promise<string | null> {
    return boardIdFromQuery(
      `select l.board_id from card_comments cm
         join cards c on c.id = cm.card_id
         join lists l on l.id = c.list_id
        where cm.id = $1`,
      commentId,
    );
  },
};
