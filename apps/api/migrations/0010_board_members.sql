-- Явный доступ пользователей к доскам. Администраторы доступа обходят эту
-- таблицу на уровне API, остальные видят только назначенные доски.
create table board_members (
  board_id uuid not null references boards (id) on delete cascade,
  user_id  uuid not null references users (id) on delete cascade,
  primary key (board_id, user_id)
);

create index board_members_user_id_idx on board_members (user_id, board_id);

-- Миграция не должна внезапно закрыть существующим аккаунтам текущие доски.
insert into board_members (board_id, user_id)
select b.id, u.id from boards b cross join users u;
