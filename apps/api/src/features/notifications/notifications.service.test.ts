import { describe, expect, it } from 'vitest';
import { mentionedUserIds } from './notifications.service';

const users = [
  { id: 'author', handle: 'web' },
  { id: 'maria', handle: 'maria' },
  { id: 'ivan', handle: 'иван' },
];

describe('mentionedUserIds', () => {
  it('находит точные @ники, не дублирует получателя и не уведомляет автора', () => {
    expect(
      mentionedUserIds('Нужен ответ от @maria и @иван; @maria, посмотрите.', users, 'author'),
    ).toEqual(['maria', 'ivan']);
  });

  it('не принимает часть email за упоминание', () => {
    expect(
      mentionedUserIds('Напишите на help@maria.ru, а @web уже в курсе.', users, 'author'),
    ).toEqual([]);
  });
});
