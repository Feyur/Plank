import { defineConfig } from 'vitest/config';

// Логика доски (перенос карточек) — чистые функции, тестируем в node-окружении.
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
