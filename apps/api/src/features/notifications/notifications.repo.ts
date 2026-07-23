import { pool } from '../../db';

export interface NotificationRow {
  id: string;
  type: 'mention';
  created_at: Date;
  read_at: Date | null;
  actor_id: string;
  actor_name: string;
  actor_handle: string;
  actor_avatar: string | null;
  board_id: string;
  board_title: string;
  card_id: string;
  card_title: string;
  comment_text: string;
}

export const notificationsRepo = {
  async createMentions(input: {
    userIds: string[];
    actorId: string;
    boardId: string;
    cardId: string;
    commentId: string;
  }): Promise<void> {
    if (input.userIds.length === 0) return;
    await pool.query(
      `insert into notifications (user_id, actor_id, board_id, card_id, comment_id)
       select mentioned_user_id, $2, $3, $4, $5
       from unnest($1::uuid[]) as mentioned_user_id
       on conflict (user_id, comment_id) do nothing`,
      [input.userIds, input.actorId, input.boardId, input.cardId, input.commentId],
    );
  },

  async listForUser(userId: string, adminEmails: string[]): Promise<NotificationRow[]> {
    const { rows } = await pool.query<NotificationRow>(
      `select
         n.id,
         n.type,
         n.created_at,
         n.read_at,
         actor.id as actor_id,
         actor.name as actor_name,
         actor.handle as actor_handle,
         actor.avatar as actor_avatar,
         b.id as board_id,
         b.title as board_title,
         c.id as card_id,
         c.title as card_title,
         cm.text as comment_text
       from notifications n
       join users recipient on recipient.id = n.user_id
       join users actor on actor.id = n.actor_id
       join boards b on b.id = n.board_id
       join cards c on c.id = n.card_id
       join card_comments cm on cm.id = n.comment_id
       left join board_members bm on bm.board_id = b.id and bm.user_id = recipient.id
       where n.user_id = $1
         and (lower(recipient.email) = any($2::text[]) or bm.user_id is not null)
       order by n.created_at desc
       limit 30`,
      [userId, adminEmails],
    );
    return rows;
  },

  async markAllRead(userId: string): Promise<void> {
    await pool.query(
      'update notifications set read_at = now() where user_id = $1 and read_at is null',
      [userId],
    );
  },
};
