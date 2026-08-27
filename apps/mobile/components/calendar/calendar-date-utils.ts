export function getDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function getDateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function getMondayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

export function getWeek(date: Date) {
  const start = addDays(date, -getMondayIndex(date));
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getWeekAnchor(date: Date) {
  return addDays(date, -getMondayIndex(date));
}

export function getMonth(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayIndex = getMondayIndex(firstDay);
  const start = addDays(firstDay, -firstDayIndex);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const dayCount = Math.max(35, Math.ceil((firstDayIndex + daysInMonth) / 7) * 7);
  return Array.from({ length: dayCount }, (_, index) => addDays(start, index));
}
