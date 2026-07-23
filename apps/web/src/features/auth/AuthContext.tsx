import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, apiFetch } from '../../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  handle: string;
  role: string;
  avatar: string | null;
  canManageAccess: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateProfile: (
    name: string,
    role: string,
    handle: string,
    avatar: string | null,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // При загрузке проверяем, есть ли живая сессия.
  useEffect(() => {
    apiFetch<{ user: User }>('/auth/me')
      .then((data) => setUser(data.user))
      .catch((err) => {
        // 401 — просто нет сессии, это не ошибка.
        if (!(err instanceof ApiError) || err.status !== 401) {
          console.error('Не удалось проверить сессию:', err);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const data = await apiFetch<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
  }

  async function register(name: string, email: string, password: string) {
    const data = await apiFetch<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setUser(data.user);
  }

  async function updateProfile(name: string, role: string, handle: string, avatar: string | null) {
    const data = await apiFetch<{ user: User }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ name, role, handle, avatar }),
    });
    setUser(data.user);
  }

  async function logout() {
    // Выходим локально в любом случае — даже если запрос не прошёл.
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      /* игнорируем: главное — сбросить пользователя на клиенте */
    }
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth используется вне AuthProvider');
  return ctx;
}
