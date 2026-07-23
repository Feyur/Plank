import { useState } from 'react';
import { colorOf, COLOR_KEYS, type LabelColor } from './labelColors';
import type { Label } from './types';

interface LabelsManagerProps {
  labels: Label[];
  onCreate: (name: string, color: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function LabelsManager({ labels, onCreate, onDelete, onClose }: LabelsManagerProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<LabelColor>('purple');

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, color);
    setName('');
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
        padding: '80px 20px',
        zIndex: 110,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: '100%',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-modal)',
          boxShadow: 'var(--shadow-modal)',
          padding: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, font: 'var(--text-section-title)', flex: 1 }}>Метки</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              width: 32,
              height: 32,
              border: 'none',
              borderRadius: 9,
              background: 'var(--color-border-soft)',
              color: 'var(--color-text-secondary)',
              fontSize: 17,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Существующие метки */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {labels.length === 0 && (
            <div style={{ color: 'var(--color-text-muted)', font: 'var(--text-secondary)' }}>
              Пока нет меток — создайте первую ниже.
            </div>
          )}
          {labels.map((label) => {
            const c = colorOf(label.color);
            return (
              <div key={label.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 12.5,
                    fontWeight: 700,
                    padding: '5px 11px',
                    borderRadius: 'var(--radius-chip)',
                    background: c.bg,
                    color: c.fg,
                  }}
                >
                  {label.name}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(label.id)}
                  aria-label={`Удалить метку ${label.name}`}
                  style={{
                    width: 30,
                    height: 30,
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    background: 'transparent',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {/* Создание */}
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Название метки…"
            style={{
              height: 38,
              border: '1px solid var(--color-border)',
              borderRadius: 9,
              padding: '0 12px',
              font: 'var(--text-ui)',
              color: 'var(--color-text)',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            {COLOR_KEYS.map((key) => {
              const c = colorOf(key);
              const active = color === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(key)}
                  aria-label={`Цвет ${key}`}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: c.bg,
                    border: active ? `2px solid ${c.fg}` : '1px solid var(--color-border)',
                    boxShadow: active ? '0 0 0 3px rgba(91,91,214,.12)' : 'none',
                  }}
                />
              );
            })}
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={submit}
              style={{
                height: 38,
                padding: '0 16px',
                border: 'none',
                borderRadius: 9,
                background: 'var(--color-accent)',
                color: '#fff',
                font: 'var(--text-ui)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Добавить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
