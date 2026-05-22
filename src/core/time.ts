/** Small deterministic helpers for time math and id generation. */

/** Parse "HH:mm" into minutes since midnight. */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
}

/** Format minutes since midnight back into "HH:mm". */
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Absolute gap in minutes between two "HH:mm" strings. */
export function minuteGap(a: string, b: string): number {
  return Math.abs(timeToMinutes(a) - timeToMinutes(b));
}

/** Day of week for a YYYY-MM-DD date, in UTC to stay deterministic. */
export function dayOfWeek(date: string): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const d = new Date(`${date}T12:00:00Z`);
  return days[d.getUTCDay()];
}

/** Coarse time bucket used in fingerprints. */
export function timeBucket(
  hhmm: string,
): "early" | "morning" | "midday" | "twilight" {
  const m = timeToMinutes(hhmm);
  if (m < timeToMinutes("08:00")) return "early";
  if (m < timeToMinutes("12:00")) return "morning";
  if (m < timeToMinutes("15:00")) return "midday";
  return "twilight";
}

/** 30-minute slot bucket, e.g. "0900-0929". */
export function slotBucket(hhmm: string): string {
  const m = timeToMinutes(hhmm);
  const start = Math.floor(m / 30) * 30;
  const end = start + 29;
  return `${minutesToTime(start).replace(":", "")}-${minutesToTime(end).replace(":", "")}`;
}

/** Player-count bucket. */
export function playerBucket(n: number): "single" | "pair" | "group" {
  if (n <= 1) return "single";
  if (n <= 3) return "pair";
  return "group";
}

let counter = 0;
/** Short, sortable-enough unique id with a prefix. */
export function makeId(prefix: string): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Minutes from `now` until a tee time at `date` + `startTime`. Treats the
 * date+time as a UTC instant — fine for the alpha since the demo course's
 * single date is fixed and the comparison is bucket-sized (30 min). Returns
 * a negative number for tee times already in the past.
 */
export function minutesUntilTeeTime(
  date: string,
  startTime: string,
  now: Date = new Date(),
): number {
  const teeAt = new Date(`${date}T${startTime}:00Z`).getTime();
  return Math.round((teeAt - now.getTime()) / 60000);
}
