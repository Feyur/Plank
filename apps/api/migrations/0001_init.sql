-- Пользователи. Пароль хранится только как argon2-хэш.
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text not null,
  role          text not null default 'Участник',
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- Email сравниваем без учёта регистра — храним в нижнем регистре и ищем по нему.
create unique index users_email_lower_idx on users (lower(email));
