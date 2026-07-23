// Палитра доски: сплошной цвет для квадратика у названия, мягкий фон под доску
// и тон колонки. Ключ хранится в БД (или null = «Стандарт»). Тинты слабые —
// читаются в обеих темах, текст остаётся контрастным.
// columnTint = null → колонка белая (surface); иначе тон накладывается на surface
// НЕПРОЗРАЧНО, поэтому цвет колонки не зависит от фона доски под ней.
export interface BoardColor {
  key: string;
  label: string;
  dot: string;
  bg: string;
  columnTint: string | null;
  // Заголовок колонки: сплошная плашка цвета dot + этот текст. null → обычный
  // тёмный заголовок без плашки (нейтральные «как доска» и «белый»).
  headerText: string | null;
}

// Белый/тёмный текст заголовка выбран по яркости цвета, чтобы плашка читалась.
const W = '#ffffff';

export const BOARD_COLORS: BoardColor[] = [
  { key: 'default', label: 'Как у доски', dot: 'var(--color-accent)', bg: 'transparent', columnTint: null, headerText: null },
  { key: 'white', label: 'Белый', dot: '#ffffff', bg: 'var(--color-surface)', columnTint: null, headerText: null },
  { key: 'blue', label: 'Синий', dot: '#4F86F9', bg: 'rgba(79,134,249,.09)', columnTint: 'rgba(79,134,249,.16)', headerText: W },
  { key: 'indigo', label: 'Индиго', dot: '#6366F1', bg: 'rgba(99,102,241,.10)', columnTint: 'rgba(99,102,241,.16)', headerText: W },
  { key: 'teal', label: 'Бирюзовый', dot: '#22B8CF', bg: 'rgba(34,184,207,.10)', columnTint: 'rgba(34,184,207,.17)', headerText: W },
  { key: 'cyan', label: 'Голубой', dot: '#06B6D4', bg: 'rgba(6,182,212,.10)', columnTint: 'rgba(6,182,212,.16)', headerText: W },
  { key: 'green', label: 'Зелёный', dot: '#2FB56B', bg: 'rgba(47,181,107,.10)', columnTint: 'rgba(47,181,107,.17)', headerText: W },
  { key: 'lime', label: 'Лайм', dot: '#84CC16', bg: 'rgba(132,204,22,.12)', columnTint: 'rgba(132,204,22,.20)', headerText: '#33430b' },
  { key: 'amber', label: 'Янтарь', dot: '#F59E0B', bg: 'rgba(245,158,11,.11)', columnTint: 'rgba(245,158,11,.18)', headerText: '#6b4106' },
  { key: 'orange', label: 'Оранжевый', dot: '#FF7A59', bg: 'rgba(255,122,89,.10)', columnTint: 'rgba(255,122,89,.16)', headerText: '#7c3115' },
  { key: 'red', label: 'Красный', dot: '#EF4444', bg: 'rgba(239,68,68,.09)', columnTint: 'rgba(239,68,68,.15)', headerText: W },
  { key: 'rose', label: 'Роза', dot: '#F43F5E', bg: 'rgba(244,63,94,.09)', columnTint: 'rgba(244,63,94,.15)', headerText: W },
  { key: 'pink', label: 'Розовый', dot: '#EC4899', bg: 'rgba(236,72,153,.09)', columnTint: 'rgba(236,72,153,.15)', headerText: W },
  { key: 'purple', label: 'Фиолетовый', dot: '#6C5CE7', bg: 'rgba(108,92,231,.10)', columnTint: 'rgba(108,92,231,.16)', headerText: W },
  { key: 'violet', label: 'Сиреневый', dot: '#8B5CF6', bg: 'rgba(139,92,246,.10)', columnTint: 'rgba(139,92,246,.16)', headerText: W },
  { key: 'slate', label: 'Графит', dot: '#64748B', bg: 'rgba(100,116,139,.10)', columnTint: 'rgba(100,116,139,.16)', headerText: W },
];

const DEFAULT = BOARD_COLORS[0];
const BY_KEY = new Map(BOARD_COLORS.map((c) => [c.key, c]));

// Ключ из БД (или null) → цвет палитры. Неизвестный ключ → «Стандарт».
export function boardColorOf(key: string | null): BoardColor {
  if (!key) return DEFAULT;
  return BY_KEY.get(key) ?? DEFAULT;
}

// Фон колонки. Колонка берёт свой цвет (listColor), иначе наследует цвет доски.
// Тон кладём поверх surface непрозрачно — колонка не смешивается с фоном доски.
// «Стандарт» (нет цвета ни у колонки, ни у доски) — серый из дизайна;
// «Белый» — явно белый; цвет — мягкий тон.
export function columnBackground(listColor: string | null, boardColor: string | null): string {
  const color = boardColorOf(listColor ?? boardColor);
  if (color.key === 'white') return 'var(--color-surface)';
  if (!color.columnTint) return 'var(--color-column-bg)';
  return `linear-gradient(0deg, ${color.columnTint}, ${color.columnTint}), var(--color-surface)`;
}
