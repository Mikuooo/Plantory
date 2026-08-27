import {
  addDays,
  getDateFromKey,
  getDateKey,
  getMonth,
  getWeek,
  getWeekAnchor,
} from '@/components/calendar/calendar-date-utils';

describe('calendar date utilities', () => {
  test('round trips a local calendar key', () => {
    const date = getDateFromKey('2026-08-28');
    expect(getDateKey(date)).toBe('2026-08-28');
  });

  test('builds Monday-based weeks across month boundaries', () => {
    const anchor = getWeekAnchor(new Date(2026, 7, 1));
    expect(getDateKey(anchor)).toBe('2026-07-27');
    expect(getWeek(new Date(2026, 7, 1)).map(getDateKey)).toEqual([
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
    ]);
  });

  test('builds complete five or six week month grids', () => {
    const august = getMonth(new Date(2026, 7, 1));
    const november = getMonth(new Date(2026, 10, 1));

    expect(august).toHaveLength(42);
    expect(november).toHaveLength(42);
    expect(getDateKey(august[0])).toBe('2026-07-27');
    expect(getDateKey(august.at(-1)!)).toBe('2026-09-06');
  });

  test('adds days without mutating the input', () => {
    const date = new Date(2026, 7, 28);
    expect(getDateKey(addDays(date, 7))).toBe('2026-09-04');
    expect(getDateKey(date)).toBe('2026-08-28');
  });
});
