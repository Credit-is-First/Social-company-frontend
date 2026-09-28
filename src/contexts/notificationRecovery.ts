import { AppNotification } from '../types';

/** Longest wait between attempts to get the notification socket signed in again. */
export const MAX_RETRY_DELAY_MS = 60 * 1000;

/**
 * How long to wait before retry number `attempt` (0-based): 2 s, 4 s, 8 s, …
 * up to a minute, so a backend that is restarting is not hammered.
 */
export const retryDelayMs = (attempt: number): number => Math.min(MAX_RETRY_DELAY_MS, 2000 * Math.pow(2, attempt));

/**
 * True when a failed session refresh means the session itself is gone (the
 * server answered 401/403: signed out elsewhere, blocked, deleted), as opposed
 * to the server being unreachable, when trying again later can work.
 */
export const isSessionGone = (error: any): boolean => {
  const status = error && error.response && error.response.status;
  return status === 401 || status === 403;
};

/**
 * Adds a notification that arrived over the socket to the top of the list,
 * unless it is already there (a reconnect's reload can include it). `added`
 * says whether it was new, so the unread count moves only when it should.
 */
export const mergeIncoming = (
  list: AppNotification[],
  incoming: AppNotification,
  limit: number,
): { list: AppNotification[]; added: boolean } =>
  list.some(item => item.id === incoming.id)
    ? { list, added: false }
    : { list: [incoming, ...list].slice(0, limit), added: true };
