'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { useAuth } from '@/contexts/AuthContext'
import { MAX_STUDENT_VOTES } from '@/lib/firebase'
import { boostsUsedOnDay, COMMENTS_PER_DAY, commentsUsedOnDay } from '@/lib/score'

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, loading, saveProfile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  useEffect(() => {
    if (profile) setDisplayName(profile.displayName)
  }, [profile])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await saveProfile({ displayName })
      setMessage('Profile saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile')
    } finally {
      setBusy(false)
    }
  }

  if (loading || !user || !profile) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-slate-500">
        Loading profile…
      </main>
    )
  }

  const usedToday = boostsUsedOnDay(profile.boostDay, profile.boostsToday)
  const commentsToday = commentsUsedOnDay(profile.commentDay, profile.commentsToday)
  const remaining = Math.max(0, MAX_STUDENT_VOTES - usedToday)
  const commentsLeft = Math.max(0, COMMENTS_PER_DAY - commentsToday)

  return (
    <main className="min-h-screen bg-[#e7e5e1] px-3 py-3 text-[#1c1c1c] sm:px-4 sm:py-4">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[28px] bg-[#f4f3f0] px-4 py-5 sm:px-8">
          <SiteNav />
        </section>

      <div className="px-2 py-10">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-600">Your account</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Student profile</h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage how you appear on TeacherTop. Each day you get 10 votes and 10 comments.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Stat label="Votes today" value={`${usedToday} / ${MAX_STUDENT_VOTES}`} />
          <Stat label="Votes left today" value={String(remaining)} />
          <Stat label="Comments today" value={`${commentsToday} / ${COMMENTS_PER_DAY}`} />
          <Stat label="Comments left today" value={String(commentsLeft)} />
        </div>

        <form
          onSubmit={onSave}
          className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <label className="block text-sm font-bold">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-amber-400"
          />
          <label className="mt-4 block text-sm font-bold">Email</label>
          <input
            value={profile.email}
            disabled
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500"
          />

          {profile.votedTeacherIds.length > 0 && (
            <p className="mt-4 text-xs text-slate-500">
              You have voted for {profile.votedTeacherIds.length} teacher
              {profile.votedTeacherIds.length > 1 ? 's' : ''}.
            </p>
          )}

          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save profile'}
            </button>
            <button
              type="button"
              onClick={() => signOut().then(() => router.replace('/login'))}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </form>
      </div>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-xl font-black capitalize">{value}</p>
    </div>
  )
}
