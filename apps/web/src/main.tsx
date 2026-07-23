import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Дизайн-токены — единый источник правды по цветам/типографике.
import './tokens.css';
import './index.css';
import { App } from './App';
import { initTheme } from './lib/theme';

// Тему ставим до первого рендера, чтобы не мигало светлым.
initTheme();

const root = document.getElementById('root');
if (!root) throw new Error('Не найден корневой элемент #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
