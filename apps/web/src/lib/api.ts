// Тонкая обёртка над fetch: базовый URL из окружения, cookie-сессия
// (credentials: include), единый разбор ошибок API.

export const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // Content-Type ставим только когда есть тело: иначе Fastify отвечает 400 на
  // пустой JSON-body (ломало POST без тела, например /auth/logout).
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (init?.body) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers,
    });
  } catch {
    throw new ApiError(0, 'Не удалось связаться с сервером. Проверьте соединение.');
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(response.status, body?.error ?? 'Что-то пошло не так');
  }
  return body as T;
}
