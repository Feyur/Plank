import { verify } from '@node-rs/argon2';
import { describe, expect, it } from 'vitest';
import type { UserRow } from '../auth/auth.repo';
import { AccessRepoError, type AccessRepo, type ManagedUserInput } from './access.repo';
import { AccessError, createManagedUser, updateManagedUserBoards } from './access.service';

const adminEmails = ['vip@atank.ru', 'web@atank.ru'];

function makeRepo(options?: {
  existingEmail?: string;
  existingHandle?: string;
  missingBoard?: boolean;
}) {
  let created: { input: ManagedUserInput; boardIds: string[] } | null = null;
  let updated: { userId: string; boardIds: string[] } | null = null;
  const repo: AccessRepo = {
    async findUserByEmail(email) {
      if (email.toLowerCase() !== options?.existingEmail?.toLowerCase()) return null;
      return userRow(email, 'existing-hash');
    },
    async findUserByHandle(handle) {
      if (handle.toLowerCase() !== options?.existingHandle?.toLowerCase()) return null;
      return userRow('existing@example.com', 'existing-hash', handle);
    },
    async findUserById(id) {
      return id === 'user-1' ? userRow('person@example.com', 'existing-hash') : null;
    },
    async createUserWithBoards(input, boardIds) {
      if (options?.missingBoard) throw new AccessRepoError('BOARD_NOT_FOUND');
      created = { input, boardIds };
      return userRow(input.email, input.passwordHash, input.handle);
    },
    async listUsersWithBoards() {
      return [];
    },
    async replaceUserBoards(userId, boardIds) {
      if (options?.missingBoard) throw new AccessRepoError('BOARD_NOT_FOUND');
      updated = { userId, boardIds };
    },
  };
  return { repo, created: () => created, updated: () => updated };
}

function userRow(email: string, passwordHash: string, handle = email.split('@')[0]): UserRow {
  return {
    id: 'user-1',
    email: email.toLowerCase(),
    name: email.split('@')[0],
    handle,
    role: 'Участник',
    password_hash: passwordHash,
    created_at: new Date(),
  };
}

describe('createManagedUser', () => {
  it('создаёт аккаунт с хэшем пароля и назначенными досками', async () => {
    const state = makeRepo();
    const user = await createManagedUser(
      state.repo,
      'VIP@ATANK.RU',
      {
        email: 'person@example.com',
        password: 'strong-password',
        handle: 'person',
        boardIds: ['board-1', 'board-2'],
      },
      adminEmails,
    );

    const created = state.created();
    expect(created).not.toBeNull();
    expect(created!.boardIds).toEqual(['board-1', 'board-2']);
    expect(created!.input.passwordHash).not.toBe('strong-password');
    expect(await verify(created!.input.passwordHash, 'strong-password')).toBe(true);
    expect(user).toMatchObject({ email: 'person@example.com', name: 'person', handle: 'person' });
    expect(user).not.toHaveProperty('password_hash');
  });

  it('не разрешает создавать аккаунты обычному пользователю', async () => {
    const state = makeRepo();

    await expect(
      createManagedUser(
        state.repo,
        'person@example.com',
        {
          email: 'new@example.com',
          password: 'strong-password',
          handle: 'new',
          boardIds: ['board-1'],
        },
        adminEmails,
      ),
    ).rejects.toMatchObject({ code: 'NOT_ADMIN' });
    expect(state.created()).toBeNull();
  });

  it('возвращает понятную ошибку для занятого email', async () => {
    const state = makeRepo({ existingEmail: 'person@example.com' });

    await expect(
      createManagedUser(
        state.repo,
        'web@atank.ru',
        {
          email: 'PERSON@example.com',
          password: 'strong-password',
          handle: 'person',
          boardIds: ['board-1'],
        },
        adminEmails,
      ),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  it('не оставляет пользователя, если выбранной доски нет', async () => {
    const state = makeRepo({ missingBoard: true });

    await expect(
      createManagedUser(
        state.repo,
        'vip@atank.ru',
        {
          email: 'new@example.com',
          password: 'strong-password',
          handle: 'new',
          boardIds: ['missing'],
        },
        adminEmails,
      ),
    ).rejects.toBeInstanceOf(AccessError);
  });

  it('заменяет набор досок у обычного пользователя', async () => {
    const state = makeRepo();

    await updateManagedUserBoards(
      state.repo,
      'web@atank.ru',
      'user-1',
      ['board-1', 'board-2'],
      adminEmails,
    );

    expect(state.updated()).toEqual({ userId: 'user-1', boardIds: ['board-1', 'board-2'] });
  });
});
