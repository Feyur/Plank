-- Доска → списки (колонки) → карточки. position — дробное, чтобы вставлять
-- между соседями без перенумерации всех элементов.
create table boards (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references users (id) on delete cascade,
  title      text not null,
  created_at timestamptz not null default now()
);

create table lists (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references boards (id) on delete cascade,
  title      text not null,
  position   double precision not null,
  created_at timestamptz not null default now()
);

create table cards (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references lists (id) on delete cascade,
  title       text not null,
  description text not null default '',
  due_date    date,
  label       text,
  position    double precision not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index lists_board_id_idx on lists (board_id);
create index cards_list_id_idx on cards (list_id);
