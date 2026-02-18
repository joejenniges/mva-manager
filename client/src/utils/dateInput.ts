// WHY: Native date/datetime-local inputs interpret 2-digit years literally.
// Typing "01/01/26" produces year 0026 (26 AD) instead of 2026. The browser
// stores this as the value and JS Date parses it to epoch ~0, displaying as
// 12/31/1969. This normalizes any year < 100 to the 2000s.
// WHY onBlur not onChange: The browser fires onChange per-keystroke in the year
// segment. Normalizing mid-typing corrupts the value -- typing "2026" would
// become 2002 → 0000 → 2002 → 2006 as each digit triggers normalization.
export function normalizeDateValue(value: string): string {
  if (!value) return value;
  const match = value.match(/^(\d{1,4})-/);
  if (match) {
    const year = parseInt(match[1], 10);
    if (year > 0 && year < 100) {
      return value.replace(/^\d{1,4}/, String(year + 2000));
    }
  }
  return value;
}
