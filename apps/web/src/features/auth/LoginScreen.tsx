import { useState, type CSSProperties, type FormEvent } from 'react';
import { ApiError } from '../../lib/api';
import { useAuth } from './AuthContext';

type Mode = 'login' | 'register';

const inputStyle: CSSProperties = {
  width: '100%',
  height: 40,
  border: '1px solid var(--color-input-border)',
  borderRadius: 10,
  background: 'var(--color-input-bg)',
  padding: '0 13px',
  fontSize: 13.5,
  color: 'var(--color-text)',
  outline: 'none',
  marginBottom: 14,
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--color-text-secondary)',
  marginBottom: 6,
};

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): string | null {
    if (mode === 'register' && name.trim().length === 0) return 'Введите имя';
    if (!emailPattern.test(email.trim())) return 'Введите корректный email';
    if (password.length < 8) return 'Пароль должен быть не короче 8 символов';
    return null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const validation = validate();
    setFieldError(validation);
    setFormError(null);
    if (validation) return;

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password);
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Что-то пошло не так');
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 384,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 18,
          boxShadow: '0 18px 50px rgba(16,20,30,.10)',
          padding: '30px 30px 26px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: 'var(--color-accent-gradient)',
              boxShadow: '0 4px 12px rgba(91,91,214,.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 14 14" aria-hidden="true">
              <rect x="2" y="2" width="4" height="10" rx="1.3" fill="#fff" opacity=".95" />
              <rect x="8" y="2" width="4" height="7" rx="1.3" fill="#fff" opacity=".75" />
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.01em' }}>Plank</span>
        </div>

        <h1 style={{ margin: '0 0 5px', fontSize: 21, fontWeight: 800, letterSpacing: '-0.015em' }}>
          {mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {mode === 'login'
            ? 'Войдите, чтобы продолжить работу с досками'
            : 'Заполните данные, чтобы начать работу'}
        </p>

        {mode === 'register' && (
          <>
            <label style={labelStyle} htmlFor="name">
              Имя
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как вас зовут"
              autoComplete="name"
              style={inputStyle}
            />
          </>
        )}

        <label style={labelStyle} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@plank.app"
          autoComplete="email"
          style={inputStyle}
        />

        <label style={labelStyle} htmlFor="password">
          Пароль
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          style={{ ...inputStyle, marginBottom: 18 }}
        />

        {(fieldError || formError) && (
          <p
            role="alert"
            style={{
              margin: '-6px 0 14px',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--color-danger)',
            }}
          >
            {fieldError ?? formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            height: 40,
            border: 'none',
            borderRadius: 10,
            background: 'var(--color-accent)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 700,
            cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            boxShadow: '0 2px 8px rgba(91,91,214,.28)',
          }}
        >
          {submitting ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>

        <div
          style={{
            marginTop: 18,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--color-text-muted)',
            fontWeight: 500,
          }}
        >
          {mode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setFieldError(null);
              setFormError(null);
            }}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              color: 'var(--color-accent)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {mode === 'login' ? 'Создать' : 'Войти'}
          </button>
        </div>
      </form>
    </div>
  );
}
