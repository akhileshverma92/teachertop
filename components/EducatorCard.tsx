'use client'

import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  BadgeCheck,
  Crown,
  Play,
  RefreshCw,
  Star,
  X,
} from 'lucide-react'
import { resolveAvatarUrl } from '@/lib/avatar'
import { displaySupport } from '@/lib/ranks'
import { formatScore } from '@/lib/score'
import type { Teacher } from '@/lib/types'
import { formatGrowth, formatSubscribers, initialsFromName } from '@/lib/types'
import { assignTier, type EducatorTier } from '@/lib/tiers'
import { cn } from '@/lib/utils'

const TIER_THEME: Record<
  EducatorTier,
  {
    label: string
    badge: string
    glow: string
    accent: string
    bar: string
    dotA: string
    dotB: string
    bg: string
    frame: string
  }
> = {
  bronze: {
    label: 'Bronze',
    badge: 'bg-[#c9844a] text-white',
    glow: 'shadow-[0_16px_40px_rgba(180,98,42,0.16)]',
    accent: 'text-[#e11d48]',
    bar: 'from-orange-400 to-amber-600',
    dotA: 'bg-orange-400',
    dotB: 'bg-amber-600',
    bg: '/cardsbg/b.png',
    frame: 'border-[#f0d2b4]',
  },
  silver: {
    label: 'Silver',
    badge: 'bg-[#d7dee7] text-slate-700',
    glow: 'shadow-[0_16px_40px_rgba(100,116,139,0.16)]',
    accent: 'text-[#e11d48]',
    bar: 'from-slate-200 to-slate-500',
    dotA: 'bg-slate-300',
    dotB: 'bg-slate-500',
    bg: '/cardsbg/s.png',
    frame: 'border-[#dbe3ec]',
  },
  gold: {
    label: 'Gold',
    badge: 'bg-[#e2b340] text-[#3f2d05]',
    glow: 'shadow-[0_16px_40px_rgba(202,154,40,0.2)]',
    accent: 'text-[#e11d48]',
    bar: 'from-amber-300 to-yellow-600',
    dotA: 'bg-amber-300',
    dotB: 'bg-yellow-600',
    bg: '/cardsbg/g.png',
    frame: 'border-[#f0dd9a]',
  },
  diamond: {
    label: 'Diamond',
    badge: 'bg-[#8eb4ff] text-[#102047]',
    glow: 'shadow-[0_16px_40px_rgba(99,130,255,0.2)]',
    accent: 'text-[#e11d48]',
    bar: 'from-sky-300 to-blue-500',
    dotA: 'bg-sky-300',
    dotB: 'bg-blue-500',
    bg: '/cardsbg/d.png',
    frame: 'border-[#d5def8]',
  },
  legendary: {
    label: 'Legendary',
    badge: 'bg-[#312e81] text-white',
    glow: 'shadow-[0_16px_40px_rgba(49,46,129,0.22)]',
    accent: 'text-[#e11d48]',
    bar: 'from-indigo-400 to-violet-700',
    dotA: 'bg-indigo-300',
    dotB: 'bg-violet-600',
    bg: '/cardsbg/d.png',
    frame: 'border-[#c7c3f5]',
  },
}

function Avatar({
  name,
  url,
  color,
  className,
  plain = false,
}: {
  name: string
  url: string
  color: string
  className?: string
  plain?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const src = resolveAvatarUrl(url)
  const show = Boolean(src) && !failed

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <div className={cn('relative overflow-hidden', plain ? 'bg-black/10' : 'bg-zinc-800', className)}>
      {!plain && (
        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-80', color || 'from-zinc-600 to-zinc-900')} />
      )}
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          className="size-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="relative z-[1] grid size-full place-items-center">
          <span className={cn('text-5xl font-black', plain ? 'text-[#1c1c1c]/80' : 'text-white/85')}>
            {initialsFromName(name)}
          </span>
        </div>
      )}
      {!plain && (
        <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/55 via-transparent to-black/10" />
      )}
    </div>
  )
}

type FaceProps = {
  teacher: Teacher
  rank: number
  size?: 'grid' | 'hero'
  onFlip?: () => void
  onBoost?: () => void
  onView?: () => void
  onLike?: () => void
  liked?: boolean
  boosting?: boolean
}

function QuietStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f7f6f4] px-2.5 py-2">
      <p className="truncate text-sm font-semibold text-[#1c1c1c]">{value}</p>
      <p className="truncate text-[10px] text-stone-400">{label}</p>
    </div>
  )
}

function StatRow({
  rating,
  accent,
}: {
  rating: Teacher['rating']
  accent: string
}) {
  return (
    <div className="grid grid-cols-4 gap-0.5">
      {(
        [
          ['CNT', rating.content],
          ['TCH', rating.teaching],
          ['IMP', rating.impact],
          ['ENG', rating.engagement],
        ] as const
      ).map(([label, value]) => (
        <div key={label} className="min-w-0 text-center">
          <p className={cn('font-mono text-[11px] font-black leading-none sm:text-xs', accent)}>
            {Math.round(value)}
          </p>
          <p className="mt-0.5 text-[7px] font-medium uppercase tracking-wide text-stone-400 sm:text-[8px]">
            {label}
          </p>
        </div>
      ))}
    </div>
  )
}

function CardFront({ teacher, rank, size = 'grid', onFlip, onBoost, onView, onLike, liked, boosting }: FaceProps) {
  const { rating, youtube, ranking, community, education } = teacher
  const hero = size === 'hero'
  const shown = displaySupport(teacher)
  const tier = hero ? rating.tier || assignTier(rating.overall) : assignTier(shown.value)
  const theme = TIER_THEME[tier]
  const displayRank = rank || ranking.all_time_rank || 1
  const teachShare = Math.min(100, Math.round((rating.teaching / Math.max(1, rating.overall)) * 100))
  const engageShare = Math.max(0, 100 - teachShare)
  const channel = youtube.channel_name || youtube.channel_handle.replace(/^@/, '') || 'Educator'

  if (!hero) {
    const subjects = education.subjects.slice(0, 3)
    const categoryRank = teacher.supportView?.categoryRank
    return (
      <div
        className={cn(
          'flex h-full min-w-0 flex-col overflow-hidden rounded-[28px] border bg-white text-[#1c1c1c]',
          theme.frame,
          theme.glow,
        )}
      >
        <div className="relative h-48 shrink-0 overflow-hidden sm:h-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={theme.bg} alt="" className="absolute inset-0 size-full object-cover" />
          <Avatar
            name={teacher.name}
            url={teacher.avatar_url}
            color={teacher.color}
            plain
            className="absolute inset-y-0 left-0 w-[58%] bg-transparent"
          />
          <div className="absolute inset-y-0 right-0 flex w-[40%] flex-col items-end px-3 py-3 text-right text-[#1c1c1c]">
            <p className="text-sm font-semibold">#{displayRank}</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em]">{theme.label}</p>
            <div className="mt-auto pb-7">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em]">{shown.label} support</p>
              <p className="text-3xl font-semibold leading-none tracking-tight">{formatScore(shown.value)}</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-6 flex flex-1 flex-col rounded-t-[24px] bg-white px-3.5 pb-3.5 pt-4">
          <h3 className="flex min-w-0 items-center gap-1 truncate text-lg font-semibold tracking-tight">
            <span className="truncate">{teacher.name}</span>
            {teacher.profile?.verified_channel && (
              <BadgeCheck className="size-4 shrink-0 text-stone-400" />
            )}
          </h3>
          <p className="mt-0.5 truncate text-sm text-stone-500">{channel}</p>

          {subjects.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {subjects.map((subject) => (
                <span key={subject} className="rounded-full bg-[#f4f3f0] px-2.5 py-1 text-[11px] text-stone-600">
                  {subject}
                </span>
              ))}
            </div>
          )}

          <p className="mt-2.5 line-clamp-3 text-xs leading-5 text-stone-500">
            {teacher.bio || 'No bio yet.'}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <QuietStat label="Subscribers" value={formatSubscribers(youtube.subscriber_count)} />
            <QuietStat label={`${shown.label} support`} value={formatScore(shown.value)} />
            <QuietStat label="Boosts today" value={String(teacher.supportView?.boostsToday ?? 0)} />
            <QuietStat label="All-time score" value={formatScore(teacher.supportView?.scoreAll ?? shown.value)} />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {onBoost && (
              <button
                type="button"
                disabled={boosting}
                onClick={(e) => {
                  e.stopPropagation()
                  onBoost()
                }}
                className="rounded-full bg-[#1c1c1c] py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
              >
                {boosting ? '…' : 'Vote'}
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              {onLike && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onLike()
                  }}
                  className={cn(
                    'rounded-full py-2.5 text-sm font-semibold',
                    liked ? 'bg-[#1c1c1c] text-white' : 'bg-[#f4f3f0] text-[#1c1c1c] hover:bg-stone-200',
                  )}
                >
                  {liked ? 'Liked' : 'Like'}
                </button>
              )}
              {onView && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onView()
                  }}
                  className="rounded-full bg-[#f4f3f0] py-2.5 text-sm font-semibold text-[#1c1c1c] hover:bg-stone-200"
                >
                  View detail
                </button>
              )}
            </div>
          </div>

          <p className="mt-3 flex items-center justify-between gap-2 border-t border-stone-200 pt-3 text-xs">
            <span className="truncate font-semibold">
              {education.category || 'Educator'}
              {categoryRank ? ` #${categoryRank}` : ''}
            </span>
            <span className="truncate text-stone-400">{subjects.join(' · ')}</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-[32px] border border-black/[0.05] bg-white text-[#1c1c1c]',
        theme.glow,
      )}
    >
      {/* Media */}
      <div className="relative shrink-0 px-1.5 pt-1.5">
        <div className={cn('relative overflow-hidden rounded-[22px]', hero ? 'aspect-[4/3.35]' : 'aspect-[4/3.15]')}>
          <Avatar
            name={teacher.name}
            url={teacher.avatar_url}
            color={teacher.color}
            className="absolute inset-0 size-full rounded-[22px]"
          />

          {/* Tier notch badge */}
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2">
            <div className="rounded-b-2xl bg-white px-2 pb-1.5 pt-0 shadow-sm">
              <span
                className={cn(
                  'inline-block rounded-full px-3.5 py-1 text-[10px] font-black uppercase tracking-wider',
                  theme.badge,
                )}
              >
                {theme.label}
              </span>
            </div>
          </div>

          {/* Corner mark */}
          <span className="absolute right-2.5 top-2.5 z-10 grid size-8 place-items-center rounded-lg bg-[#2563eb] text-white shadow-lg">
            {tier === 'legendary' ? <Crown className="size-4" /> : <Star className="size-3.5 fill-current" />}
          </span>

          {/* RTG pill */}
          <span className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/92 px-4 py-1.5 font-mono text-sm font-semibold tracking-wide text-[#1c1c1c] shadow-sm backdrop-blur-md">
            RTG {Math.round(rating.overall)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className={cn('flex flex-1 flex-col', hero ? 'px-4 pb-4 pt-3' : 'px-3.5 pb-3.5 pt-2.5')}>
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn('leading-tight font-semibold tracking-tight text-[#1c1c1c]', hero ? 'text-[22px]' : 'text-[17px]')}>
            {teacher.name}
          </h3>
          <span className={cn('mt-0.5 shrink-0 font-mono text-sm font-black', theme.accent)}>#{displayRank}</span>
        </div>

        <p className="mt-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
          <span className="grid size-6 place-items-center rounded-full bg-[#f4f3f0] ring-1 ring-black/[0.04]">
            <Play className="size-2.5 fill-red-400 text-red-400" />
          </span>
          <span className="truncate">
            {youtube.channel_name || youtube.channel_handle.replace(/^@/, '') || 'Educator'}
          </span>
        </p>

        {/* Stats dock */}
        <div className="mt-3 rounded-[18px] bg-[#f4f3f0] p-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-medium tracking-wide text-stone-400">Subscribers</p>
              <p className={cn('mt-1 text-lg font-semibold leading-none', hero ? 'text-xl' : 'text-base')}>
                {formatSubscribers(youtube.subscriber_count)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-wide text-stone-400">Distribution %</p>
              <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold">
                <span className={cn('size-2.5 rounded-full', theme.dotA)} />
                <span>{teachShare}</span>
                <span className="h-3.5 w-px bg-stone-300" />
                <span>{engageShare}</span>
                <span className={cn('size-2.5 rounded-full', theme.dotB)} />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1 border-t border-black/[0.05] pt-3">
            {[
              ['CNT', rating.content],
              ['TCH', rating.teaching],
              ['IMP', rating.impact],
              ['ENG', rating.engagement],
            ].map(([label, value]) => (
              <div key={String(label)} className="text-center">
                <p className={cn('font-mono text-[13px] font-black', theme.accent)}>{Math.round(Number(value))}</p>
                <p className="text-[8px] font-medium uppercase tracking-wide text-stone-400">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] font-medium text-stone-500">
            <span>{formatGrowth(ranking.weekly_growth_percent)} this week</span>
            <span className="inline-flex items-center gap-0.5 text-emerald-600">
              <ArrowUpRight className="size-3" />
              {community.total_votes.toLocaleString()} votes
            </span>
          </div>
        </div>

        {education.subjects.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {education.subjects.slice(0, 3).map((s) => (
              <span
                key={s}
                className="rounded-full bg-[#f4f3f0] px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-stone-500"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-3">
          {onFlip && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onFlip()
              }}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-black/[0.06] bg-[#f4f3f0] py-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-700 transition hover:bg-stone-100"
            >
              <RefreshCw className="size-3.5" />
              Flip
            </button>
          )}
          {onBoost && (
            <button
              type="button"
              disabled={boosting}
              onClick={(e) => {
                e.stopPropagation()
                onBoost()
              }}
              className="flex-1 rounded-full bg-[#1c1c1c] py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white transition hover:bg-black disabled:opacity-50"
            >
              {boosting ? '…' : 'Boost'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CardBack({ teacher, rank, size = 'grid', onFlip, onBoost, boosting }: FaceProps) {
  const { youtube, education, ranking, community, bio, badges, video, rating, profile } = teacher
  const tier = rating.tier || assignTier(rating.overall)
  const theme = TIER_THEME[tier]
  const hero = size === 'hero'

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden border border-black/[0.05] bg-white text-[#1c1c1c]',
        hero ? 'rounded-[32px]' : 'rounded-[24px]',
        theme.glow,
      )}
    >
      <div className={cn('flex flex-1 flex-col gap-3', hero ? 'p-5' : 'p-3.5')}>
        <div className="text-center">
          <span className={cn('inline-block rounded-full px-3.5 py-1 text-[10px] font-black uppercase tracking-wider', theme.badge)}>
            {theme.label} details
          </span>
          <h3 className={cn('mt-3 font-semibold tracking-tight text-[#1c1c1c]', hero ? 'text-2xl' : 'text-lg')}>
            {teacher.name}
          </h3>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
            {youtube.channel_handle || youtube.channel_name}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-[18px] bg-[#f4f3f0] p-3.5">
          <p className={cn('leading-relaxed text-stone-600', hero ? 'text-sm' : 'text-xs')}>
            {bio || 'No bio yet.'}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ['Daily', ranking.daily_rank],
              ['Weekly', ranking.weekly_rank],
              ['Monthly', ranking.monthly_rank],
              ['All-time', ranking.all_time_rank || rank],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-white p-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">{label}</p>
                <p className="mt-0.5 font-mono text-lg font-semibold text-[#1c1c1c]">#{value || '—'}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1.5 text-xs text-stone-600">
            <p>
              <span className="text-stone-400">Subjects · </span>
              {education.subjects.join(', ') || '—'}
            </p>
            <p>
              <span className="text-stone-400">Languages · </span>
              {education.language.join(', ') || '—'}
            </p>
            <p>
              <span className="text-stone-400">Category · </span>
              {education.category || '—'}
            </p>
            <p>
              <span className="text-stone-400">Votes · </span>
              {community.total_votes.toLocaleString()}
            </p>
            {video ? (
              <p>
                <span className="text-stone-400">Featured · </span>
                {video}
              </p>
            ) : null}
            {profile.featured ? <p className={theme.accent}>★ Featured educator</p> : null}
          </div>

          {badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {badges.map((b) => (
                <span key={b} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-stone-700">
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {onFlip && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onFlip()
              }}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-black/[0.06] bg-[#f4f3f0] py-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-700 transition hover:bg-stone-100"
            >
              <RefreshCw className="size-3.5" />
              Front
            </button>
          )}
          {onBoost && (
            <button
              type="button"
              disabled={boosting}
              onClick={(e) => {
                e.stopPropagation()
                onBoost()
              }}
              className="flex-1 rounded-full bg-[#1c1c1c] py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white transition hover:bg-black disabled:opacity-50"
            >
              {boosting ? '…' : 'Boost'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

type Props = {
  teacher: Teacher
  rank: number
  onBoost?: () => void
  onView?: () => void
  onLike?: () => void
  liked?: boolean
  boosting?: boolean
  className?: string
}

export function EducatorCard({ teacher, rank, onBoost, onView, onLike, liked, boosting, className }: Props) {
  return (
    <article className={cn('h-full min-w-0 w-full select-none', className)}>
      <CardFront
        teacher={teacher}
        rank={rank}
        size="grid"
        onBoost={onBoost}
        onView={onView}
        onLike={onLike}
        liked={liked}
        boosting={boosting}
      />
    </article>
  )
}

export function EducatorCardModal({
  teacher,
  rank,
  onClose,
  onBoost,
  boosting,
}: {
  teacher: Teacher
  rank: number
  onClose: () => void
  onBoost?: () => void
  boosting?: boolean
}) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#1c1c1c]/30 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="relative w-full max-w-[380px]" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -right-1 -top-11 rounded-full bg-white p-2 text-[#1c1c1c] shadow-sm hover:bg-stone-50"
        >
          <X className="size-5" />
        </button>

        <div className="[perspective:1400px]">
          <div
            className={cn(
              'relative min-h-[580px] transition-transform duration-500 [transform-style:preserve-3d]',
              flipped && '[transform:rotateY(180deg)]',
            )}
          >
            <div className="absolute inset-0 [backface-visibility:hidden]">
              <CardFront
                teacher={teacher}
                rank={rank}
                size="hero"
                onFlip={() => setFlipped(true)}
                onBoost={onBoost}
                boosting={boosting}
              />
            </div>
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <CardBack
                teacher={teacher}
                rank={rank}
                size="hero"
                onFlip={() => setFlipped(false)}
                onBoost={onBoost}
                boosting={boosting}
              />
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-sm font-medium text-white/90">
          Flip for bio & ranks · tap outside to close
        </p>
      </div>
    </div>
  )
}

export function TierLegend() {
  const tiers: EducatorTier[] = ['bronze', 'silver', 'gold', 'diamond', 'legendary']
  return (
    <div className="rounded-[24px] border border-black/[0.04] bg-white p-4 text-[#1c1c1c]">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone-400">Student Support tiers</p>
      <p className="mt-1 text-sm text-stone-500">
        Same 0–100 score in every category. Subscribers are not part of it.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
        {tiers.map((t) => {
          const theme = TIER_THEME[t]
          const range = {
            bronze: '0–49',
            silver: '50–69',
            gold: '70–84',
            diamond: '85–94',
            legendary: '95–100',
          }[t]
          return (
            <div key={t} className="flex items-center gap-2.5 rounded-2xl bg-[#f4f3f0] p-2.5">
              <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase', theme.badge)}>
                {theme.label}
              </span>
              <span className="font-mono text-xs text-stone-500">{range}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
