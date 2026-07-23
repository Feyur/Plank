-- Порядок досок в списке (дробный, как у списков/карточек).
alter table boards add column position double precision;

-- Начальные позиции существующим доскам — по времени создания.
with ordered as (
  select id, row_number() over (order by created_at) * 1024 as pos from boards
)
update boards b set position = o.pos from ordered o where o.id = b.id;

alter table boards alter column position set not null;
