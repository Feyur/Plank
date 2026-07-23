// Тема приложения: data-theme на <html> + localStorage.
// По умолчанию — системная (prefers-color-scheme).

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'plank-theme';

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function initTheme(): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  const theme: Theme =
    stored === 'dark' || stored === 'light'
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  apply(theme);
}

export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
  apply(next);
  localStorage.setItem(STORAGE_KEY, next);
  return next;
}
