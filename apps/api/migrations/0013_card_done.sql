-- Признак «задача выполнена»: карточку можно закрыть галочкой, не удаляя.
alter table cards add column done boolean not null default false;
