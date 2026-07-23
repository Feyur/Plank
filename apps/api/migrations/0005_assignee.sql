-- Ответственный за карточку (один пользователь; null — не назначен).
alter table cards add column assignee_id uuid references users (id) on delete set null;
