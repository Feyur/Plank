import { hash, verify } from '@node-rs/argon2';
import { normalizeAvatar } from './avatar';
import { defaultHandleForEmail, normalizeHandle } from './handle';
import type { UserRepo, UserRow } from './auth.repo';
import { isAccessAdminEmail } from '../access/access.policy';

// Пользователь в том виде, в каком его можно отдавать наружу (без хэша пароля).
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  handle: string;
  role: string;
  avatar: string | null;
  canManageAccess: boolean;
}

export type AuthErrorCode = 'EMAIL_TAKEN' | 'HANDLE_TAKEN' | 'INVALID_CREDENTIALS';

export class AuthError extends Error {
  constructor(public code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
  }
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    handle: user.handle,
    role: user.role,
    avatar: user.avatar,
    canManageAccess: isAccessAdminEmail(user.email),
  };
}

interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

export async function registerUser(repo: UserRepo, input: RegisterInput): Promise<PublicUser> {
  const existing = await repo.findByEmail(input.email);
  if (existing) {
    throw new AuthError('EMAIL_TAKEN');
  }

  const passwordHash = await hash(input.password);
  const handle = await findAvailableHandle(repo, defaultHandleForEmail(input.email));
  let user: UserRow;
  try {
    user = await repo.create({ email: input.email, name: input.name, handle, passwordHash });
  } catch (err) {
    if ((err as { code?: string }).code === '23505') throw new AuthError('HANDLE_TAKEN');
    throw err;
  }
  return toPublicUser(user);
}

export async function updateProfile(
  repo: UserRepo,
  userId: string,
  input: { name: string; role: string; handle: string; avatar?: string | null },
): Promise<PublicUser> {
  const handle = normalizeHandle(input.handle);
  const avatar = normalizeAvatar(input.avatar);
  const existing = await repo.findByHandle(handle);
  if (existing && existing.id !== userId) throw new AuthError('HANDLE_TAKEN');

  let user: UserRow;
  try {
    user = await repo.updateProfile(userId, input.name.trim(), input.role.trim(), handle, avatar);
  } catch (err) {
    if ((err as { code?: string }).code === '23505') throw new AuthError('HANDLE_TAKEN');
    throw err;
  }
  return toPublicUser(user);
}

export async function findAvailableHandle(repo: UserRepo, desiredHandle: string): Promise<string> {
  for (let suffix = 1; suffix <= 100; suffix++) {
    const suffixText = suffix === 1 ? '' : `_${suffix}`;
    const handle = `${desiredHandle.slice(0, 32 - suffixText.length)}${suffixText}`;
    if (!(await repo.findByHandle(handle))) return handle;
  }
  throw new AuthError('HANDLE_TAKEN');
}

interface LoginInput {
  email: string;
  password: string;
}

export async function authenticateUser(repo: UserRepo, input: LoginInput): Promise<PublicUser> {
  const user = await repo.findByEmail(input.email);
  if (!user) {
    // Всё равно проверяем «пароль» против настоящего хэша-заглушки, чтобы время
    // ответа не выдавало, существует ли email (защита от перебора аккаунтов).
    await verify(await getDummyHash(), input.password).catch(() => false);
    throw new AuthError('INVALID_CREDENTIALS');
  }

  const ok = await verify(user.password_hash, input.password).catch(() => false);
  if (!ok) {
    throw new AuthError('INVALID_CREDENTIALS');
  }
  return toPublicUser(user);
}

// Реальный argon2-хэш заглушки, считается один раз при первой проверке.
// Нужен только чтобы verify() выполнял ту же работу для несуществующих
// пользователей, что и для существующих (см. authenticateUser).
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hash('plank-timing-safe-dummy');
  }
  return dummyHashPromise;
}
