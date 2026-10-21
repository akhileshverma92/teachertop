import type { TeacherInput } from '@/lib/teachers'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(String).map((s) => s.trim()).filter(Boolean)
}

function parseSubscribers(raw: unknown): number {
  if (typeof raw === 'number') return Math.max(0, Math.round(raw))
  const text = String(raw ?? '0').trim().toUpperCase()
  const num = parseFloat(text)
  if (!Number.isFinite(num)) return 0
  if (text.endsWith('M')) return Math.round(num * 1_000_000)
  if (text.endsWith('K')) return Math.round(num * 1_000)
  return Math.round(num)
}

/** Normalize one educator object (nested schema or loose JSON) into TeacherInput. */
export function normalizeEducatorJson(raw: unknown, index: number): TeacherInput {
  const data = asRecord(raw)
  const youtube = asRecord(data.youtube)
  const education = asRecord(data.education)
  const rating = asRecord(data.rating)
  const ranking = asRecord(data.ranking)
  const community = asRecord(data.community)
  const profile = asRecord(data.profile)

  const name = String(data.name ?? '').trim()
  if (!name) throw new Error(`Item ${index + 1}: "name" is required`)

  const handle = String(
    youtube.channel_handle ?? data.channel_handle ?? data.handle ?? '',
  ).trim()
  if (!handle) throw new Error(`Item ${index + 1} (${name}): youtube.channel_handle is required`)

  const subjects = asStringArray(education.subjects).length
    ? asStringArray(education.subjects)
    : asStringArray(data.subjects)

  return {
    name,
    slug: String(data.slug ?? '').trim() || undefined,
    bio: String(data.bio ?? ''),
    avatar_url: String(
      data.avatar_url ??
        data.avatarUrl ??
        data.photoURL ??
        data.photo_url ??
        data.image_url ??
        data.image ??
        '',
    ).trim(),
    youtube: {
      channel_name: String(
        youtube.channel_name ?? data.channel_name ?? handle.replace(/^@/, ''),
      ),
      channel_handle: handle,
      channel_url: String(youtube.channel_url ?? data.channel_url ?? '') || undefined,
      subscriber_count: parseSubscribers(
        youtube.subscriber_count ?? data.subscriber_count ?? data.subscribers ?? 0,
      ),
    },
    education: {
      category: String(education.category ?? data.category ?? data.field ?? 'Academics'),
      subjects: subjects.length ? subjects : ['General'],
      language: asStringArray(education.language).length
        ? asStringArray(education.language)
        : ['Hindi', 'English'],
    },
    rating: {
      content: Number(rating.content ?? data.content ?? 75),
      teaching: Number(rating.teaching ?? data.teaching ?? 75),
      impact: Number(rating.impact ?? data.impact ?? 75),
      engagement: Number(rating.engagement ?? data.engagement ?? 75),
    },
    ranking: {
      daily_rank: Number(ranking.daily_rank ?? 0),
      weekly_rank: Number(ranking.weekly_rank ?? 0),
      monthly_rank: Number(ranking.monthly_rank ?? 0),
      all_time_rank: Number(ranking.all_time_rank ?? 0),
      weekly_growth_percent: Number(
        ranking.weekly_growth_percent ?? data.weekly_growth_percent ?? 0,
      ),
    },
    community: {
      total_votes: Number(community.total_votes ?? data.total_votes ?? data.votes ?? 0),
      watchlist_count: Number(community.watchlist_count ?? 0),
    },
    profile: {
      verified_channel: Boolean(profile.verified_channel ?? false),
      featured: Boolean(profile.featured ?? false),
    },
    color: String(data.color ?? 'from-amber-300 to-orange-500'),
    video: String(data.video ?? ''),
    badges: asStringArray(data.badges),
  }
}

/** Parse pasted JSON: array, `{ educators: [] }`, or `{ teachers: [] }`. */
export function parseEducatorBulkJson(text: string): TeacherInput[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON. Paste a valid JSON array or object.')
  }

  let list: unknown[] = []
  if (Array.isArray(parsed)) {
    list = parsed
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    if (Array.isArray(obj.educators)) list = obj.educators
    else if (Array.isArray(obj.teachers)) list = obj.teachers
    else if (Array.isArray(obj.data)) list = obj.data
    else list = [parsed]
  } else {
    throw new Error('JSON must be an array of educators or an object with educators/teachers.')
  }

  if (!list.length) throw new Error('No educators found in JSON.')

  return list.map((item, i) => normalizeEducatorJson(item, i))
}

export const BULK_JSON_EXAMPLE = `[
  {
    "slug": "alakh-pandey",
    "name": "Alakh Pandey",
    "bio": "Physics educator for competitive exams.",
    "avatar_url": "/educators/alakh-pandey.jpg",
    "youtube": {
      "channel_name": "Physics Wallah",
      "channel_handle": "@PhysicsWallah",
      "channel_url": "https://www.youtube.com/@PhysicsWallah",
      "subscriber_count": 11700000
    },
    "education": {
      "category": "Competitive Exams",
      "subjects": ["JEE", "NEET", "Physics"],
      "language": ["Hindi", "English"]
    },
    "rating": {
      "content": 95,
      "teaching": 96,
      "impact": 92,
      "engagement": 91
    },
    "ranking": {
      "daily_rank": 5,
      "weekly_rank": 8,
      "monthly_rank": 4,
      "all_time_rank": 3,
      "weekly_growth_percent": 32.8
    },
    "community": {
      "total_votes": 12500,
      "watchlist_count": 3200
    },
    "profile": {
      "verified_channel": false,
      "featured": true
    }
  }
]`
