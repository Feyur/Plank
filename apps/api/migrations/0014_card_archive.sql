-- Архив: карточку можно убрать с доски, не удаляя. archived_at = null — активна,
-- иначе лежит в архиве (и по этой метке сортируем список архива).
alter table cards add column archived_at timestamptz;

create index cards_archived_idx on cards (list_id) where archived_at is not null;
