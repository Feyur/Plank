import { hash } from '@node-rs/argon2';
import { config } from '../../config';
import { normalizeHandle } from '../auth/handle';
import { toPublicUser, type PublicUser } from '../auth/auth.service';
import { AccessRepoError, type AccessRepo, type ManagedUserRow } from './access.repo';
import { isAccessAdminEmail } from './access.policy';

export type AccessErrorCode =
  | 'NOT_ADMIN'
  | 'EMAIL_TAKEN'
  | 'HANDLE_TAKEN'
  | 'BOARD_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'PROTECTED_USER';

export class AccessError extends Error {
  constructor(public code: AccessErrorCode) {
    super(code);
    this.name = 'AccessError';
  }
}

export interface ManagedUser extends PublicUser {
  boardIds: string[];
}

function toManagedUser(row: ManagedUserRow): ManagedUser {
  return { ...toPublicUser(row), boardIds: row.board_ids };
}

export async function createManagedUser(
  repo: AccessRepo,
  actorEmail: string,
  input: { email: string; password: string; handle: string; boardIds: string[] },
  adminEmails: string[] = config.accessAdminEmails,
): Promise<PublicUser> {
  if (!isAccessAdminEmail(actorEmail, adminEmails)) {
    throw new AccessError('NOT_ADMIN');
  }
  if (await repo.findUserByEmail(input.email)) {
    throw new AccessError('EMAIL_TAKEN');
  }

  const handle = normalizeHandle(input.handle);
  if (await repo.findUserByHandle(handle)) throw new AccessError('HANDLE_TAKEN');

  const boardIds = [...new Set(input.boardIds)];
  const passwordHash = await hash(input.password);
  const name = input.email.split('@')[0].slice(0, 100);

  try {
    const user = await repo.createUserWithBoards(
      { email: input.email, name, handle, passwordHash },
      boardIds,
    );
    return toPublicUser(user);
  } catch (err) {
    if (err instanceof AccessRepoError) {
      throw new AccessError(err.code);
    }
    throw err;
  }
}

export async function listManagedUsers(
  repo: AccessRepo,
  actorEmail: string,
  adminEmails: string[] = config.accessAdminEmails,
): Promise<ManagedUser[]> {
  if (!isAccessAdminEmail(actorEmail, adminEmails)) throw new AccessError('NOT_ADMIN');
  return (await repo.listUsersWithBoards()).map(toManagedUser);
}

export async function updateManagedUserBoards(
  repo: AccessRepo,
  actorEmail: string,
  userId: string,
  boardIds: string[],
  adminEmails: string[] = config.accessAdminEmails,
): Promise<void> {
  if (!isAccessAdminEmail(actorEmail, adminEmails)) throw new AccessError('NOT_ADMIN');
  const user = await repo.findUserById(userId);
  if (!user) throw new AccessError('USER_NOT_FOUND');
  if (isAccessAdminEmail(user.email, adminEmails)) throw new AccessError('PROTECTED_USER');

  try {
    await repo.replaceUserBoards(userId, [...new Set(boardIds)]);
  } catch (err) {
    if (err instanceof AccessRepoError) throw new AccessError(err.code);
    throw err;
  }
}
