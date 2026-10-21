'use client'

import { useMemo, useState } from 'react'
import { EducatorCard, TierLegend } from '@/components/EducatorCard'
import { SiteNav } from '@/components/SiteNav'
import { useTeacherBoard } from '@/components/useTeacherBoard'
import { MAX_STUDENT_VOTES } from '@/lib/firebase'
import { restOfBoard } from '@/lib/ranks'

export default function LeaderboardPage() {
  const board = useTeacherBoard()
  const { teachers, ready, user, votesLeft, votingId, likingId, likedIds, open, boost, like } = board
  const [category, setCategory] = useState('All')
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(teachers.map((teacher) => teacher.education.category).filter(Boolean))).sort()],
    [teachers],
  )
  const rest = category === 'All'
    ? restOfBoard(teachers)
    : teachers
        .filter((teacher) => teacher.education.category === category)
        .sort((a, b) => (a.supportView?.categoryRank ?? 0) - (b.supportView?.categoryRank ?? 0))

  return (
    <main className="min-h-screen bg-[#e7e5e1] px-3 py-3 text-[#1c1c1c] selection:bg-stone-200 sm:px-4 sm:py-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <section className="rounded-[28px] bg-[#f4f3f0] px-4 py-5 sm:px-8 sm:py-6">
          <SiteNav />
          <div className="mx-auto mt-10 max-w-lg pb-6 text-center">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Leaderboard</h1>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              Outside the home spotlights, or filter by category. Every category uses the same Student Support score.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    category === item ? 'bg-[#1c1c1c] text-white' : 'bg-white text-[#1c1c1c]'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="px-1 py-4 sm:px-2">
          {rest.length > 0 ? (
            <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-3">
              {rest.map((teacher) => {
                const rank = category === 'All'
                  ? (teacher.supportView?.globalRank ?? 1)
                  : (teacher.supportView?.categoryRank ?? 1)
                return (
                  <EducatorCard
                    key={teacher.id}
                    teacher={teacher}
                    rank={rank}
                    onView={() => open(teacher, rank)}
                    onBoost={() => boost(teacher)}
                    onLike={() => like(teacher)}
                    liked={likedIds.includes(teacher.id)}
                    boosting={votingId === teacher.id || likingId === teacher.id}
                  />
                )
              })}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">
              {ready ? 'No educators in this list yet.' : 'Loading educators…'}
            </div>
          )}
          <div className="mt-6">
            <TierLegend />
          </div>
          <p className="mt-4 text-center text-xs text-stone-500">
            {user ? `${votesLeft} of ${MAX_STUDENT_VOTES} votes left today` : 'Sign in from Profile to take part'}
          </p>
        </section>
      </div>
      {board.overlays}
    </main>
  )
}
