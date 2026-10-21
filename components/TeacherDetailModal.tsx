'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { addComment, subscribeComments, type TeacherComment } from '@/lib/comments'
import { resolveAvatarUrl } from '@/lib/avatar'
import { displaySupport } from '@/lib/ranks'
import { formatScore } from '@/lib/score'
import { formatSubscribers, initialsFromName } from '@/lib/types'
import { assignTier, type EducatorTier } from '@/lib/tiers'
import type { Teacher } from '@/lib/types'
import { cn } from '@/lib/utils'

const TIER_BG: Record<EducatorTier, { label: string; bg: string; badge: string }> = {
  bronze: { label: 'Bronze', bg: '/cardsbg/b.png', badge: 'bg-[#c9844a] text-white' },
  silver: { label: 'Silver', bg: '/cardsbg/s.png', badge: 'bg-[#d7dee7] text-slate-700' },
  gold: { label: 'Gold', bg: '/cardsbg/g.png', badge: 'bg-[#e2b340] text-[#3f2d05]' },
  diamond: { label: 'Diamond', bg: '/cardsbg/d.png', badge: 'bg-[#8eb4ff] text-[#102047]' },
  legendary: { label: 'Legendary', bg: '/cardsbg/d.png', badge: 'bg-[#312e81] text-white' },
}

export function TeacherDetailModal({
  teacher,
  rank,
  onClose,
  onVote,
  voting,
  onLike,
  liked,
  liking,
  votesLeft,
}: {
  teacher: Teacher
  rank: number
  onClose: () => void
  onVote?: () => void
  voting?: boolean
  onLike?: () => void
  liked?: boolean
  liking?: boolean
  votesLeft?: number
}) {
  const { user, profile } = useAuth()
  const [comments, setComments] = useState<TeacherComment[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)
  const photo = resolveAvatarUrl(teacher.avatar_url)
  const shown = displaySupport(teacher)
  const tier = assignTier(shown.value)
  const theme = TIER_BG[tier]
  const view = teacher.supportView
  const channel = teacher.youtube.channel_name || teacher.youtube.channel_handle || 'Educator'

  useEffect(() => {
    setPhotoFailed(false)
  }, [photo])

  useEffect(() => subscribeComments(teacher.id, setComments), [teacher.id])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    setBusy(true)
    setError('')
    try {
      await addComment({
        teacherId: teacher.id,
        userId: user.uid,
        displayName: profile?.displayName || user.displayName || 'Student',
        text,
      })
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post comment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#1c1c1c]/30 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[min(90vh,880px)] w-full max-w-md overflow-y-auto rounded-[28px] bg-white text-[#1c1c1c] shadow-[0_24px_80px_rgba(28,25,23,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-72 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={theme.bg} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-y-0 left-0 w-[56%] overflow-hidden">
            {photo && !photoFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt={teacher.name}
                referrerPolicy="no-referrer"
                className="size-full object-cover object-top"
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <div className="grid size-full place-items-center text-4xl font-semibold text-[#1c1c1c]/70">
                {initialsFromName(teacher.name)}
              </div>
            )}
          </div>
          <div className="absolute inset-y-0 right-0 flex w-[42%] flex-col items-end px-4 py-3 text-right text-[#1c1c1c]">
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1">
              <X className="size-4" />
            </button>
            <p className="mt-2 text-sm font-semibold">#{rank}</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em]">{theme.label}</p>
            <div className="mt-auto pb-10">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em]">{shown.label} support</p>
              <p className="text-4xl font-semibold leading-none tracking-tight">{formatScore(shown.value)}</p>
              <p className="mt-2 truncate text-xs font-medium">
                {teacher.education.category || 'Educator'} #{view?.categoryRank ?? rank}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-6 rounded-t-[28px] bg-white px-5 pb-6 pt-5">
          <h2 className="text-2xl font-semibold tracking-tight">{teacher.name}</h2>
          <p className="mt-1 text-sm text-stone-500">{channel}</p>
          {teacher.education.subjects.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {teacher.education.subjects.slice(0, 4).map((subject) => (
                <span key={subject} className="rounded-full bg-[#f4f3f0] px-2.5 py-1 text-xs text-stone-600">
                  {subject}
                </span>
              ))}
            </div>
          )}

          <h3 className="mt-5 text-sm font-semibold">About</h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">{teacher.bio || 'No bio yet.'}</p>

          <h3 className="mt-5 text-sm font-semibold">Stats</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Subscribers" value={formatSubscribers(teacher.youtube.subscriber_count)} />
            <Stat label={shown.label === '30-day' ? '30-day support' : 'All-time support'} value={formatScore(shown.value)} />
            <Stat label="Boosts today" value={String(view?.boostsToday ?? 0)} />
            <Stat label="All-time score" value={formatScore(view?.scoreAll ?? 0)} />
          </div>

          <div className="mt-5 flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold">Today&apos;s support</h3>
            {votesLeft != null && (
              <p className="text-xs text-stone-400">{votesLeft} votes left today</p>
            )}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 border-t border-stone-200 pt-3">
            {(
              [
                ['Boost', Math.round(((shown.label === '30-day' ? view?.parts30.boost : view?.partsAll.boost) ?? 0) * 50), 'of 50'],
                ['Likes', Math.round(((shown.label === '30-day' ? view?.parts30.likes : view?.partsAll.likes) ?? 0) * 20), 'of 20'],
                ['Comments', Math.round(((shown.label === '30-day' ? view?.parts30.comments : view?.partsAll.comments) ?? 0) * 15), 'of 15'],
                ['Momentum', Math.round(((shown.label === '30-day' ? view?.parts30.momentum : view?.partsAll.momentum) ?? 0) * 15), 'of 15'],
              ] as const
            ).map(([label, value, cap]) => (
              <div key={label} className="text-center">
                <p className="text-sm font-semibold">{value}</p>
                <p className="mt-0.5 text-[10px] text-stone-500">{label}</p>
                <p className="text-[10px] text-stone-400">{cap}</p>
              </div>
            ))}
          </div>

          {(view?.subjectRanks.length || teacher.education.subjects.length) ? (
            <>
              <h3 className="mt-5 text-sm font-semibold">Subjects</h3>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                {view && view.subjectRanks.length > 0
                  ? view.subjectRanks.map((item) => `${item.subject} #${item.rank}`).join(' · ')
                  : teacher.education.subjects.join(' · ')}
              </p>
            </>
          ) : null}

          {teacher.youtube.channel_url && (
            <a
              href={teacher.youtube.channel_url}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex items-center justify-between border-t border-stone-200 py-3 text-sm font-medium"
            >
              YouTube channel
              <span className="text-xs font-medium text-stone-400">Open</span>
            </a>
          )}

          <p className="mt-2 text-xs leading-5 text-stone-500">
            Student Support Rank is student votes, likes, and comments. It is not a grade of teaching quality.
            Subscriber count is shown separately and is not part of the score. Votes are free and cannot be bought.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            {onVote && (
              <button
                type="button"
                disabled={voting}
                onClick={onVote}
                className="rounded-full bg-[#1c1c1c] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {voting ? '…' : 'Vote'}
              </button>
            )}
            {onLike && (
              <button
                type="button"
                disabled={liking}
                onClick={onLike}
                className={cn(
                  'rounded-full py-2.5 text-sm font-semibold disabled:opacity-50',
                  liked ? 'bg-[#1c1c1c] text-white' : 'bg-[#f4f3f0] text-[#1c1c1c]',
                )}
              >
                {liked ? 'Liked' : 'Like'}
              </button>
            )}
          </div>

          <div className="mt-6 border-t border-stone-200 pt-5">
            <h3 className="text-sm font-semibold">
              Comments
              <span className="ml-2 text-xs font-medium text-stone-400">{comments.length}</span>
            </h3>

            {user ? (
              <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2">
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  maxLength={400}
                  rows={3}
                  placeholder="Share what you learned from this teacher"
                  className="w-full resize-none rounded-2xl border border-black/[0.06] bg-[#f7f6f4] px-3 py-2.5 text-sm outline-none focus:border-stone-400"
                />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={busy || !text.trim()}
                  className="self-start rounded-full bg-[#1c1c1c] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {busy ? 'Posting…' : 'Post comment'}
                </button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-stone-500">
                <Link href="/login" className="font-semibold text-[#1c1c1c] underline">
                  Sign in
                </Link>{' '}
                to leave a comment.
              </p>
            )}

            <ul className="mt-4 flex flex-col gap-3">
              {comments.length === 0 ? (
                <li className="text-sm text-stone-400">No comments yet.</li>
              ) : (
                comments.map((comment) => (
                  <li key={comment.id} className="rounded-2xl bg-[#f7f6f4] px-3 py-2.5">
                    <p className="text-xs font-semibold">{comment.displayName}</p>
                    <p className="mt-1 text-sm leading-5 text-stone-600">{comment.text}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f7f6f4] px-3 py-2">
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-[10px] text-stone-400">{label}</p>
    </div>
  )
}
