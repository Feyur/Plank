// После сборки Tauri складываем готовые артефакты в apps/desktop/release/:
// установщик .dmg (его отдавать другим) и само приложение .app.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = join(root, 'src-tauri', 'target', 'release', 'bundle');
const release = join(root, 'release');

mkdirSync(release, { recursive: true });

// .dmg — установщик (имя содержит версию и архитектуру).
const dmgDir = join(bundle, 'dmg');
const dmgs = readdirSync(dmgDir).filter((f) => f.endsWith('.dmg'));
if (dmgs.length === 0) throw new Error('Не найден .dmg — сборка dmg не удалась');
for (const dmg of dmgs) {
  cpSync(join(dmgDir, dmg), join(release, dmg));
  console.log(`Установщик: release/${dmg}`);
}

// .app — само приложение (можно запустить напрямую), если бандл собран.
const app = join(bundle, 'macos', 'Plank.app');
if (existsSync(app)) {
  const appDest = join(release, 'Plank.app');
  rmSync(appDest, { recursive: true, force: true });
  cpSync(app, appDest, { recursive: true });
  console.log('Приложение: release/Plank.app');
}
