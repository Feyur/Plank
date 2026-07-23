import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      // Артефакты и Rust-часть десктоп-обёртки — не наш JS/TS.
      'apps/desktop/src-tauri/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Node-скрипты сборки десктопа: даём Node-глобалы (console и т.п.).
  {
    files: ['apps/desktop/scripts/**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
);
