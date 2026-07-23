-- Аватар пользователя: либо пресет (`preset:<key>`), либо загруженная картинка
-- в виде data-URL (`data:image/...`). null — показываем инициалы, как раньше.
alter table users add column avatar text;
