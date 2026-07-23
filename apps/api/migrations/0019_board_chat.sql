-- Чат доски: общий поток сообщений для быстрых вопросов, без тредов.
create table board_messages (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references boards (id) on delete cascade,
  author_id   uuid not null references users (id) on delete cascade,
  text        text not null,
  created_at  timestamptz not null default now()
);

create index board_messages_board_created_idx on board_messages (board_id, created_at desc);
