// When a time-of-day ritual may appear. Morning and evening never overlap.

export type Ritual = "morning" | "evening";

/** Morning 05:00–11:59. Evening 17:00–23:59. Afternoon shows neither. */
export function ritualFor(date: Date): Ritual | null {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 17) return "evening";
  return null;
}

const eveningKey = (date: string) => `vayu-evening-${date}`;

export function eveningClosed(date: string): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(eveningKey(date)) === "done";
}

export function closeEvening(date: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(eveningKey(date), "done");
}
