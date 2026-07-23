#!/bin/sh
# Выкат Plank на сервер одной командой: ./infra/deploy.sh [ssh-host]
# Сборка локально (на VPS не собираем), образ переносится через docker save|load.
set -eu

HOST="${1:-vps3}"
cd "$(dirname "$0")/.."

echo "==> Сборка артефактов"
npm run build -w @plank/api
npm run build -w @plank/web

echo "==> Сборка образа (linux/amd64)"
docker buildx build --platform linux/amd64 -f infra/Dockerfile -t plank:latest --load .

echo "==> Перенос образа на $HOST"
docker save plank:latest | gzip | ssh "$HOST" 'docker load'

echo "==> Конфиги и перезапуск"
scp -q infra/docker-compose.prod.yml "$HOST":/opt/plank/docker-compose.yml
scp -q infra/Caddyfile "$HOST":/opt/plank/Caddyfile
ssh "$HOST" 'cd /opt/plank && docker compose up -d && docker image prune -f >/dev/null'

echo "==> Проверка"
sleep 5
ssh "$HOST" 'cd /opt/plank && docker compose logs app --since 30s 2>&1 | grep -E "миграц|Готово|запущен|rror" | tail -5'
curl -s -o /dev/null -w "https://plank.atank.ru:9443/health → %{http_code}\n" --max-time 15 https://plank.atank.ru:9443/health
