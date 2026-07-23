import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { useBoards } from '../board/BoardsContext';
import { createUser, fetchManagedUsers, updateUserBoards, type ManagedUser } from './accessApi';

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const handlePattern = /^[a-zа-яё0-9_]{3,32}$/i;

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 6,
  color: 'var(--color-text-secondary)',
  fontSize: 12,
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  width: '100%',
  height: 40,
  marginBottom: 16,
  padding: '0 13px',
  border: '1px solid var(--color-input-border)',
  borderRadius: 10,
  outline: 'none',
  background: 'var(--color-input-bg)',
  color: 'var(--color-text)',
  font: 'var(--text-ui)',
};

type BoardOption = { id: string; title: string };

function handleFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? '';
  return localPart
    .toLocaleLowerCase()
    .replace(/[^a-zа-яё0-9_]/gi, '_')
    .replace(/^_+|_+$/g, '')
    .padEnd(3, '0')
    .slice(0, 32);
}

export function AddUserModal({ onClose }: { onClose: () => void }) {
  const { boards, currentId } = useBoards();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>(currentId ? [currentId] : []);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadUsers() {
    setUsersError(null);
    try {
      const data = await fetchManagedUsers();
      setUsers(data.users);
    } catch {
      setUsersError('Не удалось загрузить список. Проверьте соединение и повторите.');
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function toggleBoard(boardId: string) {
    setSelectedBoardIds((current) =>
      current.includes(boardId) ? current.filter((id) => id !== boardId) : [...current, boardId],
    );
  }

  function changeEmail(value: string) {
    const previousDefault = handleFromEmail(email);
    setEmail(value);
    if (!handle || handle === previousDefault) setHandle(handleFromEmail(value));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedEmail = email.trim();
    const normalizedHandle = handle.trim().replace(/^@+/, '').toLocaleLowerCase();
    if (!emailPattern.test(normalizedEmail)) {
      setError('Введите корректный email');
      return;
    }
    if (!handlePattern.test(normalizedHandle)) {
      setError('Ник: 3–32 буквы, цифры или _');
      return;
    }
    if (password.length < 8) {
      setError('Пароль должен быть не короче 8 символов');
      return;
    }
    if (selectedBoardIds.length === 0) {
      setError('Выберите хотя бы одну доску');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createUser(normalizedEmail, password, normalizedHandle, selectedBoardIds);
      await loadUsers();
      toast(`Аккаунт ${normalizedEmail} создан`);
      setEmail('');
      setPassword('');
      setHandle('');
      setSelectedBoardIds(currentId ? [currentId] : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось создать аккаунт');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveBoards(userId: string, boardIds: string[]) {
    await updateUserBoards(userId, boardIds);
    await loadUsers();
    setEditingUser(null);
    toast('Доступ к доскам обновлён');
  }

  return (
    <div
      onClick={onClose}
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '72px 20px',
        background: 'var(--overlay-modal)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
        style={{
          width: 540,
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 120px)',
          overflow: 'auto',
          padding: 24,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-modal)',
          background: 'var(--color-surface)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 22 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 5px', fontSize: 18, fontWeight: 800 }}>Люди и доступы</h2>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 13 }}>
              Создайте аккаунт или измените, какие доски уже добавленный человек видит.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть" style={closeButtonStyle}>
            ×
          </button>
        </div>

        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>Добавить человека</div>
        <label style={labelStyle} htmlFor="access-user-email">
          Email
        </label>
        <input
          id="access-user-email"
          type="email"
          value={email}
          onChange={(event) => changeEmail(event.target.value)}
          autoComplete="off"
          placeholder="person@company.ru"
          autoFocus
          style={inputStyle}
        />

        <label style={labelStyle} htmlFor="access-user-handle">
          Ник для упоминаний
        </label>
        <div style={{ position: 'relative' }}>
          <span style={atSignStyle}>@</span>
          <input
            id="access-user-handle"
            value={handle}
            onChange={(event) => setHandle(event.target.value.replace(/^@+/, ''))}
            autoCapitalize="none"
            placeholder="например, maria"
            style={{ ...inputStyle, paddingLeft: 27 }}
          />
        </div>

        <label style={labelStyle} htmlFor="access-user-password">
          Пароль
        </label>
        <input
          id="access-user-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="Минимум 8 символов"
          style={inputStyle}
        />

        <BoardPicker boards={boards} selectedBoardIds={selectedBoardIds} onToggle={toggleBoard} />

        {error && (
          <p role="alert" style={errorStyle}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 22 }}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            Закрыть
          </button>
          <button
            type="submit"
            disabled={submitting || boards.length === 0}
            style={{
              ...primaryButtonStyle,
              opacity: submitting || boards.length === 0 ? 0.55 : 1,
              cursor: submitting || boards.length === 0 ? 'default' : 'pointer',
            }}
          >
            {submitting ? 'Создание…' : 'Создать аккаунт'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Уже добавлены</div>
          {usersLoading ? (
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 13 }}>
              Загрузка списка…
            </p>
          ) : usersError ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ margin: 0, color: 'var(--color-danger)', fontSize: 13 }}>{usersError}</p>
              <button type="button" onClick={loadUsers} style={retryButtonStyle}>
                Повторить
              </button>
            </div>
          ) : users.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 13 }}>
              Пока никто не добавлен.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {users.map((user) => (
                <div
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 11px',
                    border: '1px solid var(--color-border-soft)',
                    borderRadius: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: 'var(--color-text)',
                        font: 'var(--text-ui)',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {user.email}{' '}
                      <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>
                        @{user.handle}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: 3,
                        color: 'var(--color-text-muted)',
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {user.canManageAccess
                        ? 'Все доски — администратор доступа'
                        : boardTitles(user.boardIds, boards) || 'Нет доступных досок'}
                    </div>
                  </div>
                  {!user.canManageAccess && (
                    <button
                      type="button"
                      onClick={() => setEditingUser(user)}
                      style={{
                        ...secondaryButtonStyle,
                        height: 34,
                        padding: '0 10px',
                        flexShrink: 0,
                      }}
                    >
                      Доски
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      {editingUser && (
        <EditBoardsDialog
          user={editingUser}
          boards={boards}
          onClose={() => setEditingUser(null)}
          onSave={saveBoards}
        />
      )}
    </div>
  );
}

function EditBoardsDialog({
  user,
  boards,
  onClose,
  onSave,
}: {
  user: ManagedUser;
  boards: BoardOption[];
  onClose: () => void;
  onSave: (userId: string, boardIds: string[]) => Promise<void>;
}) {
  const [selectedBoardIds, setSelectedBoardIds] = useState(user.boardIds);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleBoard(boardId: string) {
    setSelectedBoardIds((current) =>
      current.includes(boardId) ? current.filter((id) => id !== boardId) : [...current, boardId],
    );
  }

  async function save() {
    if (
      selectedBoardIds.length === 0 &&
      !window.confirm('У человека не останется ни одной доступной доски. Сохранить?')
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(user.id, selectedBoardIds);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось обновить доступ');
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'var(--overlay-modal)',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 430,
          maxWidth: '100%',
          padding: 22,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-modal)',
          background: 'var(--color-surface)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <h3 style={{ margin: '0 0 5px', fontSize: 17 }}>Доступные доски</h3>
        <p style={{ margin: '0 0 18px', color: 'var(--color-text-muted)', fontSize: 13 }}>
          {user.email} · @{user.handle}
        </p>
        <BoardPicker boards={boards} selectedBoardIds={selectedBoardIds} onToggle={toggleBoard} />
        {error && (
          <p role="alert" style={errorStyle}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            Отмена
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              ...primaryButtonStyle,
              opacity: saving ? 0.55 : 1,
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BoardPicker({
  boards,
  selectedBoardIds,
  onToggle,
}: {
  boards: BoardOption[];
  selectedBoardIds: string[];
  onToggle: (boardId: string) => void;
}) {
  return (
    <fieldset style={{ margin: '0 0 18px', padding: 0, border: 'none' }}>
      <legend style={{ ...labelStyle, padding: 0 }}>Доступные доски</legend>
      <div
        className="scrl"
        style={{
          maxHeight: 190,
          overflow: 'auto',
          border: '1px solid var(--color-border)',
          borderRadius: 10,
        }}
      >
        {boards.map((board) => (
          <label
            key={board.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minHeight: 42,
              padding: '8px 12px',
              borderBottom: '1px solid var(--color-border-soft)',
              color: 'var(--color-text-secondary-strong)',
              font: 'var(--text-ui)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={selectedBoardIds.includes(board.id)}
              onChange={() => onToggle(board.id)}
              style={{ accentColor: 'var(--color-accent)' }}
            />
            {board.title}
          </label>
        ))}
        {boards.length === 0 && (
          <p style={{ margin: 0, padding: 14, color: 'var(--color-text-muted)', fontSize: 13 }}>
            Сначала создайте доску.
          </p>
        )}
      </div>
    </fieldset>
  );
}

function boardTitles(ids: string[], boards: BoardOption[]): string {
  return ids
    .map((id) => boards.find((board) => board.id === id)?.title)
    .filter((title): title is string => Boolean(title))
    .join(', ');
}

const closeButtonStyle: CSSProperties = {
  width: 30,
  height: 30,
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--color-text-muted)',
  cursor: 'pointer',
  fontSize: 20,
  lineHeight: 1,
};

const atSignStyle: CSSProperties = {
  position: 'absolute',
  left: 13,
  top: 11,
  color: 'var(--color-text-muted)',
  font: 'var(--text-ui)',
};

const errorStyle: CSSProperties = {
  margin: '0 0 14px',
  color: 'var(--color-danger)',
  fontSize: 12.5,
  fontWeight: 600,
};

const retryButtonStyle: CSSProperties = {
  border: 'none',
  padding: 0,
  background: 'none',
  color: 'var(--color-accent)',
  font: 'var(--text-secondary)',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle: CSSProperties = {
  height: 40,
  padding: '0 16px',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  background: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  font: 'var(--text-ui)',
  cursor: 'pointer',
};

const primaryButtonStyle: CSSProperties = {
  height: 40,
  padding: '0 20px',
  border: 'none',
  borderRadius: 10,
  background: 'var(--color-accent)',
  color: '#fff',
  font: 'var(--text-ui)',
  fontWeight: 700,
  boxShadow: 'var(--shadow-accent-button)',
};
