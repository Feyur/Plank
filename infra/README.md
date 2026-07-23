# Деплой Plank

Один Node-контейнер отдаёт фронт + API + WebSocket на порту 80, Postgres —
во внутренней docker-сети. Образ собирается локально/в CI (на слабом VPS сборку
не гоняем) и загружается на сервер через `docker load`.

## Первый деплой

```bash
# 1. Собрать артефакты и образ (локально)
npm run build -w @plank/api && npm run build -w @plank/web
docker buildx build --platform linux/amd64 -f infra/Dockerfile -t plank:latest --load .

# 2. Подготовить окружение
cp infra/.env.prod.example infra/.env.prod
#   заполнить: POSTGRES_PASSWORD, DATABASE_URL, AUTH_SECRET (openssl rand -hex 32),
#   COOKIE_SECURE (false для http, true для https), SEED_USERS,
#   ACCESS_ADMIN_EMAILS (кто создаёт аккаунты и назначает доски).

# 3. Перенести образ и конфиг на сервер
docker save plank:latest | gzip | ssh SERVER 'docker load'
scp infra/docker-compose.prod.yml SERVER:/opt/plank/docker-compose.yml
scp infra/.env.prod              SERVER:/opt/plank/.env

# 4. Запустить (нужен docker compose v2 на сервере)
ssh SERVER 'cd /opt/plank && docker compose up -d'
```

`CMD` контейнера сам применяет миграции и заводит аккаунты из `SEED_USERS`.

## Обновление

Пересобрать образ (шаг 1), перенести (шаг 3), затем:

```bash
ssh SERVER 'cd /opt/plank && docker compose up -d'
```

## Бэкапы

На сервере: `/opt/plank/backup.sh` (копия — [backup.sh](backup.sh)) делает
`pg_dump -Fc` в `/opt/plank/backups/`, хранит 7 дней; cron — ежедневно в 03:30,
лог в `backups/backup.log`. Забрать offsite-копию на свою машину:

```bash
./infra/backup-pull.sh          # rsync в ~/Backups/plank
```

Восстановление: `docker compose exec -T db pg_restore -U plank -d plank < дамп`
(в пустую базу; проверено на plank_verify).

## HTTPS

Для боевого использования нужен домен и TLS. Варианты:

- Порт 443 свободен → поставить перед `app` Caddy/nginx с Let's Encrypt,
  `app` не публиковать наружу, `COOKIE_SECURE=true`.
- Порт 443 занят → TLS на другом порту или через DNS-01 challenge.

Пока порт 80/http — только для превью, пароли идут в открытом виде.
