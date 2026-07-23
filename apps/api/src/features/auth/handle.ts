const handleAllowed = /[^a-zа-яё0-9_]/gi;

export function normalizeHandle(value: string): string {
  return value.trim().replace(/^@+/, '').toLocaleLowerCase();
}

export function isValidHandle(value: string): boolean {
  return /^[a-zа-яё0-9_]{3,32}$/i.test(value);
}

export function defaultHandleForEmail(email: string): string {
  const localPart = email.split('@')[0] ?? '';
  const normalized = localPart
    .toLocaleLowerCase()
    .replace(handleAllowed, '_')
    .replace(/^_+|_+$/g, '');
  return (normalized || 'user').padEnd(3, '0').slice(0, 32);
}
