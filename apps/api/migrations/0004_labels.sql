-- Пользовательские метки на доску. Цвет — ключ палитры (индиго/красный/…).
create table labels (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references boards (id) on delete cascade,
  name       text not null,
  color      text not null,
  created_at timestamptz not null default now()
);

create index labels_board_id_idx on labels (board_id);

-- Раньше метка была фиксированным enum-текстом; переходим на ссылку на labels.
alter table cards drop column label;
alter table cards add column label_id uuid references labels (id) on delete set null;
