import { defineConfig } from 'vitest/config';

// Тестовые значения окружения, чтобы config не падал и тесты не зависели
// от реального .env и живой БД. Health-роут и юнит-тесты сервиса к Postgres
// не обращаются.
export default defineConfig({
  test: {
    env: {
      DATABASE_URL: 'postgres://plank:test@localhost:5432/plank_test',
      AUTH_SECRET: 'test-secret-not-for-production',
    },
  },
});
