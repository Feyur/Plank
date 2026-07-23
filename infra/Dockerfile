# Прод-образ Plank: один Node-сервис отдаёт и собранный фронт, и API/WS.
# Артефакты (apps/api/dist, apps/web/dist) собираются локально/в CI до сборки
# образа — на слабом VPS сборку не гоняем. В контейнере ставим только
# прод-зависимости API (в т.ч. linux-бинарь argon2).
FROM node:22-alpine
WORKDIR /app

# Только прод-зависимости API. package.json API самодостаточный (не workspace),
# поэтому обычный npm install ставит именно нужное, без веб-зависимостей.
COPY apps/api/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

COPY apps/api/dist ./dist
COPY apps/api/migrations ./migrations
COPY apps/web/dist ./web

ENV NODE_ENV=production
ENV WEB_DIR=/app/web
ENV API_PORT=3000
EXPOSE 3000

# Миграции → сидинг стартовых аккаунтов → запуск.
CMD ["sh", "-c", "node dist/migrate.js && node dist/seed.js && node dist/index.js"]
