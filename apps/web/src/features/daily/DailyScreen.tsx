import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '../../lib/avatar';
import { useRefresh } from '../realtime/useRefresh';
import { useAuth } from '../auth/AuthContext';
import { formatDayChip, toYmd } from '../board/dates';
import { colorOf } from '../board/labelColors';
import * as api from './dailyApi';
import type { DailyPerson } from './dailyApi';

// Разделы стендапа — по дизайну: Готово / В работе / Планирую.
const COLUMNS = [
  { key: 'done', title: 'Готово', color: 'green' },
  { key: 'doing', title: 'В работе', color: 'blue' },
  { key: 'next', title: 'Планирую', color: 'purple' },
] as const;

type Draft = { done: string; doing: string; next: string };

function firstName(name: string): string {
  return name.split(/\s+/)[0] || name;
}

export function DailyScreen() {
  const { user } = useAuth();
  const [date, setDate] = useState(() => toYmd(new Date()));
  const [people, setPeople] = useState<DailyPerson[] | null>(null);
  const [personId, setPersonId] = useState<string | null>(user?.id ?? null);
  const [draft, setDraft] = useState<Draft>({ done: '', doing: '', next: '' });
  const [saving, setSaving] = useState(false);

  // Последние 10 дней для выбора (сегодня и назад).
  const days = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 10 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      return toYmd(d);
    });
  }, []);

  useEffect(() => {
    let alive = true;
    setPeople(null);
    api
      .fetchDaily(date)
      .then((data) => {
        if (alive) setPeople(data.people);
      })
      .catch(() => {
        if (alive) setPeople([]);
      });
    return () => {
      alive = false;
    };
  }, [date]);

  // Тихое обновление по кнопке в шапке (без мигания загрузки).
  useRefresh(() => {
    api
      .fetchDaily(date)
      .then((data) => setPeople(data.people))
      .catch(() => undefined);
  });

  const selected =
    people?.find((p) => p.user.id === personId) ??
    people?.find((p) => p.user.id === user?.id) ??
    people?.[0] ??
    null;
  const isSelf = !!selected && selected.user.id === user?.id;

  // Черновик своей записи синхронизируем при смене даты/человека/данных.
  useEffect(() => {
    if (selected && selected.user.id === user?.id) {
      setDraft({ done: selected.done, doing: selected.doing, next: selected.next });
    }
  }, [selected, user?.id]);

  const dirty =
    !!selected &&
    isSelf &&
    (draft.done !== selected.done ||
      draft.doing !== selected.doing ||
      draft.next !== selected.next);

  async function save() {
    setSaving(true);
    try {
      await api.saveDaily(date, draft);
      const data = await api.fetchDaily(date);
      setPeople(data.people);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, font: 'var(--text-board-title)', letterSpacing: '-0.015em' }}>Дейли</h1>
        <div style={{ marginTop: 4, color: 'var(--color-text-muted)', font: 'var(--text-secondary)' }}>
          асинхронный стендап — без созвона
        </div>
      </div>

      {/* Выбор дня */}
      <div className="scrl" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 6 }}>
        {days.map((d) => {
          const active = d === date;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDate(d)}
              style={{
                flexShrink: 0,
                height: 34,
                padding: '0 14px',
                borderRadius: 9,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                font: 'var(--text-ui)',
                fontWeight: active ? 700 : 500,
                border: active ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                background: active ? 'rgba(91,91,214,.08)' : 'var(--color-surface)',
                color: active ? 'var(--color-text)' : 'var(--color-text-secondary)',
                boxShadow: active ? 'var(--focus-ring)' : 'none',
              }}
            >
              {formatDayChip(d)}
            </button>
          );
        })}
      </div>

      {/* Выбор человека */}
      {people && people.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: 4,
            margin: '14px 0 18px',
            background: 'var(--color-border-soft)',
            borderRadius: 99,
            alignSelf: 'flex-start',
            maxWidth: '100%',
          }}
        >
          {people.map((p) => {
            const active = selected?.user.id === p.user.id;
            return (
              <button
                key={p.user.id}
                type="button"
                onClick={() => setPersonId(p.user.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  height: 32,
                  padding: '0 13px 0 5px',
                  borderRadius: 99,
                  border: 'none',
                  cursor: 'pointer',
                  font: 'var(--text-ui)',
                  fontWeight: active ? 700 : 500,
                  background: active ? 'var(--color-surface)' : 'transparent',
                  color: active ? 'var(--color-text)' : 'var(--color-text-secondary)',
                  boxShadow: active ? 'var(--shadow-card)' : 'none',
                }}
              >
                <Avatar id={p.user.id} name={p.user.name} avatar={p.user.avatar} size={22} />
                {firstName(p.user.name)}
                {p.user.id === user?.id && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted-soft)' }}>вы</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Колонки */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {people === null ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Загрузка…</p>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                gap: 14,
                maxWidth: 1240,
              }}
            >
              {COLUMNS.map((col) => {
                const c = colorOf(col.color);
                const value = selected ? selected[col.key] : '';
                return (
                  <div
                    key={col.key}
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 14,
                      padding: '16px 18px',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: 12.5,
                        fontWeight: 700,
                        padding: '4px 11px',
                        borderRadius: 'var(--radius-chip)',
                        background: c.bg,
                        color: c.fg,
                        marginBottom: 12,
                      }}
                    >
                      {col.title}
                    </span>

                    {isSelf ? (
                      <textarea
                        value={draft[col.key]}
                        onChange={(e) => setDraft((d) => ({ ...d, [col.key]: e.target.value }))}
                        placeholder="По пункту на строку…"
                        rows={5}
                        style={{
                          width: '100%',
                          resize: 'vertical',
                          border: '1px solid var(--color-border)',
                          borderRadius: 10,
                          padding: '9px 11px',
                          font: 'var(--text-ui)',
                          fontWeight: 500,
                          lineHeight: 1.55,
                          color: 'var(--color-text)',
                          background: 'var(--color-surface)',
                          outline: 'none',
                        }}
                      />
                    ) : (
                      <Bullets text={value} dot={c.fg} />
                    )}
                  </div>
                );
              })}
            </div>

            {isSelf && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={save}
                  disabled={!dirty || saving}
                  style={{
                    height: 38,
                    padding: '0 18px',
                    border: 'none',
                    borderRadius: 9,
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
                {selected?.updatedAt && !dirty && (
                  <span style={{ fontSize: 12.5, color: 'var(--color-text-muted-soft)' }}>Сохранено</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Строки текста → маркированный список; пусто → «Пока пусто».
function Bullets({ text, dot }: { text: string; dot: string }) {
  const items = text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  if (items.length === 0) {
    return <div style={{ color: 'var(--color-text-muted-soft)', font: 'var(--text-secondary)' }}>Пока пусто</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: dot,
              marginTop: 7,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              font: 'var(--text-ui)',
              fontWeight: 500,
              lineHeight: 1.55,
              color: 'var(--color-text-secondary-strong)',
            }}
          >
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}
