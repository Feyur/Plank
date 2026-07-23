import { describe, it, expect } from 'vitest';
import type { NewUser, UserRepo, UserRow } from './auth.repo';
import { AuthError, authenticateUser, registerUser } from './auth.service';

// Фейковый репозиторий в памяти — тесты не зависят от Postgres и друг от друга.
function makeRepo(): UserRepo {
  const users: UserRow[] = [];
  return {
    async findByEmail(email) {
      return users.find((u) => u.email === email.toLowerCase()) ?? null;
    },
    async findByHandle(handle) {
      return users.find((u) => u.handle === handle.toLowerCase()) ?? null;
    },
    async findById(id) {
      return users.find((u) => u.id === id) ?? null;
    },
    async create(input: NewUser) {
      const row: UserRow = {
        id: String(users.length + 1),
        email: input.email.toLowerCase(),
        name: input.name,
        handle: input.handle,
        role: 'Участник',
        avatar: null,
        password_hash: input.passwordHash,
        created_at: new Date(),
      };
      users.push(row);
      return row;
    },
    async updateProfile(id, name, role, handle, avatar) {
      const row = users.find((u) => u.id === id)!;
      row.name = name;
      row.role = role;
      row.handle = handle;
      row.avatar = avatar;
      return row;
    },
  };
}

const validInput = { email: 'lead@plank.app', name: 'Лиана', password: 'super-secret-1' };

describe('registerUser', () => {
  it('создаёт пользователя и не возвращает хэш пароля', async () => {
    const repo = makeRepo();
    const user = await registerUser(repo, validInput);

    expect(user).toMatchObject({
      email: 'lead@plank.app',
      name: 'Лиана',
      handle: 'lead',
      role: 'Участник',
    });
    expect(user).not.toHaveProperty('password_hash');
    expect(user.id).toBeTruthy();
  });

  it('отклоняет повторную регистрацию того же email (без учёта регистра)', async () => {
    const repo = makeRepo();
    await registerUser(repo, validInput);

    await expect(
      registerUser(repo, { ...validInput, email: 'LEAD@plank.app' }),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });
});

describe('authenticateUser', () => {
  it('пускает с правильным паролем', async () => {
    const repo = makeRepo();
    await registerUser(repo, validInput);

    const user = await authenticateUser(repo, {
      email: 'lead@plank.app',
      password: 'super-secret-1',
    });
    expect(user.email).toBe('lead@plank.app');
  });

  it('отклоняет неправильный пароль', async () => {
    const repo = makeRepo();
    await registerUser(repo, validInput);

    await expect(
      authenticateUser(repo, { email: 'lead@plank.app', password: 'wrong' }),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it('отклоняет несуществующий email тем же кодом, что и неверный пароль', async () => {
    const repo = makeRepo();

    await expect(
      authenticateUser(repo, { email: 'nobody@plank.app', password: 'whatever' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });
});
