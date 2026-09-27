import {
  dateOnlyFromToday,
  formatDateOnly,
  isBeforeToday,
  parseDateOnly,
  toDateInputValue,
  todayDateOnly,
} from './dates';

describe('parseDateOnly', () => {
  it('reads a calendar date as that day, locally', () => {
    const date = parseDateOnly('2026-10-11') as Date;
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 11, 0]);
  });

  it('takes a full timestamp as the local day it falls on', () => {
    const moment = new Date(2026, 9, 11, 22, 30);
    const date = parseDateOnly(moment.toISOString()) as Date;
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 11]);
  });

  it('returns null for anything that is not a date', () => {
    expect(parseDateOnly(undefined)).toBeNull();
    expect(parseDateOnly('')).toBeNull();
    expect(parseDateOnly('11/10/2026')).toBeNull();
  });
});

describe('formatDateOnly', () => {
  it('shows the same calendar day it was given', () => {
    expect(formatDateOnly('2026-10-11')).toBe(new Date(2026, 9, 11).toLocaleDateString());
  });

  it('shows the fallback when there is no date', () => {
    expect(formatDateOnly(null)).toBe('-');
    expect(formatDateOnly(undefined, 'Not provided')).toBe('Not provided');
  });
});

describe('toDateInputValue', () => {
  it('gives a date input its YYYY-MM-DD value', () => {
    expect(toDateInputValue('2008-01-01')).toBe('2008-01-01');
    expect(toDateInputValue(new Date(2008, 0, 1, 12).toISOString())).toBe('2008-01-01');
    expect(toDateInputValue(null)).toBe('');
  });
});

describe('today and relative dates', () => {
  it('uses the local calendar, not UTC', () => {
    const now = new Date();
    const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(todayDateOnly()).toBe(local);
    expect(dateOnlyFromToday(0)).toBe(local);
  });

  it('knows which due dates have passed', () => {
    expect(isBeforeToday(dateOnlyFromToday(-1))).toBe(true);
    expect(isBeforeToday(todayDateOnly())).toBe(false);
    expect(isBeforeToday(dateOnlyFromToday(1))).toBe(false);
    expect(isBeforeToday(null)).toBe(false);
  });
});
