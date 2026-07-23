// Срок в коротком формате, как в дизайне: «12 июл».
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

// Полные месяцы в родительном падеже для дат дейли: «20 июля».
const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

// Локальная дата в 'YYYY-MM-DD' (без TZ-сдвига — берём локальные части).
export function toYmd(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Метка чипа даты: «Сегодня» / «Вчера» / «20 июля».
export function formatDayChip(ymd: string): string {
  const today = toYmd(new Date());
  if (ymd === today) return 'Сегодня';
  const [y, m, d] = ymd.split('-').map(Number);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (ymd === toYmd(yesterday)) return 'Вчера';
  return `${d} ${MONTHS_GEN[m - 1]} ${y === new Date().getFullYear() ? '' : y}`.trim();
}

export function formatDue(iso: string, time?: string | null): string {
  const [, month, day] = iso.split('-').map(Number);
  const date = `${day} ${MONTHS[month - 1]}`;
  return time ? `${date}, ${time}` : date;
}

// Время комментария: «16 июл, 14:23».
export function formatCommentTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Срок «горит», если он сегодня/в прошлом или в ближайшие 2 дня.
export function isDueSoon(iso: string): boolean {
  const due = new Date(iso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = (due.getTime() - today.getTime()) / 86_400_000;
  return days <= 2;
}
