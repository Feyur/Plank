// Вся конфигурация из окружения — в одном месте. Читаем один раз при старте
// и падаем сразу, если чего-то критичного нет (лучше громко, чем тихо неправильно).

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Не задана переменная окружения ${name} (см. .env.example)`);
  }
  return value;
}

function emailList(name: string, fallback: string): string[] {
  return (process.env[name] ?? fallback)
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  port: Number(process.env.API_PORT ?? 3000),
  isProduction,
  databaseUrl: required('DATABASE_URL'),
  authSecret: required('AUTH_SECRET'),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  // Флаг Secure у cookie: по умолчанию как NODE_ENV, но можно принудительно
  // выключить для доступа по http (превью по IP без TLS).
  cookieSecure:
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
  // Открытая регистрация. На публичном деплое выключаем (аккаунты заводит админ).
  registrationEnabled:
    process.env.REGISTRATION_ENABLED !== undefined
      ? process.env.REGISTRATION_ENABLED === 'true'
      : !isProduction,
  // Только эти аккаунты могут создавать пользователей и назначать им доски.
  accessAdminEmails: emailList('ACCESS_ADMIN_EMAILS', 'vip@atank.ru,web@atank.ru'),
  // Если задан — приложение само отдаёт собранный фронтенд из этой папки.
  webDir: process.env.WEB_DIR,
};

// Имя cookie с токеном сессии — используется и при выдаче, и при проверке.
export const SESSION_COOKIE = 'plank_session';
