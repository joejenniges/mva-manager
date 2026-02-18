export type RecurrencePreset = "none" | "daily" | "weekly" | "monthly-ordinal" | "annually" | "custom";

export interface RecurrenceRule {
  preset: RecurrencePreset;
  interval: number;
  unit: "day" | "week" | "month" | "year";
  weekdays: number[]; // 0=Sun..6=Sat, used when unit === "week"
  ends: "never" | "on" | "after";
  endDate: string; // YYYY-MM-DD
  endCount: number;
}

export const MAX_OCCURRENCES = 52;

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const ORDINAL_LABELS = ["first", "second", "third", "fourth", "fifth"];

export function defaultRecurrenceRule(): RecurrenceRule {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  return {
    preset: "none",
    interval: 1,
    unit: "week",
    weekdays: [],
    ends: "after",
    endDate: formatLocalDate(oneYearFromNow),
    endCount: 12,
  };
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Which Nth weekday of the month a date falls on. E.g. 3rd Wednesday → { nth: 3, weekday: 3 } */
export function getOrdinalWeekday(date: Date): { nth: number; weekday: number } {
  const weekday = date.getDay();
  const dayOfMonth = date.getDate();
  const nth = Math.ceil(dayOfMonth / 7);
  return { nth, weekday };
}

/** Get the Nth occurrence of a weekday in a given month. Returns null if it doesn't exist. */
export function getNthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date | null {
  // Find the first occurrence of this weekday in the month
  const first = new Date(year, month, 1);
  let dayOfMonth = 1 + ((weekday - first.getDay() + 7) % 7);
  // Advance to the nth occurrence
  dayOfMonth += (nth - 1) * 7;
  const result = new Date(year, month, dayOfMonth);
  // Verify we're still in the same month
  if (result.getMonth() !== month) return null;
  return result;
}

export function getPresetOptions(startDate: string): { label: string; value: RecurrencePreset }[] {
  const d = new Date(startDate);
  const weekdayName = WEEKDAY_NAMES[d.getDay()];
  const { nth } = getOrdinalWeekday(d);
  const ordinalLabel = ORDINAL_LABELS[nth - 1] || `${nth}th`;
  const monthName = MONTH_NAMES[d.getMonth()];
  const dayOfMonth = d.getDate();

  return [
    { label: "Does not repeat", value: "none" },
    { label: "Daily", value: "daily" },
    { label: `Weekly on ${weekdayName}`, value: "weekly" },
    { label: `Monthly on the ${ordinalLabel} ${weekdayName}`, value: "monthly-ordinal" },
    { label: `Annually on ${monthName} ${dayOfMonth}`, value: "annually" },
    { label: "Custom...", value: "custom" },
  ];
}

export function generateRecurrenceDates(startDateISO: string, rule: RecurrenceRule): string[] {
  if (rule.preset === "none") return [startDateISO];

  const start = new Date(startDateISO);
  const dates: string[] = [startDateISO];

  const maxCount = rule.ends === "after" ? Math.min(rule.endCount, MAX_OCCURRENCES)
    : rule.ends === "never" ? MAX_OCCURRENCES
    : MAX_OCCURRENCES;

  const endDate = rule.ends === "on" ? new Date(rule.endDate + "T23:59:59") : null;

  function shouldStop(d: Date, count: number): boolean {
    if (count >= maxCount) return true;
    if (endDate && d > endDate) return true;
    return false;
  }

  const startHours = start.getHours();
  const startMinutes = start.getMinutes();

  function withTime(d: Date): Date {
    const result = new Date(d);
    result.setHours(startHours, startMinutes, 0, 0);
    return result;
  }

  function toISO(d: Date): string {
    return d.toISOString();
  }

  if (rule.preset === "daily") {
    for (let i = 1; !shouldStop(start, dates.length); i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      if (shouldStop(d, dates.length)) break;
      dates.push(toISO(d));
    }
  } else if (rule.preset === "weekly") {
    for (let i = 1; !shouldStop(start, dates.length); i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i * 7);
      if (shouldStop(d, dates.length)) break;
      dates.push(toISO(d));
    }
  } else if (rule.preset === "monthly-ordinal") {
    const { nth, weekday } = getOrdinalWeekday(start);
    let year = start.getFullYear();
    let month = start.getMonth();
    for (let i = 1; !shouldStop(start, dates.length); i++) {
      month++;
      if (month > 11) { month = 0; year++; }
      const d = getNthWeekdayOfMonth(year, month, weekday, nth);
      if (!d) continue; // skip months where the nth weekday doesn't exist
      const withT = withTime(d);
      if (shouldStop(withT, dates.length)) break;
      dates.push(toISO(withT));
    }
  } else if (rule.preset === "annually") {
    const monthIdx = start.getMonth();
    const dayOfMonth = start.getDate();
    for (let i = 1; !shouldStop(start, dates.length); i++) {
      const year = start.getFullYear() + i;
      // Handle Feb 29 → Feb 28 in non-leap years
      const lastDay = new Date(year, monthIdx + 1, 0).getDate();
      const day = Math.min(dayOfMonth, lastDay);
      const d = new Date(year, monthIdx, day, startHours, startMinutes);
      if (shouldStop(d, dates.length)) break;
      dates.push(toISO(d));
    }
  } else if (rule.preset === "custom") {
    return generateCustomDates(startDateISO, rule);
  }

  return dates;
}

function generateCustomDates(startDateISO: string, rule: RecurrenceRule): string[] {
  const start = new Date(startDateISO);
  const dates: string[] = [startDateISO];
  const startHours = start.getHours();
  const startMinutes = start.getMinutes();

  const maxCount = rule.ends === "after" ? Math.min(rule.endCount, MAX_OCCURRENCES)
    : rule.ends === "never" ? MAX_OCCURRENCES
    : MAX_OCCURRENCES;

  const endDate = rule.ends === "on" ? new Date(rule.endDate + "T23:59:59") : null;

  function shouldStop(d: Date, count: number): boolean {
    if (count >= maxCount) return true;
    if (endDate && d > endDate) return true;
    return false;
  }

  if (rule.unit === "day") {
    for (let i = 1; !shouldStop(start, dates.length); i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i * rule.interval);
      if (shouldStop(d, dates.length)) break;
      dates.push(d.toISOString());
    }
  } else if (rule.unit === "week") {
    const weekdays = rule.weekdays.length > 0 ? [...rule.weekdays].sort((a, b) => a - b) : [start.getDay()];

    // Generate week-by-week, picking the selected weekdays each week
    const startWeekday = start.getDay();
    let weekOffset = 0;

    // First partial week: remaining selected weekdays after start date's weekday (same week)
    for (const wd of weekdays) {
      if (wd <= startWeekday) continue; // already past or is start date
      const diff = wd - startWeekday;
      const d = new Date(start);
      d.setDate(d.getDate() + diff);
      if (shouldStop(d, dates.length)) return dates;
      dates.push(d.toISOString());
    }

    // Subsequent weeks
    while (!shouldStop(start, dates.length)) {
      weekOffset += rule.interval;
      for (const wd of weekdays) {
        const diff = weekOffset * 7 + (wd - startWeekday);
        const d = new Date(start);
        d.setDate(d.getDate() + diff);
        if (shouldStop(d, dates.length)) return dates;
        dates.push(d.toISOString());
      }
    }
  } else if (rule.unit === "month") {
    const dayOfMonth = start.getDate();
    let year = start.getFullYear();
    let month = start.getMonth();
    for (let i = 1; !shouldStop(start, dates.length); i++) {
      month += rule.interval;
      while (month > 11) { month -= 12; year++; }
      const lastDay = new Date(year, month + 1, 0).getDate();
      const day = Math.min(dayOfMonth, lastDay);
      const d = new Date(year, month, day, startHours, startMinutes);
      if (shouldStop(d, dates.length)) break;
      dates.push(d.toISOString());
    }
  } else if (rule.unit === "year") {
    const monthIdx = start.getMonth();
    const dayOfMonth = start.getDate();
    for (let i = 1; !shouldStop(start, dates.length); i++) {
      const year = start.getFullYear() + i * rule.interval;
      const lastDay = new Date(year, monthIdx + 1, 0).getDate();
      const day = Math.min(dayOfMonth, lastDay);
      const d = new Date(year, monthIdx, day, startHours, startMinutes);
      if (shouldStop(d, dates.length)) break;
      dates.push(d.toISOString());
    }
  }

  return dates;
}
