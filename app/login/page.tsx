'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [loading, user, router])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password)
      } else {
        await signUpWithEmail(email, password, displayName)
      }
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  async function onGoogle() {
    setError('')
    setBusy(true)
    try {
      await signInWithGoogle()
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
        <Link href="/" className="mb-8 flex items-center gap-3 self-start">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-400">
            <Trophy className="size-5" />
          </span>
          <span className="text-lg font-black tracking-tight">
            TeacherTop
          </span>
        </Link>

        <div className="rounded-[28px] border border-black/[0.04] bg-white p-6 shadow-[0_12px_40px_rgba(28,25,23,0.06)] sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-600">
            Student access
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Create your profile'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to vote and comment. Every student gets 10 votes and 10 comments a day, for any teacher.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-lg py-2 text-sm font-bold ${mode === 'login' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`rounded-lg py-2 text-sm font-bold ${mode === 'signup' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
            {mode === 'signup' && (
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-amber-400"
              />
            )}
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-amber-400"
            />
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-amber-400"
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold hover:bg-slate-50 disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>

        </div>
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.8-4.1 2.8-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3 5.8 14.9l-2.7 2.1C4.8 19.9 8.1 22 12 22c2.7 0 5-.9 6.7-2.3l-3.1-2.4c-.9.6-2 .9-3.6.9-2.8 0-5.1-1.9-6-4.4z"
      />
      <path
        fill="#4A90E2"
        d="M3.1 7l2.7 2.1c.9-2.5 3.2-4.4 6.2-4.4 1.6 0 3 .6 4.1 1.6l3-3C16.9 1.7 14.6.8 12 .8 8.1.8 4.8 2.9 3.1 7z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.7c1.6 0 3 .6 4.1 1.6l3-3C16.9 1.7 14.6.8 12 .8 8.1.8 4.8 2.9 3.1 7l2.7 2.1C6.7 6.6 9.1 4.7 12 4.7z"
        opacity="0"
      />
      <path
        fill="#FBBC05"
        d="M3.1 7C2.4 8.4 2 10 2 11.8s.4 3.4 1.1 4.8l3.5-2.7c-.2-.7-.3-1.4-.3-2.1 0-.7.1-1.4.3-2.1L3.1 7z"
      />
    </svg>
  )
}
