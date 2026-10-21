/** Student Support score. Weights are starting points, not a measure of teaching quality. */

export const BOOST_WEIGHT = 50
export const LIKE_WEIGHT = 20
export const COMMENT_WEIGHT = 15
export const MOMENTUM_WEIGHT = 15

export const SUPPORT_WINDOW_DAYS = 30
export const MOMENTUM_DAYS = 7
export const COMMENT_CAP = 20
export const BOOSTS_PER_DAY = 10
export const COMMENTS_PER_DAY = 10

export type SupportCounts = {
  boosts: number
  likes: number
  comments: number
}

export type SupportParts = {
  boost: number
  likes: number
  comments: number
  momentum: number
}

export function emptyCounts(): SupportCounts {
  return { boosts: 0, likes: 0, comments: 0 }
}

/** Calendar day in India, as YYYYMMDD. */
export function dayKey(time = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date(time))
    .replaceAll('-', '')
}

export function addDays(key: string, delta: number): string {
  const year = Number(key.slice(0, 4))
  const month = Number(key.slice(4, 6))
  const day = Number(key.slice(6, 8))
  const date = new Date(Date.UTC(year, month - 1, day + delta))
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

/** Inclusive window ending `offset` days before today. */
export function windowKeys(today: string, length: number, offset = 0): string[] {
  return Array.from({ length }, (_, index) => addDays(today, -(offset + length - 1 - index)))
}

export function asCounts(value: unknown): SupportCounts {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    boosts: Math.max(0, Math.round(Number(record.boosts ?? 0) || 0)),
    likes: Math.max(0, Math.round(Number(record.likes ?? 0) || 0)),
    comments: Math.max(0, Math.round(Number(record.comments ?? 0) || 0)),
  }
}

export function readDayMap(value: unknown): Record<string, SupportCounts> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const days: Record<string, SupportCounts> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{8}$/.test(key)) continue
    days[key] = asCounts(raw)
  }
  return days
}

export function sumCounts(days: Record<string, SupportCounts>, keys: string[]): SupportCounts {
  const totals = emptyCounts()
  for (const key of keys) {
    const day = days[key]
    if (!day) continue
    totals.boosts += day.boosts
    totals.likes += day.likes
    totals.comments += day.comments
  }
  totals.comments = Math.min(COMMENT_CAP, totals.comments)
  return totals
}

/** log(1 + n) / log(1 + max). Raw totals never become the score. */
export function diminishing(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0
  return Math.log1p(value) / Math.log1p(max)
}

/** Recent Boosts compared with the previous period. 0 when nothing recent happened. */
export function momentumScore(recent: number, prior: number): number {
  if (recent <= 0) return 0
  return recent / (recent + Math.max(0, prior))
}

/** R = 50B + 20L + 15C + 15M, with each part between 0 and 1. */
export function supportScore(parts: SupportParts): number {
  return (
    BOOST_WEIGHT * parts.boost +
    LIKE_WEIGHT * parts.likes +
    COMMENT_WEIGHT * parts.comments +
    MOMENTUM_WEIGHT * parts.momentum
  )
}

export function formatScore(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function boostsUsedOnDay(boostDay: string, boostsToday: number, now = Date.now()): number {
  return boostDay === dayKey(now) ? Math.max(0, boostsToday) : 0
}

export function commentsUsedOnDay(commentDay: string, commentsToday: number, now = Date.now()): number {
  return commentDay === dayKey(now) ? Math.max(0, commentsToday) : 0
}

export function pruneDays(days: Record<string, SupportCounts>, today: string, keep = 60) {
  const oldest = addDays(today, -(keep - 1))
  const next: Record<string, SupportCounts> = {}
  for (const [key, counts] of Object.entries(days)) {
    if (key >= oldest && key <= today) next[key] = counts
  }
  return next
}

export function bumpDay(
  days: Record<string, SupportCounts>,
  today: string,
  day: string,
  field: keyof SupportCounts,
  delta: number,
) {
  const next = pruneDays(days, today)
  const current = next[day] ?? emptyCounts()
  next[day] = {
    ...current,
    [field]: Math.max(0, current[field] + delta),
  }
  return next
}
