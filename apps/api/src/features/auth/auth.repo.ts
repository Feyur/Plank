import { pool } from '../../db';

// Строка пользователя как в БД (с хэшем пароля — наружу не отдаётся).
export interface UserRow {
  id: string;
  email: string;
  name: string;
  handle: string;
  role: string;
  avatar: string | null;
  password_hash: string;
  created_at: Date;
}

export interface NewUser {
  email: string;
  name: string;
  handle: string;
  passwordHash: string;
}

// Сервис зависит от этого интерфейса, а не от Postgres напрямую —
// так его логику можно проверять с фейковым репозиторием без БД.
export interface UserRepo {
  findByEmail(email: string): Promise<UserRow | null>;
  findByHandle(handle: string): Promise<UserRow | null>;
  findById(id: string): Promise<UserRow | null>;
  create(input: NewUser): Promise<UserRow>;
  updateProfile(
    id: string,
    name: string,
    role: string,
    handle: string,
    avatar: string | null,
  ): Promise<UserRow>;
}

export const pgUserRepo: UserRepo = {
  async findByEmail(email) {
    const { rows } = await pool.query<UserRow>(
      'select * from users where lower(email) = lower($1)',
      [email],
    );
    return rows[0] ?? null;
  },

  async findByHandle(handle) {
    const { rows } = await pool.query<UserRow>(
      'select * from users where lower(handle) = lower($1)',
      [handle],
    );
    return rows[0] ?? null;
  },

  async findById(id) {
    const { rows } = await pool.query<UserRow>('select * from users where id = $1', [id]);
    return rows[0] ?? null;
  },

  async create({ email, name, handle, passwordHash }) {
    const { rows } = await pool.query<UserRow>(
      `insert into users (email, name, handle, password_hash)
       values (lower($1), $2, lower($3), $4)
       returning *`,
      [email, name, handle, passwordHash],
    );
    return rows[0];
  },

  async updateProfile(id, name, role, handle, avatar) {
    const { rows } = await pool.query<UserRow>(
      `update users set name = $2, role = $3, handle = lower($4), avatar = $5
       where id = $1 returning *`,
      [id, name, role, handle, avatar],
    );
    return rows[0];
  },
};
