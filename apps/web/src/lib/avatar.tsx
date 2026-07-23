import type { CSSProperties, ReactNode } from 'react';

// ── Инициалы + запасной цвет (когда аватар не выбран) ──
const COLORS = [
  'var(--avatar-1)',
  'var(--avatar-2)',
  'var(--avatar-3)',
  'var(--avatar-4)',
  'var(--avatar-5)',
  'var(--avatar-6)',
];

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function avatarColor(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

// ── Готовые аватары: градиент + узнаваемый белый мотив ──
// Хранится как `preset:<key>`; любой клиент рисует по ключу, картинки в БД нет.
export interface AvatarPreset {
  key: string;
  label: string;
  from: string;
  to: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { key: 'aurora', label: 'Аврора', from: '#6C5CE7', to: '#9C8BFF' },
  { key: 'dawn', label: 'Рассвет', from: '#FF7A59', to: '#FFB25C' },
  { key: 'tide', label: 'Прилив', from: '#22B8CF', to: '#4F86F9' },
  { key: 'moss', label: 'Мох', from: '#2FB56B', to: '#83DA7C' },
  { key: 'bloom', label: 'Цветение', from: '#EC4899', to: '#A855F7' },
  { key: 'ember', label: 'Уголёк', from: '#F43F5E', to: '#FB923C' },
  { key: 'slate', label: 'Сланец', from: '#5B6B7F', to: '#93A3B6' },
  { key: 'gold', label: 'Золото', from: '#F59E0B', to: '#FCD34D' },
];

const PRESET_BY_KEY = new Map(AVATAR_PRESETS.map((p) => [p.key, p]));

// Мотив у каждого пресета свой — так набор выглядит цельным, но аватары различимы.
function motif(key: string): ReactNode {
  const white = 'rgba(255,255,255,.92)';
  const soft = 'rgba(255,255,255,.5)';
  switch (key) {
    case 'aurora': // концентрические кольца
      return (
        <>
          <circle cx="20" cy="20" r="10.5" fill="none" stroke={soft} strokeWidth="2.4" />
          <circle cx="20" cy="20" r="4.5" fill={white} />
        </>
      );
    case 'dawn': // восходящее солнце над линией
      return (
        <>
          <circle cx="20" cy="23" r="7" fill={white} />
          <line x1="8" y1="27" x2="32" y2="27" stroke={soft} strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case 'tide': // волна
      return (
        <path
          d="M7 24 q3.25 -6 6.5 0 t6.5 0 t6.5 0"
          fill="none"
          stroke={white}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      );
    case 'moss': // лист
      return (
        <path
          d="M14 26 C14 16 26 14 26 14 C26 24 18 26 14 26 Z M15.5 24.5 L24 16"
          fill={white}
          stroke="none"
        />
      );
    case 'bloom': // четыре лепестка
      return (
        <>
          <circle cx="20" cy="13.5" r="4.2" fill={white} />
          <circle cx="20" cy="26.5" r="4.2" fill={white} />
          <circle cx="13.5" cy="20" r="4.2" fill={soft} />
          <circle cx="26.5" cy="20" r="4.2" fill={soft} />
        </>
      );
    case 'ember': // пересечение кругов
      return (
        <>
          <circle cx="16.5" cy="20" r="7.5" fill={soft} />
          <circle cx="23.5" cy="20" r="7.5" fill={white} />
        </>
      );
    case 'slate': // диагональные полосы
      return (
        <>
          <line x1="12" y1="27" x2="27" y2="12" stroke={white} strokeWidth="2.6" strokeLinecap="round" />
          <line x1="17" y1="28" x2="28" y2="17" stroke={soft} strokeWidth="2.6" strokeLinecap="round" />
        </>
      );
    case 'gold': // ромб-искра
      return (
        <>
          <path d="M20 11 L24 20 L20 29 L16 20 Z" fill={white} />
          <circle cx="20" cy="20" r="2.2" fill={soft} />
        </>
      );
    default:
      return null;
  }
}

function PresetAvatar({ preset, size }: { preset: AvatarPreset; size: number }): ReactNode {
  // id градиента = ключ пресета: дубли-одинаковые определения браузер разрешает
  // в пользу первого, а он идентичен — все аватары одного пресета рисуются верно.
  const gid = `av-${preset.key}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={preset.from} />
          <stop offset="1" stopColor={preset.to} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" fill={`url(#${gid})`} />
      {motif(preset.key)}
    </svg>
  );
}

interface AvatarProps {
  id: string;
  name: string;
  avatar?: string | null;
  size?: number;
  title?: string;
}

// Единый аватар: загруженная картинка → пресет → инициалы с цветом (как раньше).
export function Avatar({ id, name, avatar, size = 28, title }: AvatarProps) {
  const shell: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    overflow: 'hidden',
    display: 'block',
  };

  if (avatar?.startsWith('data:')) {
    return (
      <img
        src={avatar}
        alt={name}
        title={title ?? name}
        style={{ ...shell, objectFit: 'cover' }}
      />
    );
  }

  const preset = avatar?.startsWith('preset:') ? PRESET_BY_KEY.get(avatar.slice(7)) : undefined;
  if (preset) {
    return (
      <span title={title ?? name} style={shell}>
        <PresetAvatar preset={preset} size={size} />
      </span>
    );
  }

  return (
    <span
      title={title ?? name}
      style={{
        ...shell,
        background: avatarColor(id),
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.38),
        fontWeight: 700,
      }}
    >
      {initials(name)}
    </span>
  );
}

// ── Загрузка: ужимаем картинку до маленького квадрата и отдаём data-URL ──
const AVATAR_PX = 160;
const MAX_DATA_URL = 55 * 1024;

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Выберите изображение');
  const img = await loadImage(file);

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_PX;
  canvas.height = AVATAR_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Не удалось обработать изображение');

  // Заполняем квадрат по принципу cover (обрезаем лишнее, не искажаем).
  const scale = Math.max(AVATAR_PX / img.width, AVATAR_PX / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (AVATAR_PX - w) / 2, (AVATAR_PX - h) / 2, w, h);

  for (const quality of [0.82, 0.6, 0.4]) {
    let url = canvas.toDataURL('image/webp', quality);
    if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', quality);
    if (url.length <= MAX_DATA_URL) return url;
  }
  throw new Error('Картинка слишком тяжёлая — попробуйте другую');
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать изображение'));
    };
    img.src = url;
  });
}
