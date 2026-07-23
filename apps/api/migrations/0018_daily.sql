-- Дейли (асинхронный стендап): у каждого — одна запись на день с тремя
-- разделами (готово / в работе / планирую). Дату держим как date-строку.
create table daily_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  entry_date  date not null,
  done        text not null default '',
  doing       text not null default '',
  next        text not null default '',
  updated_at  timestamptz not null default now(),
  unique (user_id, entry_date)
);

create index daily_entries_date_idx on daily_entries (entry_date);
