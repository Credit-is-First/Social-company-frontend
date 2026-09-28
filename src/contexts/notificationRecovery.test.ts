import { isSessionGone, MAX_RETRY_DELAY_MS, mergeIncoming, retryDelayMs } from './notificationRecovery';
import { AppNotification } from '../types';

const notification = (id: string): AppNotification => ({
  id,
  type: 'loan_approved',
  title: 'T',
  message: 'M',
  link: null,
  readAt: null,
  createdAt: '2026-09-27T12:00:00.000Z',
});

describe('retryDelayMs', () => {
  it('backs off from 2 seconds, doubling, up to a minute', () => {
    expect([0, 1, 2, 3, 4].map(retryDelayMs)).toEqual([2000, 4000, 8000, 16000, 32000]);
    expect(retryDelayMs(5)).toBe(MAX_RETRY_DELAY_MS);
    expect(retryDelayMs(40)).toBe(MAX_RETRY_DELAY_MS);
  });
});

describe('isSessionGone', () => {
  it('is true only when the server refused the session', () => {
    expect(isSessionGone({ response: { status: 401 } })).toBe(true);
    expect(isSessionGone({ response: { status: 403 } })).toBe(true);
  });

  it('is false when the server could not be reached or failed', () => {
    expect(isSessionGone(new Error('Network Error'))).toBe(false);
    expect(isSessionGone({ response: { status: 502 } })).toBe(false);
    expect(isSessionGone(undefined)).toBe(false);
  });
});

describe('mergeIncoming', () => {
  it('puts a new notification first and reports it as added', () => {
    const result = mergeIncoming([notification('a')], notification('b'), 20);
    expect(result.added).toBe(true);
    expect(result.list.map(n => n.id)).toEqual(['b', 'a']);
  });

  it('ignores one already in the list, so the unread count does not move', () => {
    const list = [notification('a'), notification('b')];
    const result = mergeIncoming(list, notification('b'), 20);
    expect(result.added).toBe(false);
    expect(result.list).toBe(list);
  });

  it('keeps the list to the limit', () => {
    const result = mergeIncoming([notification('a'), notification('b')], notification('c'), 2);
    expect(result.list.map(n => n.id)).toEqual(['c', 'a']);
  });
});
