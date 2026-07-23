#!/bin/sh
# Бэкап Postgres Plank. Запускается НА сервере (cron), кладёт дампы в
# /opt/plank/backups и хранит последние 7 дней. Формат -Fc (custom):
# сжат и восстанавливается выборочно через pg_restore.
set -eu

cd /opt/plank
mkdir -p backups

STAMP=$(date +%Y-%m-%d-%H%M)
FILE="backups/plank-$STAMP.dump"

docker compose exec -T db pg_dump -U plank -d plank -Fc > "$FILE"

# Пустой дамп = что-то сломалось; лучше упасть громко (cron пришлёт mail/лог).
[ -s "$FILE" ] || { echo "backup failed: $FILE is empty" >&2; rm -f "$FILE"; exit 1; }

# Ротация: держим 7 дней.
find backups -name 'plank-*.dump' -mtime +7 -delete

echo "ok: $FILE ($(du -h "$FILE" | cut -f1))"
