import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import * as api from './notesApi';
import type { Note } from './notesApi';

function titleOf(body: string): string {
  const first = body.split('\n')[0].trim();
  return first || 'Без названия';
}

function previewOf(body: string): string {
  const rest = body.split('\n').slice(1).join(' ').trim();
  return rest || 'Нет дополнительного текста';
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  useEffect(() => {
    api
      .fetchNotes()
      .then((data) => {
        setNotes(data.notes);
        setCurrentId(data.notes[0]?.id ?? null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Не удалось загрузить заметки'))
      .finally(() => setLoading(false));
  }, []);

  const current = notes.find((n) => n.id === currentId) ?? null;

  async function addNote() {
    const { note } = await api.createNote('');
    setNotes((prev) => [note, ...prev]);
    setCurrentId(note.id);
  }

  function editBody(body: string) {
    if (!currentId) return;
    setNotes((prev) => prev.map((n) => (n.id === currentId ? { ...n, body } : n)));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.updateNote(currentId, body).catch(() =>
        toast('Заметка не сохранилась — проверьте соединение.'),
      );
    }, 500);
  }

  async function removeNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (currentId === id) setCurrentId((prev) => (prev === id ? null : prev));
    await api.deleteNote(id).catch(() => undefined);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <h1 style={{ margin: 0, font: 'var(--text-screen-title)', letterSpacing: '-0.015em', flex: 1 }}>
          Мои заметки
        </h1>
        <button type="button" onClick={addNote} style={primaryBtn}>
          + Новая заметка
        </button>
      </div>

      {loading ? (
        <Centered>Загрузка…</Centered>
      ) : error ? (
        <Centered>{error}</Centered>
      ) : notes.length === 0 ? (
        <Centered>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px', color: 'var(--color-text-secondary)' }}>
              Пока пусто. Личное пространство для быстрых заметок.
            </p>
            <button type="button" onClick={addNote} style={primaryBtn}>
              Создать первую заметку
            </button>
          </div>
        </Centered>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            gap: 16,
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-panel)',
            overflow: 'hidden',
            background: 'var(--color-surface)',
          }}
        >
          <div
            className="scrl"
            style={{
              width: 280,
              flexShrink: 0,
              borderRight: '1px solid var(--color-border)',
              overflowY: 'auto',
              padding: 8,
            }}
          >
            {notes.map((note) => {
              const active = note.id === currentId;
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setCurrentId(note.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    borderRadius: 10,
                    background: active ? 'var(--color-border-soft)' : 'transparent',
                    padding: '10px 12px',
                    marginBottom: 2,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      font: 'var(--text-ui)',
                      color: 'var(--color-text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {titleOf(note.body)}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted-soft)' }}>
                      {shortDate(note.updatedAt)}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--color-text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {previewOf(note.body)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: 16 }}>
            {current ? (
              <>
                <textarea
                  key={current.id}
                  autoFocus
                  value={current.body}
                  onChange={(e) => editBody(e.target.value)}
                  placeholder="Начните писать…"
                  style={{
                    flex: 1,
                    resize: 'none',
                    border: 'none',
                    outline: 'none',
                    font: 'var(--text-ui)',
                    fontWeight: 500,
                    lineHeight: 1.6,
                    color: 'var(--color-text)',
                    background: 'transparent',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => removeNote(current.id)}
                    style={{
                      height: 32,
                      padding: '0 12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      background: 'transparent',
                      color: 'var(--color-text-muted)',
                      font: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Удалить заметку
                  </button>
                </div>
              </>
            ) : (
              <Centered>Выберите заметку слева</Centered>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-muted)',
        font: 'var(--text-ui)',
      }}
    >
      {children}
    </div>
  );
}

const primaryBtn = {
  height: 36,
  padding: '0 15px',
  border: 'none',
  borderRadius: 9,
  background: 'var(--color-accent)',
  color: '#fff',
  font: 'var(--text-ui)',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: 'var(--shadow-accent-button)',
} as const;
