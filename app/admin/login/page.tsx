'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { Shield, Trophy } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const ADMIN_EMAIL = 'akkupatel055@gmail.com'

export default function AdminLoginPage() {
  const router = useRouter()
  const { user, isAdmin, loading, signInAdmin, signOut } = useAuth()
  const [email, setEmail] = useState(ADMIN_EMAIL)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && user && isAdmin) {
      router.replace('/admin')
    }
  }, [loading, user, isAdmin, router])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signInAdmin(email, password)
      router.replace('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
        <Link href="/" className="mb-8 flex items-center gap-3 self-start">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-400 text-slate-950">
            <Trophy className="size-5" />
          </span>
          <span className="text-lg font-black tracking-tight">
            TeacherTop
          </span>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur sm:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
            <Shield className="size-3.5" />
            Admin portal
          </div>
          <h1 className="text-3xl font-black tracking-tight">Admin sign in</h1>
          <p className="mt-2 text-sm text-slate-400">
            Login only. Publish, edit, and delete educators after sign-in.
          </p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin email"
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-amber-400"
            />
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-amber-400"
            />

            {error && (
              <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60"
            >
              {busy ? 'Please wait…' : 'Enter admin panel'}
            </button>
          </form>

          {user && !isAdmin && (
            <button
              type="button"
              onClick={() => signOut()}
              className="mt-4 w-full text-center text-xs font-semibold text-slate-500 hover:text-white"
            >
              Signed in as student — sign out to use admin login
            </button>
          )}

          <p className="mt-6 text-center text-xs text-slate-500">
            Student?{' '}
            <Link href="/login" className="font-bold text-amber-300 hover:underline">
              Go to student login
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
