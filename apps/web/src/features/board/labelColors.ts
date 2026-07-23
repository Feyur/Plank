// Палитра меток: значения живут в tokens.css (светлая и тёмная темы),
// здесь только ссылки на переменные.
export type LabelColor = 'purple' | 'blue' | 'red' | 'green' | 'amber' | 'teal' | 'gray';

export const COLOR_KEYS: LabelColor[] = ['purple', 'blue', 'red', 'green', 'amber', 'teal', 'gray'];

export function colorOf(key: string): { bg: string; fg: string } {
  const safe = (COLOR_KEYS as string[]).includes(key) ? key : 'gray';
  return { bg: `var(--chip-${safe}-bg)`, fg: `var(--chip-${safe}-fg)` };
}
