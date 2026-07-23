import { config } from '../../config';

export function isAccessAdminEmail(
  email: string,
  adminEmails: string[] = config.accessAdminEmails,
): boolean {
  return adminEmails.includes(email.trim().toLowerCase());
}
