'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { EducatorCard } from '@/components/EducatorCard'
import { SiteNav } from '@/components/SiteNav'
import { useTeacherBoard } from '@/components/useTeacherBoard'

export default function SearchPage() {
  const board = useTeacherBoard()
  const { teachers, ready, votingId, likingId, likedIds, open, boost, like } = board
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    return teachers.filter((teacher) =>
      `${teacher.name} ${teacher.education.subjects.join(' ')} ${teacher.education.category} ${teacher.youtube.channel_handle} ${teacher.youtube.channel_name}`
        .toLowerCase()
        .includes(needle),
    )
  }, [teachers, query])

  return (
    <main className="min-h-screen bg-[#e7e5e1] px-3 py-3 text-[#1c1c1c] selection:bg-stone-200 sm:px-4 sm:py-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <section className="rounded-[28px] bg-[#f4f3f0] px-4 py-5 sm:px-8 sm:py-6">
          <SiteNav />
          <div className="mx-auto mt-10 max-w-xl pb-4 text-center">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Discover</h1>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              Find an educator by name, subject, or channel.
            </p>
            <label className="mx-auto mt-6 flex max-w-md items-center gap-2 rounded-full bg-white px-4 py-3 text-sm shadow-sm">
              <Search className="size-4 text-stone-400" />
              <span className="sr-only">Search educators</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search educators"
                className="w-full bg-transparent outline-none placeholder:text-stone-400"
                autoFocus
              />
            </label>
          </div>
        </section>

        <section className="px-1 py-4 sm:px-2">
          {!query.trim() ? (
            <p className="rounded-[24px] bg-white px-6 py-12 text-center text-sm text-stone-500">
              Type a name or subject to see matching educators.
            </p>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-3">
              {results.map((teacher) => {
                const rank = teacher.supportView?.globalRank ?? 1
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
            <p className="rounded-[24px] bg-white px-6 py-12 text-center text-sm text-stone-500">
              {ready ? `No educators match “${query.trim()}”.` : 'Loading educators…'}
            </p>
          )}
        </section>
      </div>
      {board.overlays}
    </main>
  )
}
