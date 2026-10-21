import {
  dayKey,
  diminishing,
  emptyCounts,
  momentumScore,
  sumCounts,
  supportScore,
  windowKeys,
  type SupportCounts,
  type SupportParts,
} from '@/lib/score'
import type { Teacher } from '@/lib/types'

export type BoardKey = 'daily' | 'weekly' | 'allTime'

function byName(a: Teacher, b: Teacher) {
  return a.name.localeCompare(b.name)
}

function countsFor(teacher: Teacher, today: string) {
  const days = teacher.support?.days ?? {}
  const allTime = teacher.support?.allTime ?? emptyCounts()
  const last30 = windowKeys(today, 30)
  const last7 = windowKeys(today, 7)
  const prior7 = windowKeys(today, 7, 7)
  const prior30 = windowKeys(today, 30, 30)
  return {
    month: sumCounts(days, last30),
    week: sumCounts(days, last7),
    recent7: sumCounts(days, last7).boosts,
    prior7: sumCounts(days, prior7).boosts,
    recent30: sumCounts(days, last30).boosts,
    prior30: sumCounts(days, prior30).boosts,
    today: days[today]?.boosts ?? 0,
    allTime: {
      boosts: allTime.boosts,
      likes: allTime.likes,
      comments: Math.min(20, allTime.comments),
    } satisfies SupportCounts,
  }
}

function scoreRows(
  rows: { id: string; counts: SupportCounts; recent: number; prior: number }[],
): Map<string, { score: number; parts: SupportParts }> {
  const maxBoosts = Math.max(0, ...rows.map((row) => row.counts.boosts))
  const maxLikes = Math.max(0, ...rows.map((row) => row.counts.likes))
  const maxComments = Math.max(0, ...rows.map((row) => row.counts.comments))
  return new Map(
    rows.map((row) => {
      const parts: SupportParts = {
        boost: diminishing(row.counts.boosts, maxBoosts),
        likes: diminishing(row.counts.likes, maxLikes),
        comments: diminishing(row.counts.comments, maxComments),
        momentum: momentumScore(row.recent, row.prior),
      }
      return [row.id, { score: supportScore(parts), parts }]
    }),
  )
}

function rankIn(teachers: Teacher[], score: (teacher: Teacher) => number) {
  const ordered = [...teachers].sort((a, b) => score(b) - score(a) || byName(a, b))
  const ranks = new Map<string, number>()
  ordered.forEach((teacher, index) => ranks.set(teacher.id, index + 1))
  return ranks
}

/** Attach Student Support scores. Normalization is relative to this set, never to subscribers. */
export function withSupport(teachers: Teacher[], now = Date.now()): Teacher[] {
  const today = dayKey(now)
  const activity = new Map(teachers.map((teacher) => [teacher.id, countsFor(teacher, today)]))
  const month = scoreRows(
    teachers.map((teacher) => {
      const counts = activity.get(teacher.id)!
      return { id: teacher.id, counts: counts.month, recent: counts.recent7, prior: counts.prior7 }
    }),
  )
  const week = scoreRows(
    teachers.map((teacher) => {
      const counts = activity.get(teacher.id)!
      return { id: teacher.id, counts: counts.week, recent: counts.recent7, prior: counts.prior7 }
    }),
  )
  const allTime = scoreRows(
    teachers.map((teacher) => {
      const counts = activity.get(teacher.id)!
      return { id: teacher.id, counts: counts.allTime, recent: counts.recent30, prior: counts.prior30 }
    }),
  )

  const ranked = teachers.map((teacher) => {
    const counts = activity.get(teacher.id)!
    return {
      ...teacher,
      supportView: {
        score30: month.get(teacher.id)?.score ?? 0,
        score7: week.get(teacher.id)?.score ?? 0,
        scoreAll: allTime.get(teacher.id)?.score ?? 0,
        boostsToday: counts.today,
        globalRank: 0,
        categoryRank: 0,
        subjectRanks: [] as { subject: string; rank: number }[],
        parts30: month.get(teacher.id)?.parts ?? { boost: 0, likes: 0, comments: 0, momentum: 0 },
        partsAll: allTime.get(teacher.id)?.parts ?? { boost: 0, likes: 0, comments: 0, momentum: 0 },
      },
    }
  })

  const rankScore = (teacher: Teacher) =>
    (teacher.supportView?.score30 ?? 0) * 100000 + (teacher.supportView?.scoreAll ?? 0)
  const global = rankIn(ranked, rankScore)
  const categories = new Map<string, Teacher[]>()
  const subjects = new Map<string, Teacher[]>()
  for (const teacher of ranked) {
    const category = teacher.education.category || 'Academics'
    categories.set(category, [...(categories.get(category) ?? []), teacher])
    for (const subject of teacher.education.subjects) {
      subjects.set(subject, [...(subjects.get(subject) ?? []), teacher])
    }
  }
  const categoryRanks = new Map<string, number>()
  for (const group of categories.values()) {
    for (const [id, rank] of rankIn(group, rankScore)) {
      categoryRanks.set(id, rank)
    }
  }
  const subjectRanks = new Map<string, Map<string, number>>()
  for (const [subject, group] of subjects) {
    subjectRanks.set(subject, rankIn(group, rankScore))
  }

  return ranked.map((teacher) => ({
    ...teacher,
    supportView: {
      ...teacher.supportView!,
      globalRank: global.get(teacher.id) ?? 1,
      categoryRank: categoryRanks.get(teacher.id) ?? 1,
      subjectRanks: teacher.education.subjects.map((subject) => ({
        subject,
        rank: subjectRanks.get(subject)?.get(teacher.id) ?? 1,
      })),
    },
  }))
}

function boardValue(teacher: Teacher, key: BoardKey) {
  const view = teacher.supportView
  if (!view) return 0
  if (key === 'daily') return view.boostsToday
  if (key === 'weekly') return view.score7
  return view.scoreAll
}

export function orderedBoard(teachers: Teacher[], key: BoardKey) {
  return [...teachers].sort((a, b) => {
    const primary = boardValue(b, key) - boardValue(a, key)
    if (primary) return primary
    const allTime = (b.supportView?.scoreAll ?? 0) - (a.supportView?.scoreAll ?? 0)
    if (allTime) return allTime
    return byName(a, b)
  })
}

export function topBoard(teachers: Teacher[], key: BoardKey, count = 3) {
  return orderedBoard(teachers, key).slice(0, count)
}

export function featuredTeacherIds(teachers: Teacher[]) {
  const featured = [
    ...topBoard(teachers, 'daily'),
    ...topBoard(teachers, 'weekly'),
    ...topBoard(teachers, 'allTime'),
  ]
  return new Set(featured.map((teacher) => teacher.id))
}

export function restOfBoard(teachers: Teacher[]) {
  const featured = featuredTeacherIds(teachers)
  return orderedBoard(teachers, 'allTime').filter((teacher) => !featured.has(teacher.id))
}

export function displaySupport(teacher: Teacher) {
  const view = teacher.supportView
  if (view && view.score30 > 0) return { value: view.score30, label: '30-day' }
  return { value: view?.scoreAll ?? 0, label: 'all-time' }
}
