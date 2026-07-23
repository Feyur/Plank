import { hash } from '@node-rs/argon2';
import { pool } from './db';
import { defaultHandleForEmail } from './features/auth/handle';

// Заводит стартовых пользователей из SEED_USERS: "email:пароль:Имя;email2:...".
// Существующих не трогает. Нужен для закрытой регистрации на проде.
async function seed(): Promise<void> {
  const spec = process.env.SEED_USERS?.trim();
  if (!spec) {
    console.log('SEED_USERS не задан — пропускаю сидинг.');
    return;
  }

  for (const entry of spec
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)) {
    const [email, password, ...nameParts] = entry.split(':');
    if (!email || !password) {
      console.warn(`Пропущена запись без email/пароля: ${entry}`);
      continue;
    }
    const name = nameParts.join(':').trim() || email;

    const existing = await pool.query('select 1 from users where lower(email) = lower($1)', [
      email,
    ]);
    if (existing.rows.length > 0) {
      console.log(`Пользователь уже есть: ${email}`);
      continue;
    }
    const passwordHash = await hash(password);
    await pool.query(
      'insert into users (email, name, handle, password_hash) values (lower($1), $2, $3, $4)',
      [email, name, defaultHandleForEmail(email), passwordHash],
    );
    console.log(`Создан пользователь: ${email}`);
  }
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
