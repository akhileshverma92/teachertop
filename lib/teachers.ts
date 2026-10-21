import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db, MAX_STUDENT_VOTES } from '@/lib/firebase'
import {
  asCounts,
  bumpDay,
  dayKey,
  emptyCounts,
  readDayMap,
} from '@/lib/score'
import { assignTier, clamp, computeRtg } from '@/lib/tiers'
import { resolveAvatarUrl } from '@/lib/avatar'
import {
  formatSubscribers,
  initialsFromName,
  slugifyName,
  type Teacher,
} from '@/lib/types'

export type TeacherInput = {
  name: string
  bio?: string
  avatar_url?: string
  slug?: string
  youtube: {
    channel_name: string
    channel_handle: string
    channel_url?: string
    subscriber_count: number
  }
  education: {
    category: string
    subjects: string[]
    language?: string[]
  }
  rating: {
    content: number
    teaching: number
    impact: number
    engagement: number
  }
  ranking?: {
    daily_rank?: number
    weekly_rank?: number
    monthly_rank?: number
    all_time_rank?: number
    weekly_growth_percent?: number
  }
  community?: {
    total_votes?: number
    watchlist_count?: number
  }
  profile?: {
    verified_channel?: boolean
    featured?: boolean
  }
  color?: string
  video?: string
  badges?: string[]
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function parseSubscribers(raw: unknown): number {
  if (typeof raw === 'number') return raw
  const text = String(raw ?? '0').trim().toUpperCase()
  const num = parseFloat(text)
  if (!Number.isFinite(num)) return 0
  if (text.endsWith('M')) return Math.round(num * 1_000_000)
  if (text.endsWith('K')) return Math.round(num * 1_000)
  return Math.round(num)
}

function parseGrowth(raw: unknown): number {
  if (typeof raw === 'number') return raw
  const n = parseFloat(String(raw ?? '0').replace('%', ''))
  return Number.isFinite(n) ? n : 0
}

/** Normalize nested schema + legacy flat docs into one Teacher shape. */
export function mapTeacher(id: string, data: Record<string, unknown>): Teacher {
  const youtube = asRecord(data.youtube)
  const education = asRecord(data.education)
  const rating = asRecord(data.rating)
  const ranking = asRecord(data.ranking)
  const community = asRecord(data.community)
  const profile = asRecord(data.profile)

  const content = clamp(Number(rating.content ?? data.content ?? 70))
  const teaching = clamp(Number(rating.teaching ?? data.teaching ?? 70))
  const impact = clamp(Number(rating.impact ?? data.impact ?? 70))
  const engagement = clamp(Number(rating.engagement ?? data.engagement ?? 70))
  const overall =
    rating.overall != null
      ? Math.round(Number(rating.overall))
      : data.score != null
        ? Math.round(Number(data.score))
        : computeRtg({ content, teaching, impact, engagement })

  const handle = String(
    youtube.channel_handle ?? data.handle ?? '',
  )
  const channelName = String(
    youtube.channel_name ?? (handle.replace(/^@/, '') || 'Channel'),
  )
  const subjects = Array.isArray(education.subjects)
    ? education.subjects.map(String)
    : Array.isArray(data.subjects)
      ? data.subjects.map(String)
      : String(data.specialty ?? '')
          .split(/[·|,/]/)
          .map((s) => s.trim())
          .filter(Boolean)

  const name = String(data.name ?? '')
  const slug = String(data.slug ?? (slugifyName(name) || id))
  const subscriberCount = parseSubscribers(
    youtube.subscriber_count ?? data.subscribers ?? 0,
  )
  const growth = parseGrowth(
    ranking.weekly_growth_percent ?? data.velocity ?? 0,
  )

  const rawAvatar = resolveAvatarUrl(
    String(
      data.avatar_url ??
        data.avatarUrl ??
        data.photoURL ??
        data.photo_url ??
        data.image_url ??
        data.image ??
        profile.avatar_url ??
        '',
    ),
  )

  return {
    id,
    slug,
    name,
    bio: String(data.bio ?? ''),
    avatar_url: rawAvatar,
    youtube: {
      channel_name: channelName,
      channel_handle: handle.startsWith('@') || !handle ? handle || `@${slug}` : `@${handle}`,
      channel_url: String(
        youtube.channel_url ??
          `https://www.youtube.com/${handle.startsWith('@') ? handle : `@${handle || slug}`}`,
      ),
      subscriber_count: subscriberCount,
    },
    education: {
      category: String(education.category ?? data.field ?? 'Academics'),
      subjects,
      language: Array.isArray(education.language)
        ? education.language.map(String)
        : ['Hindi', 'English'],
    },
    rating: {
      overall,
      content,
      teaching,
      impact,
      engagement,
      tier: assignTier(overall),
    },
    ranking: {
      daily_rank: Number(ranking.daily_rank ?? 0),
      weekly_rank: Number(ranking.weekly_rank ?? 0),
      monthly_rank: Number(ranking.monthly_rank ?? 0),
      all_time_rank: Number(ranking.all_time_rank ?? 0),
      weekly_growth_percent: growth,
    },
    community: {
      total_votes: Number(community.total_votes ?? data.votes ?? 0),
      watchlist_count: Number(community.watchlist_count ?? 0),
    },
    support: readSupport(data, Number(community.total_votes ?? data.votes ?? 0)),
    profile: {
      verified_channel: Boolean(profile.verified_channel ?? false),
      featured: Boolean(profile.featured ?? false),
      created_at: String(
        profile.created_at ??
          (data.createdAt
            ? new Date(Number(data.createdAt)).toISOString()
            : new Date().toISOString()),
      ),
    },
    color: String(data.color ?? 'from-amber-300 to-orange-500'),
    video: String(data.video ?? ''),
    badges: Array.isArray(data.badges) ? data.badges.map(String) : [],
    updatedAt: Number(data.updatedAt ?? Date.now()),
  }
}

function buildEducatorDoc(input: TeacherInput, existingId?: string) {
  const content = clamp(Number(input.rating.content ?? 70))
  const teaching = clamp(Number(input.rating.teaching ?? 70))
  const impact = clamp(Number(input.rating.impact ?? 70))
  const engagement = clamp(Number(input.rating.engagement ?? 70))
  const overall = computeRtg({ content, teaching, impact, engagement })
  const handle = input.youtube.channel_handle.startsWith('@')
    ? input.youtube.channel_handle
    : `@${input.youtube.channel_handle.replace(/^@/, '')}`
  const slug = input.slug?.trim() || slugifyName(input.name)
  const nowIso = new Date().toISOString()

  return {
    slug,
    name: input.name.trim(),
    bio: input.bio?.trim() || '',
    avatar_url: input.avatar_url?.trim() || '',
    youtube: {
      channel_name: input.youtube.channel_name.trim() || handle.replace(/^@/, ''),
      channel_handle: handle,
      channel_url:
        input.youtube.channel_url?.trim() || `https://www.youtube.com/${handle}`,
      subscriber_count: Math.max(0, Math.round(input.youtube.subscriber_count || 0)),
    },
    education: {
      category: input.education.category,
      subjects: input.education.subjects.filter(Boolean),
      language: input.education.language?.length
        ? input.education.language
        : ['Hindi', 'English'],
    },
    rating: {
      overall,
      content: Number(content.toFixed(1)),
      teaching: Number(teaching.toFixed(1)),
      impact: Number(impact.toFixed(1)),
      engagement: Number(engagement.toFixed(1)),
      tier: assignTier(overall),
    },
    ranking: {
      daily_rank: input.ranking?.daily_rank ?? 0,
      weekly_rank: input.ranking?.weekly_rank ?? 0,
      monthly_rank: input.ranking?.monthly_rank ?? 0,
      all_time_rank: input.ranking?.all_time_rank ?? 0,
      weekly_growth_percent: input.ranking?.weekly_growth_percent ?? 0,
    },
    community: {
      total_votes: input.community?.total_votes ?? 0,
      watchlist_count: input.community?.watchlist_count ?? 0,
    },
    profile: {
      verified_channel: input.profile?.verified_channel ?? false,
      featured: input.profile?.featured ?? false,
      created_at: nowIso,
    },
    color: input.color ?? 'from-amber-300 to-orange-500',
    video: input.video ?? '',
    badges: input.badges ?? [],
    // Legacy flat mirrors so old queries/rules still work during migration
    score: overall,
    tier: assignTier(overall),
    content: Number(content.toFixed(1)),
    teaching: Number(teaching.toFixed(1)),
    impact: Number(impact.toFixed(1)),
    engagement: Number(engagement.toFixed(1)),
    votes: input.community?.total_votes ?? 0,
    handle,
    field: input.education.category,
    specialty: input.education.subjects.join(' · '),
    subjects: input.education.subjects,
    subscribers: formatSubscribers(input.youtube.subscriber_count || 0),
    velocity: `${(input.ranking?.weekly_growth_percent ?? 0) >= 0 ? '+' : ''}${(input.ranking?.weekly_growth_percent ?? 0).toFixed(1)}%`,
    photoURL: input.avatar_url ?? '',
    initials: initialsFromName(input.name),
    ...(existingId ? {} : {}),
  }
}

export function subscribeTeachers(onChange: (teachers: Teacher[]) => void): Unsubscribe {
  // Prefer nested community.total_votes; fall back to legacy `votes` if needed.
  let activeUnsub: Unsubscribe | null = null
  let cancelled = false

  const attach = (field: 'community.total_votes' | 'votes') => {
    const q = query(collection(db, 'teachers'), orderBy(field, 'desc'))
    activeUnsub = onSnapshot(
      q,
      (snap) => {
        onChange(snap.docs.map((d) => mapTeacher(d.id, d.data())))
      },
      () => {
        if (cancelled) return
        if (field === 'community.total_votes') {
          activeUnsub?.()
          attach('votes')
        }
      },
    )
  }

  attach('community.total_votes')

  return () => {
    cancelled = true
    activeUnsub?.()
  }
}

export async function listTeachers(): Promise<Teacher[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'teachers'), orderBy('community.total_votes', 'desc')),
    )
    return snap.docs.map((d) => mapTeacher(d.id, d.data()))
  } catch {
    const snap = await getDocs(query(collection(db, 'teachers'), orderBy('votes', 'desc')))
    return snap.docs.map((d) => mapTeacher(d.id, d.data()))
  }
}

export async function createTeacher(input: TeacherInput): Promise<string> {
  const now = Date.now()
  const docData = buildEducatorDoc(input)
  const ref = await addDoc(collection(db, 'teachers'), {
    ...docData,
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

/** Publish many educators from bulk JSON (sequential; returns created ids). */
export async function bulkCreateTeachers(
  inputs: TeacherInput[],
): Promise<{ created: string[]; failed: { index: number; name: string; error: string }[] }> {
  const created: string[] = []
  const failed: { index: number; name: string; error: string }[] = []

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    try {
      const id = await createTeacher(input)
      created.push(id)
    } catch (err) {
      failed.push({
        index: i,
        name: input.name || `Item ${i + 1}`,
        error: err instanceof Error ? err.message : 'Create failed',
      })
    }
  }

  return { created, failed }
}

export async function updateTeacher(id: string, input: TeacherInput): Promise<void> {
  const docData = buildEducatorDoc(input, id)
  await updateDoc(doc(db, 'teachers', id), {
    ...docData,
    updatedAt: Date.now(),
  })
}

export async function deleteTeacher(id: string): Promise<void> {
  await deleteDoc(doc(db, 'teachers', id))
}

function readSupport(data: Record<string, unknown>, legacyVotes: number) {
  const support = asRecord(data.support)
  const hasAllTime = support.allTime != null
  return {
    days: readDayMap(support.days),
    allTime: hasAllTime ? asCounts(support.allTime) : { ...emptyCounts(), boosts: Math.max(0, legacyVotes) },
  }
}

/** Cast one vote. A student can vote for any teacher more than once, up to 10 times a day. */
export async function castVote(userId: string, teacherId: string): Promise<{ votesUsed: number }> {
  const userRef = doc(db, 'users', userId)
  const teacherRef = doc(db, 'teachers', teacherId)
  const voteId = `${userId}_${teacherId}_${Date.now()}`
  const voteRef = doc(db, 'votes', voteId)

  return runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef)
    if (!userSnap.exists()) throw new Error('Complete your profile before voting.')

    const user = userSnap.data()
    const now = Date.now()
    const today = dayKey(now)
    const usedToday = user.boostDay === today ? Number(user.boostsToday ?? 0) : 0
    if (usedToday >= MAX_STUDENT_VOTES) {
      throw new Error(`You have used all ${MAX_STUDENT_VOTES} votes for today.`)
    }

    const teacherSnap = await tx.get(teacherRef)
    if (!teacherSnap.exists()) throw new Error('Teacher not found.')
    const teacherData = teacherSnap.data()
    const mapped = mapTeacher(teacherId, teacherData)
    const days = bumpDay(mapped.support.days, today, today, 'boosts', 1)
    const allTime = {
      ...mapped.support.allTime,
      boosts: mapped.support.allTime.boosts + 1,
    }

    const votedTeacherIds: string[] = Array.isArray(user.votedTeacherIds)
      ? user.votedTeacherIds.map(String)
      : []

    tx.set(voteRef, {
      userId,
      teacherId,
      createdAt: now,
      day: today,
      serverCreatedAt: serverTimestamp(),
    })

    tx.update(userRef, {
      boostDay: today,
      boostsToday: usedToday + 1,
      lastVoteAt: now,
      votedTeacherIds: votedTeacherIds.includes(teacherId)
        ? votedTeacherIds
        : [...votedTeacherIds, teacherId],
      updatedAt: now,
    })

    tx.update(teacherRef, {
      'community.total_votes': increment(1),
      votes: increment(1),
      support: { days, allTime },
      updatedAt: now,
    })

    return { votesUsed: usedToday + 1 }
  })
}

/** One Like per student per teacher. Unliking removes it. */
export async function toggleLike(userId: string, teacherId: string): Promise<{ liked: boolean }> {
  const userRef = doc(db, 'users', userId)
  const teacherRef = doc(db, 'teachers', teacherId)
  const likeRef = doc(db, 'likes', `${userId}_${teacherId}`)

  return runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef)
    const teacherSnap = await tx.get(teacherRef)
    const likeSnap = await tx.get(likeRef)
    if (!userSnap.exists()) throw new Error('Complete your profile before liking.')
    if (!teacherSnap.exists()) throw new Error('Teacher not found.')

    const now = Date.now()
    const today = dayKey(now)
    const mapped = mapTeacher(teacherId, teacherSnap.data())
    const likedIds: string[] = Array.isArray(userSnap.data().likedTeacherIds)
      ? userSnap.data().likedTeacherIds.map(String)
      : []

    if (likeSnap.exists()) {
      const likedDay = String(likeSnap.data().day ?? today)
      const days = bumpDay(mapped.support.days, today, likedDay, 'likes', -1)
      tx.delete(likeRef)
      tx.update(userRef, {
        likedTeacherIds: likedIds.filter((id) => id !== teacherId),
        updatedAt: now,
      })
      tx.update(teacherRef, {
        support: {
          days,
          allTime: {
            ...mapped.support.allTime,
            likes: Math.max(0, mapped.support.allTime.likes - 1),
          },
        },
        updatedAt: now,
      })
      return { liked: false }
    }

    const days = bumpDay(mapped.support.days, today, today, 'likes', 1)
    tx.set(likeRef, { userId, teacherId, createdAt: now, day: today })
    tx.update(userRef, {
      likedTeacherIds: likedIds.includes(teacherId) ? likedIds : [...likedIds, teacherId],
      updatedAt: now,
    })
    tx.update(teacherRef, {
      support: {
        days,
        allTime: { ...mapped.support.allTime, likes: mapped.support.allTime.likes + 1 },
      },
      updatedAt: now,
    })
    return { liked: true }
  })
}

export { initialsFromName }

export const SEED_TEACHERS: TeacherInput[] = [
  {
    name: 'Alakh Pandey',
    slug: 'alakh-pandey',
    bio: 'Physics educator known for helping students prepare for competitive examinations.',
    avatar_url: '/educators/alakh-pandey.jpg',
    youtube: {
      channel_name: 'Physics Wallah',
      channel_handle: '@PhysicsWallah',
      channel_url: 'https://www.youtube.com/@PhysicsWallah',
      subscriber_count: 11_700_000,
    },
    education: {
      category: 'Competitive Exams',
      subjects: ['JEE', 'NEET', 'Physics'],
      language: ['Hindi', 'English'],
    },
    rating: { content: 95, teaching: 96, impact: 92, engagement: 91 },
    ranking: {
      daily_rank: 5,
      weekly_rank: 8,
      monthly_rank: 4,
      all_time_rank: 3,
      weekly_growth_percent: 32.8,
    },
    community: { total_votes: 12_500, watchlist_count: 3200 },
    profile: { verified_channel: false, featured: true },
    color: 'from-amber-300 to-orange-500',
    video: 'Electrostatics One Shot',
    badges: ['Concept Explainer', 'Exam Saver', 'Zero-to-Hero'],
  },
  {
    name: 'Vikas Divyakirti',
    slug: 'vikas-divyakirti',
    bio: 'Thoughtful explanations for aspirants preparing to serve the nation.',
    avatar_url: '/educators/vikas-divyakirti.jpg',
    youtube: {
      channel_name: 'Drishti IAS',
      channel_handle: '@DrishtiIAS',
      channel_url: 'https://www.youtube.com/@DrishtiIAS',
      subscriber_count: 3_400_000,
    },
    education: {
      category: 'UPSC / Govt',
      subjects: ['UPSC', 'Ethics', 'Hindi'],
      language: ['Hindi', 'English'],
    },
    rating: { content: 98, teaching: 97, impact: 96, engagement: 95 },
    ranking: {
      daily_rank: 1,
      weekly_rank: 1,
      monthly_rank: 1,
      all_time_rank: 1,
      weekly_growth_percent: 24.6,
    },
    community: { total_votes: 16_210, watchlist_count: 4100 },
    profile: { verified_channel: true, featured: true },
    color: 'from-violet-300 to-indigo-600',
    video: 'Ethics & Philosophy for UPSC',
    badges: ['Concept Explainer', 'Mentor'],
  },
  {
    name: 'Hitesh Choudhary',
    slug: 'hitesh-choudhary',
    bio: 'Clear, practical software engineering for the next generation of builders.',
    avatar_url: '/educators/hitesh-choudhary.jpg',
    youtube: {
      channel_name: 'Hitesh Code Lab',
      channel_handle: '@HiteshCodeLab',
      channel_url: 'https://www.youtube.com/@HiteshCodeLab',
      subscriber_count: 1_100_000,
    },
    education: {
      category: 'Professional / Tech',
      subjects: ['Web Dev', 'JavaScript', 'Backend'],
      language: ['Hindi', 'English'],
    },
    rating: { content: 88, teaching: 90, impact: 86, engagement: 84 },
    ranking: {
      daily_rank: 12,
      weekly_rank: 15,
      monthly_rank: 10,
      all_time_rank: 18,
      weekly_growth_percent: 19.4,
    },
    community: { total_votes: 13_890, watchlist_count: 2100 },
    profile: { verified_channel: false, featured: false },
    color: 'from-cyan-300 to-blue-600',
    video: 'JavaScript Deep Dive',
    badges: ['Zero-to-Hero'],
  },
  {
    name: 'Shradha Khapra',
    slug: 'shradha-khapra',
    bio: 'Helping students crack their first tech opportunity with structured learning.',
    avatar_url: '/educators/shradha-khapra.jpg',
    youtube: {
      channel_name: 'Apna College',
      channel_handle: '@ApnaCollege',
      channel_url: 'https://www.youtube.com/@ApnaCollege',
      subscriber_count: 5_600_000,
    },
    education: {
      category: 'Professional / Tech',
      subjects: ['DSA', 'Java', 'Placements'],
      language: ['Hindi', 'English'],
    },
    rating: { content: 89, teaching: 91, impact: 88, engagement: 87 },
    ranking: {
      daily_rank: 7,
      weekly_rank: 6,
      monthly_rank: 5,
      all_time_rank: 9,
      weekly_growth_percent: 17.2,
    },
    community: { total_votes: 12_140, watchlist_count: 2800 },
    profile: { verified_channel: true, featured: true },
    color: 'from-pink-300 to-rose-500',
    video: 'Complete DSA Roadmap',
    badges: ['Exam Saver', 'Zero-to-Hero'],
  },
  {
    name: 'Aman Dhattarwal',
    slug: 'aman-dhattarwal',
    bio: 'Helping students stay motivated and choose the right career path.',
    avatar_url: '/educators/aman-dhattarwal.jpg',
    youtube: {
      channel_name: 'Aman Dhattarwal',
      channel_handle: '@AmanDhattarwal',
      channel_url: 'https://www.youtube.com/@AmanDhattarwal',
      subscriber_count: 3_200_000,
    },
    education: {
      category: 'Academics',
      subjects: ['Motivation', 'Career', 'JEE'],
      language: ['Hindi', 'English'],
    },
    rating: { content: 76, teaching: 80, impact: 78, engagement: 79 },
    ranking: {
      daily_rank: 42,
      weekly_rank: 38,
      monthly_rank: 45,
      all_time_rank: 40,
      weekly_growth_percent: 8.4,
    },
    community: { total_votes: 8200, watchlist_count: 1500 },
    profile: { verified_channel: false, featured: false },
    color: 'from-slate-300 to-slate-500',
    video: 'How to Study Effectively',
    badges: ['Mentor', 'Motivator'],
  },
  {
    name: 'Mohit Tyagi',
    slug: 'mohit-tyagi',
    bio: 'Deep, rigorous mathematics that makes challenging problems approachable.',
    avatar_url: '/educators/mohit-tyagi.jpg',
    youtube: {
      channel_name: 'Mohit Tyagi',
      channel_handle: '@MohitTyagi',
      channel_url: 'https://www.youtube.com/@MohitTyagi',
      subscriber_count: 1_500_000,
    },
    education: {
      category: 'Competitive Exams',
      subjects: ['JEE', 'Mathematics', 'Algebra'],
      language: ['Hindi'],
    },
    rating: { content: 72, teaching: 75, impact: 70, engagement: 68 },
    ranking: {
      daily_rank: 55,
      weekly_rank: 60,
      monthly_rank: 48,
      all_time_rank: 52,
      weekly_growth_percent: 11.8,
    },
    community: { total_votes: 9840, watchlist_count: 1100 },
    profile: { verified_channel: false, featured: false },
    color: 'from-emerald-300 to-teal-600',
    video: 'Advanced Problem Solving',
    badges: ['Numericals Wizard', 'Concept Explainer'],
  },
]
