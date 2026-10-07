/**
 * Calendar-day arithmetic on ISO 'YYYY-MM-DD' text, in UTC so no local offset
 * can shift a day. A rental period is a day on a calendar, not an instant.
 */
function parts(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** The number of days in a month, where month is 1-based. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Adds months, clamping the day to the end of the target month, so
 * 2026-01-31 plus one month is 2026-02-28.
 */
export function addMonths(iso: string, months: number): string {
  const { year, month, day } = parts(iso)
  const target = new Date(Date.UTC(year, month - 1 + months, 1))
  const targetYear = target.getUTCFullYear()
  const targetMonth = target.getUTCMonth() + 1
  const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonth))
  return toIso(new Date(Date.UTC(targetYear, targetMonth - 1, clampedDay)))
}

export function addDays(iso: string, days: number): string {
  const { year, month, day } = parts(iso)
  return toIso(new Date(Date.UTC(year, month - 1, day + days)))
}

/** Today in the Indonesian time zone, which is where the admin reads it. */
export function todayIso(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(now)
}

/** The last day of the month that starts on the given day. */
export function endOfMonth(iso: string): string {
  const { year, month } = parts(iso)
  return toIso(new Date(Date.UTC(year, month - 1, daysInMonth(year, month))))
}

export function isIsoDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const { year, month, day } = parts(value)
  if (month < 1 || month > 12) return false
  if (day < 1 || day > daysInMonth(year, month)) return false
  return toIso(new Date(Date.UTC(year, month - 1, day))) === value
}
