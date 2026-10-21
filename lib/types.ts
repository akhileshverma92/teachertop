import type { SupportCounts, SupportParts } from '@/lib/score'
import type { EducatorTier } from '@/lib/tiers'

export type UserRole = 'student' | 'admin'

export type UserProfile = {
  uid: string
  email: string
  displayName: string
  photoURL: string
  role: UserRole
  votesUsed: number
  votedTeacherIds: string[]
  /** YYYYMMDD in Asia/Kolkata. Daily allowances reset when these change. */
  boostDay: string
  boostsToday: number
  commentDay: string
  commentsToday: number
  lastVoteAt: number
  likedTeacherIds: string[]
  createdAt: number
  updatedAt: number
}

export type EducatorYoutube = {
  channel_name: string
  channel_handle: string
  channel_url: string
  subscriber_count: number
}

export type EducatorEducation = {
  category: string
  subjects: string[]
  language: string[]
}

export type EducatorRating = {
  overall: number
  content: number
  teaching: number
  impact: number
  engagement: number
  tier: EducatorTier
}

export type EducatorRanking = {
  daily_rank: number
  weekly_rank: number
  monthly_rank: number
  all_time_rank: number
  weekly_growth_percent: number
}

export type EducatorCommunity = {
  total_votes: number
  watchlist_count: number
}

export type TeacherSupport = {
  days: Record<string, SupportCounts>
  allTime: SupportCounts
}

/** Computed on the client from student activity. Same formula in every category. */
export type SupportView = {
  score30: number
  score7: number
  scoreAll: number
  boostsToday: number
  globalRank: number
  categoryRank: number
  subjectRanks: { subject: string; rank: number }[]
  parts30: SupportParts
  partsAll: SupportParts
}

export type EducatorProfileMeta = {
  verified_channel: boolean
  featured: boolean
  created_at: string
}

/** Canonical educator document stored in Firestore `teachers`. */
export type Teacher = {
  id: string
  slug: string
  name: string
  bio: string
  avatar_url: string
  youtube: EducatorYoutube
  education: EducatorEducation
  rating: EducatorRating
  ranking: EducatorRanking
  community: EducatorCommunity
  support: TeacherSupport
  /** Present after the board ranks teachers. Subscriber count is not an input. */
  supportView?: SupportView
  profile: EducatorProfileMeta
  /** UI accent gradient (not in public schema; kept for cards). */
  color: string
  video: string
  badges: string[]
  updatedAt: number
}

export type Vote = {
  id: string
  userId: string
  teacherId: string
  createdAt: number
}

export const TEACHER_FIELDS = [
  'Competitive Exams',
  'UPSC / Govt',
  'Academics',
  'Professional / Tech',
] as const

export const COLOR_OPTIONS = [
  'from-amber-300 to-orange-500',
  'from-slate-300 to-slate-500',
  'from-cyan-300 to-blue-600',
  'from-pink-300 to-rose-500',
  'from-emerald-300 to-teal-600',
  'from-violet-300 to-indigo-600',
] as const

/** Format subscriber integers like 11700000 → "11.7M". */
export function formatSubscribers(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return '0'
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(Math.round(count))
}

export function formatGrowth(percent: number): string {
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent.toFixed(1)}%`
}

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}
