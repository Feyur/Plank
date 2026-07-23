import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pool } from './db';

// Простой раннер миграций: применяет по порядку все *.sql из migrations/,
// которые ещё не применялись. Каждая — в своей транзакции.
const migrationsDir = join(__dirname, '..', 'migrations');

async function migrate(): Promise<void> {
  await pool.query(
    `create table if not exists schema_migrations (
       name text primary key,
       applied_at timestamptz not null default now()
     )`,
  );

  const applied = new Set(
    (await pool.query<{ name: string }>('select name from schema_migrations')).rows.map(
      (row) => row.name,
    ),
  );

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into schema_migrations (name) values ($1)', [file]);
      await client.query('commit');
      console.log(`Применена миграция: ${file}`);
      count++;
    } catch (err) {
      await client.query('rollback');
      throw new Error(`Миграция ${file} упала: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }

  console.log(count === 0 ? 'Новых миграций нет.' : `Готово, применено: ${count}.`);
}

migrate()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
