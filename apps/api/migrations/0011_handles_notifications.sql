-- Ник — короткое уникальное имя для упоминаний в комментариях.
alter table users add column handle text;

-- У существующих аккаунтов сохраняем простой local-part email, если он уже
-- похож на ник и не повторяется. Для остальных — стабильный уникальный fallback.
with preferred_handles as (
  select
    id,
    case
      when lower(split_part(email, '@', 1)) ~ '^[a-z0-9_]{3,32}$'
        and count(*) over (partition by lower(split_part(email, '@', 1))) = 1
      then lower(split_part(email, '@', 1))
      else 'user_' || substr(replace(id::text, '-', ''), 1, 8)
    end as handle
  from users
)
update users u
set handle = preferred_handles.handle
from preferred_handles
where u.id = preferred_handles.id;

alter table users alter column handle set not null;
create unique index users_handle_lower_idx on users (lower(handle));

-- Уведомление создаётся только для точного @ника в комментарии карточки.
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  actor_id    uuid not null references users (id) on delete cascade,
  board_id    uuid not null references boards (id) on delete cascade,
  card_id     uuid not null references cards (id) on delete cascade,
  comment_id  uuid not null references card_comments (id) on delete cascade,
  type        text not null default 'mention' check (type = 'mention'),
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  unique (user_id, comment_id)
);

create index notifications_user_created_idx on notifications (user_id, created_at desc);
create index notifications_unread_idx on notifications (user_id, created_at desc)
  where read_at is null;
