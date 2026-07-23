-- Комментарии к карточке.
create table card_comments (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references cards (id) on delete cascade,
  author_id  uuid not null references users (id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

create index card_comments_card_id_idx on card_comments (card_id);
