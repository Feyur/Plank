// Аватар приходит с клиента как враждебный ввод — валидируем на сервере.
// Допустимо: null (сброс), пресет `preset:<key>` или картинка в data-URL.

const PRESET = /^preset:[a-z0-9-]{1,24}$/;
const DATA_URL = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

// Картинку держим маленькой — клиент ужимает до ~160px. Ставим потолок, чтобы
// data-URL не раздул профиль и каждую отдачу доски (аватар едет в каждой карточке).
const MAX_IMAGE_BYTES = 60 * 1024;

// Возвращает нормализованный аватар или null; кидает при недопустимом вводе.
export function normalizeAvatar(input: unknown): string | null {
  if (input === undefined || input === null || input === '') return null;
  if (typeof input !== 'string') throw new InvalidAvatarError();

  if (PRESET.test(input)) return input;

  const match = DATA_URL.exec(input);
  if (match) {
    const bytes = Math.floor((match[2].length * 3) / 4);
    if (bytes > MAX_IMAGE_BYTES) throw new InvalidAvatarError();
    return input;
  }

  throw new InvalidAvatarError();
}

export class InvalidAvatarError extends Error {
  constructor() {
    super('INVALID_AVATAR');
    this.name = 'InvalidAvatarError';
  }
}
