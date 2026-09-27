/**
 * Calendar dates: loan borrow/due/return dates, a book's published date, a
 * member's date of birth. The API sends them as 'YYYY-MM-DD'.
 *
 * `new Date('2026-10-11')` reads that as UTC midnight, which west of UTC is
 * the evening before, so every one of these dates used to display a day early.
 * These helpers read the year, month and day as a local calendar date instead.
 * (Real moments in time such as createdAt are fine with `new Date`.)
 */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})(T.*)?$/;

const pad = (n: number): string => String(n).padStart(2, '0');

const toDateOnly = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * The local calendar day of 'YYYY-MM-DD' (or of a full timestamp, taken as the
 * day it falls on here), as a Date at local midnight; null if it is not a date.
 */
export const parseDateOnly = (value?: string | null): Date | null => {
  const match = value ? DATE_ONLY.exec(value) : null;
  if (!match) return null;
  if (match[4]) {
    const moment = new Date(value as string);
    return isNaN(moment.getTime()) ? null : new Date(moment.getFullYear(), moment.getMonth(), moment.getDate());
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

/** For display, in the browser's locale; `fallback` when there is no date. */
export const formatDateOnly = (value?: string | null, fallback = '-'): string => {
  const date = parseDateOnly(value);
  return date ? date.toLocaleDateString() : fallback;
};

/** The value an <input type="date"> expects: 'YYYY-MM-DD', or '' when empty. */
export const toDateInputValue = (value?: string | null): string => {
  const date = parseDateOnly(value);
  return date ? toDateOnly(date) : '';
};

/** Today's local calendar date, as 'YYYY-MM-DD'. */
export const todayDateOnly = (): string => toDateOnly(new Date());

/** The local calendar date `days` from today, as 'YYYY-MM-DD'. */
export const dateOnlyFromToday = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateOnly(date);
};

/** True when the calendar date is before today (so a due date on it has passed). */
export const isBeforeToday = (value?: string | null): boolean => {
  const date = parseDateOnly(value);
  return date ? toDateOnly(date) < todayDateOnly() : false;
};
