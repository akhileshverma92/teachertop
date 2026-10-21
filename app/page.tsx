'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { EducatorCard } from '@/components/EducatorCard'
import { SiteNav } from '@/components/SiteNav'
import { useTeacherBoard } from '@/components/useTeacherBoard'
import { topBoard } from '@/lib/ranks'

const spotlights = [
  { key: 'daily' as const, label: 'Daily Surge', title: 'Most Boosts today' },
  { key: 'weekly' as const, label: 'Weekly Top', title: 'Highest support this week' },
  { key: 'allTime' as const, label: 'All-Time Legends', title: 'Sustained student support' },
]

const reasons = [
  {
    index: '01',
    title: "Who's trending today?",
    body: "Discover educators receiving the most student support today. See who's climbing the leaderboard and gaining momentum.",
  },
  {
    index: '02',
    title: 'Meet the educators',
    body: 'Explore teachers across competitive exams, academics, technology, careers, and more. Find your favorites and show them some support.',
  },
  {
    index: '03',
    title: 'Every Boost counts',
    body: 'Like, comment, and use your daily Boost votes to support the educators who inspire you. Every eligible vote helps shape the community rankings.',
  },
  {
    index: '04',
    title: 'From rising stars to legends',
    body: 'Follow daily surges, weekly leaders, and all-time favorites as educators earn Bronze, Silver, Gold, Diamond, and Legendary recognition.',
  },
]

export default function Page() {
  const board = useTeacherBoard()
  const { teachers, ready, user, votesLeft, votingId, likingId, likedIds, open, boost, like } = board

  return (
    <main className="min-h-screen bg-[#e7e5e1] px-3 py-3 text-[#1c1c1c] selection:bg-stone-200 sm:px-4 sm:py-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <section className="rounded-[28px] bg-[#f4f3f0] px-4 pb-12 pt-5 sm:px-8 sm:pb-16 sm:pt-6">
          <SiteNav />
          <div className="mx-auto mt-14 max-w-2xl text-center sm:mt-16">
            <div className="mb-5 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500">
              <span className="size-1.5 rounded-full bg-[#1c1c1c]" />
              India&apos;s student-powered leaderboard
            </div>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-5xl">
              India&apos;s favorite educators,
              <span className="mt-1 block">ranked by students.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-stone-500">
              Discover the educators shaping your learning journey. Give your favorites a Boost, share your
              appreciation, and see who&apos;s rising to the top.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-2 rounded-full bg-[#1c1c1c] px-4 py-2.5 text-sm font-medium text-white hover:bg-black"
              >
                Explore leaderboard
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center rounded-full bg-white px-4 py-2.5 text-sm font-medium text-[#1c1c1c] hover:bg-stone-100"
              >
                Discover educators
              </Link>
            </div>
            <p className="mt-6 text-xs text-stone-400">
              Student votes
              <span className="mx-2 text-stone-300">·</span>
              Trending educators
              <span className="mx-2 text-stone-300">·</span>
              Daily rankings
            </p>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {reasons.map((reason) => (
            <article key={reason.index} className="rounded-[28px] bg-[#f6f5f2] px-5 py-6 sm:px-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">
                Section {reason.index}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">{reason.title}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-500">{reason.body}</p>
            </article>
          ))}
        </section>

        {spotlights.map((spotlight) => {
          const list = topBoard(teachers, spotlight.key)
          return (
            <section key={spotlight.key} className="rounded-[28px] bg-[#f6f5f2] px-4 py-8 sm:px-8">
              <div className="mb-6 text-center">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">
                  {spotlight.label}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{spotlight.title}</h2>
              </div>
              {list.length > 0 ? (
                <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-3">
                  {list.map((teacher, index) => {
                    const rank = index + 1
                    return (
                      <EducatorCard
                        key={`${spotlight.key}-${teacher.id}`}
                        teacher={teacher}
                        rank={rank}
                        onView={() => open(teacher, teacher.supportView?.globalRank ?? rank)}
                        onBoost={() => boost(teacher)}
                        onLike={() => like(teacher)}
                        liked={likedIds.includes(teacher.id)}
                        boosting={votingId === teacher.id || likingId === teacher.id}
                      />
                    )
                  })}
                </div>
              ) : (
                <p className="rounded-[24px] bg-white px-6 py-10 text-center text-sm text-stone-500">
                  {ready ? 'No educators yet.' : 'Loading educators…'}
                </p>
              )}
            </section>
          )
        })}

        <p className="mx-auto max-w-xl pb-2 text-center text-xs leading-5 text-stone-500">
          Your voice, your votes. Support your favorite educators with daily Boosts, likes, and comments.
          Rankings reflect student support, not a verified measure of teaching quality.
          {user ? ` ${votesLeft} votes left today.` : ''}
        </p>
      </div>
      {board.overlays}
    </main>
  )
}
