// Оболочка: хедер (логотип слева, тема и профиль справа) + сайдбар (доски,
// заметки) + область экрана. Между экранами переключаемся состоянием view.

import { useState, type ReactNode } from 'react';
import { AddUserModal } from './features/access/AddUserModal';
import { useAuth } from './features/auth/AuthContext';
import { ProfileModal } from './features/auth/ProfileModal';
import { BoardScreen } from './features/board/BoardScreen';
import { BoardsNav } from './features/board/BoardsNav';
import { DailyScreen } from './features/daily/DailyScreen';
import { NotesScreen } from './features/notes/NotesScreen';
import { NotificationBell } from './features/notifications/NotificationBell';
import { triggerRefresh } from './features/realtime/refreshBus';
import { Avatar } from './lib/avatar';
import { currentTheme, toggleTheme, type Theme } from './lib/theme';
import { useIsMobile } from './lib/useIsMobile';

type View = 'board' | 'daily' | 'notes';

export function Shell() {
  const [view, setView] = useState<View>('board');
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // На мобиле выбор доски/заметок закрывает выезжающее меню.
  function go(next: View) {
    setView(next);
    setDrawerOpen(false);
  }

  const sidebar = (
    <nav
      style={{
        width: 232,
        flexShrink: 0,
        padding: '14px 10px',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        ...(isMobile
          ? { position: 'fixed', top: 54, bottom: 0, left: 0, zIndex: 80, boxShadow: 'var(--shadow-dropdown)' }
          : {}),
      }}
    >
      <BoardsNav open={view === 'board'} onOpen={() => go('board')} />
      <div style={{ height: 1, background: 'var(--color-border)', margin: '10px 4px' }} />
      <NavItem
        active={view === 'daily'}
        onClick={() => go('daily')}
        label="Дейли"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" strokeLinecap="round" />
          </svg>
        }
      />
      <NavItem active={view === 'notes'} onClick={() => go('notes')} label="Мои заметки" />
    </nav>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          height: 54,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 16px 0 14px',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {isMobile && (
          <button
            type="button"
            onClick={() => setDrawerOpen((o) => !o)}
            aria-label="Меню"
            style={{
              width: 36,
              height: 36,
              border: 'none',
              borderRadius: 9,
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className="brand-mark"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: 'var(--color-accent-gradient)',
              boxShadow: '0 3px 10px rgba(91,91,214,.34)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 14 14" aria-hidden="true">
              <rect className="brand-bar brand-bar-1" x="2" y="2" width="4" height="10" rx="1.3" fill="#fff" opacity=".96" />
              <rect className="brand-bar brand-bar-2" x="8" y="2" width="4" height="7" rx="1.3" fill="#fff" opacity=".76" />
            </svg>
          </div>
          <span className="brand-word" style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em' }}>
            Plank
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <RefreshButton />
        <ThemeButton />
        <NotificationBell />
        <UserMenu />
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {!isMobile && sidebar}
        {isMobile && drawerOpen && (
          <>
            <div
              onClick={() => setDrawerOpen(false)}
              style={{ position: 'fixed', inset: '54px 0 0 0', background: 'var(--overlay-modal)', zIndex: 79 }}
            />
            {sidebar}
          </>
        )}

        <main
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            padding: isMobile ? '14px 12px' : 'var(--space-screen)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {view === 'board' ? (
            <BoardScreen />
          ) : view === 'daily' ? (
            <DailyScreen />
          ) : (
            <NotesScreen />
          )}
        </main>
      </div>
    </div>
  );
}

function NavItem({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        width: '100%',
        height: 34,
        padding: '0 8px',
        border: 'none',
        borderRadius: 8,
        background: active ? 'var(--color-border-soft)' : 'transparent',
        color: active ? 'var(--color-text)' : 'var(--color-text-secondary)',
        font: 'var(--text-ui)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {icon ?? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
        >
          <path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
          <polyline points="14 4 14 9 19 9" />
        </svg>
      )}
      {label}
    </button>
  );
}

// Кнопка «Обновить»: тянет актуальное состояние всех экранов (мини-синхронизация).
function RefreshButton() {
  const [spinning, setSpinning] = useState(false);

  function refresh() {
    triggerRefresh();
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 700);
  }

  return (
    <button
      type="button"
      onClick={refresh}
      aria-label="Обновить"
      title="Обновить"
      style={{
        width: 36,
        height: 36,
        border: '1px solid var(--color-input-border)',
        borderRadius: 9,
        background: 'var(--color-surface)',
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        className={spinning ? 'spin' : undefined}
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <polyline points="21 3 21 9 15 9" />
      </svg>
    </button>
  );
}

// Кнопка темы в хедере: луна в светлой, солнце в тёмной.
function ThemeButton() {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(toggleTheme())}
      aria-label={dark ? 'Светлая тема' : 'Тёмная тема'}
      title={dark ? 'Светлая тема' : 'Тёмная тема'}
      style={{
        width: 36,
        height: 36,
        border: '1px solid var(--color-input-border)',
        borderRadius: 9,
        background: 'var(--color-surface)',
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {dark ? (
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
        >
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
        </svg>
      )}
    </button>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Меню пользователя"
        style={{
          width: 34,
          height: 34,
          padding: 0,
          border: 'none',
          borderRadius: '50%',
          background: 'transparent',
          cursor: 'pointer',
          boxShadow: open ? 'var(--focus-ring)' : 'none',
        }}
      >
        <Avatar id={user?.id ?? ''} name={user?.name ?? ''} avatar={user?.avatar} size={34} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 232,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-dropdown)',
              zIndex: 95,
              padding: 8,
            }}
          >
            <div style={{ padding: '4px 8px 10px' }}>
              <div
                style={{
                  font: 'var(--text-ui)',
                  color: 'var(--color-text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.email} · {user?.role}
              </div>
            </div>
            {user?.canManageAccess && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setAddUserOpen(true);
                }}
                style={menuItemStyle('var(--color-text)')}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                >
                  <circle cx="9" cy="8" r="3.5" />
                  <path d="M3 20c0-3.5 2.7-6 6-6 1.4 0 2.7.4 3.7 1.2" />
                  <path d="M18 11v8M14 15h8" />
                </svg>
                Люди и доступы
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setProfileOpen(true);
              }}
              style={menuItemStyle('var(--color-text)')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              Настройки профиля
            </button>
            <button type="button" onClick={logout} style={menuItemStyle('var(--color-danger)')}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Выйти
            </button>
          </div>
        </>
      )}

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
      {addUserOpen && <AddUserModal onClose={() => setAddUserOpen(false)} />}
    </div>
  );
}

function menuItemStyle(color: string) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    height: 34,
    padding: '0 8px',
    border: 'none',
    borderRadius: 8,
    background: 'transparent',
    color,
    font: 'var(--text-ui)',
    cursor: 'pointer',
    textAlign: 'left' as const,
  };
}
