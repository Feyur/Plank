-- У карточки может быть несколько меток: переходим с cards.label_id на m2m.
create table card_labels (
  card_id  uuid not null references cards (id) on delete cascade,
  label_id uuid not null references labels (id) on delete cascade,
  primary key (card_id, label_id)
);

-- Переносим уже назначенные метки.
insert into card_labels (card_id, label_id)
select id, label_id from cards where label_id is not null;

alter table cards drop column label_id;
