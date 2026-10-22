// Pure date formatting for the note header (task 1.5.4).
// PRD/design: the header date is JetBrains Mono uppercase, e.g. "WED 21 OCT 2026".

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export function formatNoteHeader(date: Date): string {
  const wd = WEEKDAYS[date.getDay()];
  const d = String(date.getDate()).padStart(2, "0");
  const mon = MONTHS[date.getMonth()];
  const y = date.getFullYear();
  return `${wd} ${d} ${mon} ${y}`;
}

const WEEKDAYS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Note title for a non-today day, e.g. "Tuesday, 20 October 2026". */
export function titleForDate(date: Date): string {
  const wd = WEEKDAYS_FULL[date.getDay()];
  const mon = MONTHS_FULL[date.getMonth()];
  return `${wd}, ${date.getDate()} ${mon} ${date.getFullYear()}`;
}

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * Reflect-style hero date for the note H1, e.g. "Thu, October 22nd, 2026".
 * Keeps Vayu tokens (colour applied in CSS); this is the string only.
 */
export function formatReflectTitle(date: Date): string {
  const wd = WEEKDAYS_SHORT[date.getDay()];
  const mon = MONTHS_FULL[date.getMonth()];
  const day = date.getDate();
  return `${wd}, ${mon} ${day}${dayOrdinal(day)}, ${date.getFullYear()}`;
}
