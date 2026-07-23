-- Личные заметки пользователя (не общие, в отличие от досок).
create table notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references users (id) on delete cascade,
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_owner_id_idx on notes (owner_id);
