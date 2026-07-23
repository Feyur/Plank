import { useState } from 'react';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];
const MONTHS_GEN = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Читаемая дата для кнопки: «11 июля 2026».
export function formatFull(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_GEN[m - 1]} ${y}`;
}

export function DatePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const initial = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const todayIso = toIso(new Date());
  // Сетка 6×7, начиная с понедельника на/перед первым числом месяца.
  const first = new Date(viewYear, viewMonth, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const gridStart = new Date(viewYear, viewMonth, 1 - startWeekday);
  const days = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    return { iso: toIso(date), day: date.getDate(), inMonth: date.getMonth() === viewMonth };
  });

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          height: 38,
          padding: '0 12px',
          border: '1px solid var(--color-border)',
          borderRadius: 10,
          background: 'var(--color-surface)',
          font: 'var(--text-ui)',
          color: value ? 'var(--color-text)' : 'var(--color-text-muted)',
          cursor: 'pointer',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="16" rx="2.5" />
          <line x1="3" y1="9.5" x2="21" y2="9.5" />
          <line x1="8" y1="2.5" x2="8" y2="6.5" />
          <line x1="16" y1="2.5" x2="16" y2="6.5" />
        </svg>
        {value ? formatFull(value) : 'Добавить срок'}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div
            style={{
              position: 'absolute',
              top: 44,
              left: 0,
              width: 268,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 14,
              boxShadow: 'var(--shadow-dropdown)',
              zIndex: 95,
              padding: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ flex: 1, font: 'var(--text-ui)', fontWeight: 700 }}>
                {MONTHS[viewMonth]} {viewYear}
              </div>
              <ArrowButton dir="prev" onClick={() => shiftMonth(-1)} />
              <ArrowButton dir="next" onClick={() => shiftMonth(1)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--color-text-muted-soft)',
                    padding: '2px 0',
                  }}
                >
                  {w}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
              {days.map((cell) => {
                const selected = cell.iso === value;
                const isToday = cell.iso === todayIso;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    className={selected ? undefined : 'cal-day'}
                    onClick={() => {
                      onChange(cell.iso);
                      setOpen(false);
                    }}
                    style={{
                      height: 32,
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: selected || isToday ? 700 : 500,
                      background: selected ? 'var(--color-accent)' : undefined,
                      color: selected
                        ? '#fff'
                        : cell.inMonth
                          ? isToday
                            ? 'var(--color-accent)'
                            : 'var(--color-text)'
                          : 'var(--color-text-muted-soft)',
                    }}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  marginTop: 10,
                  height: 34,
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  background: 'transparent',
                  color: 'var(--color-text-muted)',
                  font: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Убрать срок
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ArrowButton({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Предыдущий месяц' : 'Следующий месяц'}
      style={{
        width: 28,
        height: 28,
        border: 'none',
        borderRadius: 8,
        background: 'transparent',
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        {dir === 'prev' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  );
}
