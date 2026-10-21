'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { MAX_STUDENT_VOTES } from '@/lib/firebase'
import { TeacherDetailModal } from '@/components/TeacherDetailModal'
import { withSupport } from '@/lib/ranks'
import { boostsUsedOnDay } from '@/lib/score'
import { castVote, subscribeTeachers, toggleLike } from '@/lib/teachers'
import type { Teacher } from '@/lib/types'

export function useTeacherBoard() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [ready, setReady] = useState(false)
  const [toast, setToast] = useState('')
  const [votingId, setVotingId] = useState<string | null>(null)
  const [likingId, setLikingId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ teacher: Teacher; rank: number } | null>(null)

  useEffect(
    () =>
      subscribeTeachers((next) => {
        setTeachers(next)
        setReady(true)
      }),
    [],
  )

  const ranked = useMemo(() => withSupport(teachers), [teachers])
  const votesLeft = Math.max(
    0,
    MAX_STUDENT_VOTES - boostsUsedOnDay(profile?.boostDay ?? '', profile?.boostsToday ?? 0),
  )
  const likedIds = profile?.likedTeacherIds ?? []

  const notify = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 2200)
  }

  function open(teacher: Teacher, rank: number) {
    setDetail({ teacher, rank })
  }

  const openTeacher = detail
    ? (ranked.find((teacher) => teacher.id === detail.teacher.id) ?? detail.teacher)
    : null

  function requireStudent() {
    if (!user) {
      notify('Sign in to take part')
      router.push('/login')
      return false
    }
    return true
  }

  async function boost(teacher: Teacher) {
    if (!requireStudent() || !user) return
    if (votesLeft <= 0) {
      notify(`Daily Boost limit reached (${MAX_STUDENT_VOTES}/${MAX_STUDENT_VOTES})`)
      return
    }
    setVotingId(teacher.id)
    try {
      const result = await castVote(user.uid, teacher.id)
      notify(`${teacher.name} got your Boost · ${result.votesUsed}/${MAX_STUDENT_VOTES} today`)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Boost failed')
    } finally {
      setVotingId(null)
    }
  }

  async function like(teacher: Teacher) {
    if (!requireStudent() || !user) return
    setLikingId(teacher.id)
    try {
      const result = await toggleLike(user.uid, teacher.id)
      notify(result.liked ? `Liked ${teacher.name}` : `Removed your like for ${teacher.name}`)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Like failed')
    } finally {
      setLikingId(null)
    }
  }

  return {
    teachers: ranked,
    ready,
    user,
    votesLeft,
    votingId,
    likingId,
    likedIds,
    open,
    boost,
    like,
    overlays: (
      <>
        {openTeacher && detail && (
          <TeacherDetailModal
            teacher={openTeacher}
            rank={openTeacher.supportView?.globalRank ?? detail.rank}
            onClose={() => setDetail(null)}
            onVote={() => boost(openTeacher)}
            voting={votingId === openTeacher.id}
            onLike={() => like(openTeacher)}
            liked={likedIds.includes(openTeacher.id)}
            liking={likingId === openTeacher.id}
            votesLeft={user ? votesLeft : undefined}
          />
        )}
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#1c1c1c] px-4 py-3 text-sm font-medium text-white shadow-xl">
            <Check className="size-4 text-emerald-400" />
            {toast}
          </div>
        )}
      </>
    ),
  }
}
