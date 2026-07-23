-- Необязательное время срока в формате 'HH:MM'. Дату держим строкой-датой
-- (без TZ-сдвигов), поэтому время — отдельным полем, а не timestamptz.
alter table cards add column due_time text;
