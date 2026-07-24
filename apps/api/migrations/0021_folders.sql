-- Папки становятся полноценной сущностью: создаются отдельно (можно пустыми),
-- имеют цвет и порядок; доска ссылается на папку по id (перетаскиванием).
create table folders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text,
  position    double precision not null default 1024,
  created_at  timestamptz not null default now()
);

alter table boards add column folder_id uuid references folders (id) on delete set null;

-- Переносим прежние строковые папки (boards.folder) в таблицу folders.
insert into folders (name, position)
select folder, 1024 * row_number() over (order by folder)
  from (select distinct folder from boards where folder is not null) d;

update boards b set folder_id = f.id
  from folders f where b.folder = f.name;

alter table boards drop column folder;
