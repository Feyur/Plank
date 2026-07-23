-- Пункты чек-листа карточки.
create table checklist_items (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references cards (id) on delete cascade,
  text       text not null,
  done       boolean not null default false,
  position   double precision not null,
  created_at timestamptz not null default now()
);

create index checklist_items_card_id_idx on checklist_items (card_id);
