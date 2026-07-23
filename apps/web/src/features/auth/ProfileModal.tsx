import { useRef, useState } from 'react';
import { ApiError } from '../../lib/api';
import { Avatar, AVATAR_PRESETS, fileToAvatarDataUrl } from '../../lib/avatar';
import { useAuth } from './AuthContext';

const fieldLabel = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--color-text-secondary)',
  marginBottom: 6,
  display: 'block',
};

const inputStyle = {
  width: '100%',
  height: 40,
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '0 13px',
  font: 'var(--text-ui)',
  color: 'var(--color-text)',
  outline: 'none',
  marginBottom: 16,
} as const;

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [role, setRole] = useState(user?.role ?? '');
  const [handle, setHandle] = useState(user?.handle ?? '');
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const userId = user?.id ?? '';
  const normalizedHandle = handle.trim().replace(/^@+/, '').toLocaleLowerCase();
  const dirty =
    name.trim() !== user?.name ||
    role.trim() !== user?.role ||
    normalizedHandle !== user?.handle ||
    avatar !== (user?.avatar ?? null);

  const uploaded = avatar?.startsWith('data:') ? avatar : null;

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // чтобы можно было выбрать тот же файл повторно
    if (!file) return;
    try {
      setAvatar(await fileToAvatarDataUrl(file));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить картинку');
    }
  }

  async function save() {
    if (!name.trim() || !role.trim() || !/^[a-zа-яё0-9_]{3,32}$/i.test(normalizedHandle)) {
      setError('Заполните имя и роль; ник — 3–32 буквы, цифры или _');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile(name.trim(), role.trim(), normalizedHandle, avatar);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить');
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-modal)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '90px 20px',
        zIndex: 110,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          maxWidth: '100%',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-modal)',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: 'var(--color-accent-gradient)',
            padding: '22px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              boxShadow: '0 0 0 3px rgba(255,255,255,.35)',
            }}
          >
            <Avatar id={userId} name={name || user?.name || '—'} avatar={avatar} size={56} />
          </div>
          <div style={{ color: '#fff' }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{name || 'Профиль'}</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>{user?.email}</div>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <span style={fieldLabel}>Аватар</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            <AvatarTile selected={avatar === null} onClick={() => setAvatar(null)}>
              <Avatar id={userId} name={name || user?.name || '—'} avatar={null} size={38} />
            </AvatarTile>

            {AVATAR_PRESETS.map((preset) => {
              const value = `preset:${preset.key}`;
              return (
                <AvatarTile
                  key={preset.key}
                  selected={avatar === value}
                  onClick={() => setAvatar(value)}
                  title={preset.label}
                >
                  <Avatar id={userId} name={preset.label} avatar={value} size={38} />
                </AvatarTile>
              );
            })}

            {uploaded && (
              <AvatarTile selected title="Загруженное фото" onClick={() => undefined}>
                <Avatar id={userId} name="Фото" avatar={uploaded} size={38} />
              </AvatarTile>
            )}

            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              title="Загрузить фото"
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                border: '1.5px dashed var(--color-border-hover)',
                background: 'var(--color-border-soft)',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onFile}
              style={{ display: 'none' }}
            />
          </div>

          <label style={fieldLabel} htmlFor="profile-name">
            Имя
          </label>
          <input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Как вас зовут"
            style={inputStyle}
          />

          <label style={fieldLabel} htmlFor="profile-role">
            Роль
          </label>
          <input
            id="profile-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Например: Тимлид, Дизайнер"
            style={inputStyle}
          />

          <label style={fieldLabel} htmlFor="profile-handle">
            Ник для упоминаний
          </label>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span
              style={{
                position: 'absolute',
                left: 13,
                top: 11,
                color: 'var(--color-text-muted)',
                font: 'var(--text-ui)',
              }}
            >
              @
            </span>
            <input
              id="profile-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/^@+/, ''))}
              placeholder="например, web"
              autoCapitalize="none"
              style={{ ...inputStyle, paddingLeft: 27, marginBottom: 0 }}
            />
          </div>

          {error && (
            <p
              style={{
                margin: '-6px 0 14px',
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--color-danger)',
              }}
            >
              {error}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 40,
                padding: '0 16px',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                background: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
                font: 'var(--text-ui)',
                cursor: 'pointer',
              }}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              style={{
                height: 40,
                padding: '0 20px',
                border: 'none',
                borderRadius: 10,
                background: 'var(--color-accent)',
                color: '#fff',
                font: 'var(--text-ui)',
                fontWeight: 700,
                cursor: dirty && !saving ? 'pointer' : 'default',
                opacity: dirty && !saving ? 1 : 0.5,
                boxShadow: 'var(--shadow-accent-button)',
              }}
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Кружок-вариант аватара в выборе: подсвечивается кольцом, если выбран.
function AvatarTile({
  selected,
  onClick,
  title,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 46,
        height: 46,
        padding: 0,
        borderRadius: '50%',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: selected ? '0 0 0 2px var(--color-accent)' : '0 0 0 1px var(--color-border)',
      }}
    >
      {children}
    </button>
  );
}
