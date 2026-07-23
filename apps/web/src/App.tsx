// Точка сборки: провайдер авторизации + гейт.
// Нет сессии → экран входа; есть → оболочка приложения.

import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { LoginScreen } from './features/auth/LoginScreen';
import { BoardsProvider } from './features/board/BoardsContext';
import { ToastProvider } from './lib/toast';
import { Shell } from './Shell';

function Gate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
          font: 'var(--text-ui)',
        }}
      >
        Загрузка…
      </div>
    );
  }

  return user ? (
    <BoardsProvider>
      <Shell />
    </BoardsProvider>
  ) : (
    <LoginScreen />
  );
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  );
}
