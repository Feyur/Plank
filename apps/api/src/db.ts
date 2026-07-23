import { Pool, types } from 'pg';
import { config } from './config';

// Колонки date отдаём строкой 'YYYY-MM-DD' как есть. По умолчанию pg парсит
// их в JS Date в локальной таймзоне: в JSON уезжает ISO-таймстамп, и день
// может сдвинуться (2026-07-15 → '2026-07-14T21:00:00.000Z' при UTC+3).
types.setTypeParser(types.builtins.DATE, (value) => value);

// Один пул соединений на приложение. max держим небольшим — под VPS ~1 GB
// и max_connections=30 у Postgres (см. docker-compose.yml).
export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
});
