export interface MentionableUser {
  id: string;
  handle: string;
}

// До @ника должен быть не символ слова, чтобы email вроде mail@company.ru
// не превращался в упоминание пользователя company.
const mentionPattern = /(^|[^\p{L}\p{N}_])@([\p{L}\p{N}_]{3,32})/gu;

export function mentionedUserIds(
  text: string,
  users: MentionableUser[],
  authorId: string,
): string[] {
  const handles = new Set<string>();
  for (const match of text.matchAll(mentionPattern)) {
    handles.add(match[2].toLocaleLowerCase());
  }

  return users
    .filter((user) => user.id !== authorId && handles.has(user.handle.toLocaleLowerCase()))
    .map((user) => user.id);
}
