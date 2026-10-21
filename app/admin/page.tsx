'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { FileJson, Plus, Trash2, Trophy } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { BULK_JSON_EXAMPLE, parseEducatorBulkJson } from '@/lib/educatorImport'
import {
  bulkCreateTeachers,
  createTeacher,
  deleteTeacher,
  initialsFromName,
  SEED_TEACHERS,
  subscribeTeachers,
  updateTeacher,
} from '@/lib/teachers'
import {
  COLOR_OPTIONS,
  formatSubscribers,
  TEACHER_FIELDS,
  type Teacher,
} from '@/lib/types'

type TeacherForm = {
  name: string
  slug: string
  bio: string
  avatar_url: string
  channel_name: string
  channel_handle: string
  channel_url: string
  subscriber_count: string
  category: string
  subjects: string
  language: string
  content: string
  teaching: string
  impact: string
  engagement: string
  weekly_growth: string
  color: string
  video: string
  badges: string
  featured: boolean
}

const emptyForm: TeacherForm = {
  name: '',
  slug: '',
  bio: '',
  avatar_url: '',
  channel_name: '',
  channel_handle: '',
  channel_url: '',
  subscriber_count: '0',
  category: TEACHER_FIELDS[0],
  subjects: '',
  language: 'Hindi, English',
  content: '75',
  teaching: '75',
  impact: '75',
  engagement: '75',
  weekly_growth: '0',
  color: COLOR_OPTIONS[0],
  video: '',
  badges: '',
  featured: false,
}

function parseSubscribersInput(raw: string): number {
  const text = raw.trim().toUpperCase()
  const num = parseFloat(text)
  if (!Number.isFinite(num)) return 0
  if (text.endsWith('M')) return Math.round(num * 1_000_000)
  if (text.endsWith('K')) return Math.round(num * 1_000)
  return Math.round(num)
}

export default function AdminPage() {
  const router = useRouter()
  const { user, profile, loading, isAdmin, signOut } = useAuth()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [form, setForm] = useState<TeacherForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [bulkJson, setBulkJson] = useState('')
  const [bulkResult, setBulkResult] = useState('')

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/admin/login')
      return
    }
    if (profile && !isAdmin) {
      router.replace('/admin/login')
    }
  }, [loading, user, profile, isAdmin, router])

  useEffect(() => {
    if (!isAdmin) return
    return subscribeTeachers(setTeachers)
  }, [isAdmin])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        bio: form.bio.trim(),
        avatar_url: form.avatar_url.trim(),
        youtube: {
          channel_name: form.channel_name.trim(),
          channel_handle: form.channel_handle.trim(),
          channel_url: form.channel_url.trim() || undefined,
          subscriber_count: parseSubscribersInput(form.subscriber_count),
        },
        education: {
          category: form.category,
          subjects: form.subjects
            .split(/[·|,/]/)
            .map((s) => s.trim())
            .filter(Boolean),
          language: form.language
            .split(/[·|,/]/)
            .map((s) => s.trim())
            .filter(Boolean),
        },
        rating: {
          content: Number(form.content) || 70,
          teaching: Number(form.teaching) || 70,
          impact: Number(form.impact) || 70,
          engagement: Number(form.engagement) || 70,
        },
        ranking: {
          weekly_growth_percent: Number(form.weekly_growth) || 0,
        },
        profile: {
          featured: form.featured,
          verified_channel: false,
        },
        color: form.color,
        video: form.video.trim(),
        badges: form.badges
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean),
      }

      if (!payload.name) throw new Error('Teacher name is required')
      if (!payload.youtube.channel_handle) throw new Error('Channel handle is required')

      if (editingId) {
        const existing = teachers.find((t) => t.id === editingId)
        await updateTeacher(editingId, {
          ...payload,
          community: existing
            ? {
                total_votes: existing.community.total_votes,
                watchlist_count: existing.community.watchlist_count,
              }
            : undefined,
          ranking: {
            daily_rank: existing?.ranking.daily_rank ?? 0,
            weekly_rank: existing?.ranking.weekly_rank ?? 0,
            monthly_rank: existing?.ranking.monthly_rank ?? 0,
            all_time_rank: existing?.ranking.all_time_rank ?? 0,
            weekly_growth_percent: Number(form.weekly_growth) || 0,
          },
        })
        setMessage('Educator updated.')
      } else {
        await createTeacher(payload)
        setMessage('Educator added.')
      }
      setForm(emptyForm)
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  function startEdit(t: Teacher) {
    setEditingId(t.id)
    setForm({
      name: t.name,
      slug: t.slug,
      bio: t.bio,
      avatar_url: t.avatar_url,
      channel_name: t.youtube.channel_name,
      channel_handle: t.youtube.channel_handle,
      channel_url: t.youtube.channel_url,
      subscriber_count: String(t.youtube.subscriber_count),
      category: TEACHER_FIELDS.includes(t.education.category as (typeof TEACHER_FIELDS)[number])
        ? t.education.category
        : TEACHER_FIELDS[0],
      subjects: t.education.subjects.join(', '),
      language: t.education.language.join(', '),
      content: String(Math.round(t.rating.content)),
      teaching: String(Math.round(t.rating.teaching)),
      impact: String(Math.round(t.rating.impact)),
      engagement: String(Math.round(t.rating.engagement)),
      weekly_growth: String(t.ranking.weekly_growth_percent),
      color: t.color,
      video: t.video,
      badges: t.badges.join(', '),
      featured: t.profile.featured,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return
    setBusy(true)
    setError('')
    try {
      await deleteTeacher(id)
      if (editingId === id) {
        setEditingId(null)
        setForm(emptyForm)
      }
      setMessage('Educator deleted.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function seedDefaults() {
    if (!confirm('Add the default seed educators? Existing ones are kept.')) return
    setBusy(true)
    setError('')
    try {
      const result = await bulkCreateTeachers(SEED_TEACHERS)
      setMessage(
        `Seeded ${result.created.length} educators` +
          (result.failed.length ? ` · ${result.failed.length} failed` : ''),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed failed')
    } finally {
      setBusy(false)
    }
  }

  function permissionHint(text: string) {
    if (!/insufficient permissions|permission-denied/i.test(text)) return text
    return `${text}

Fix: open Firebase Console → Firestore → Rules → paste contents of firestore.rules from this project → Publish. Then retry.`
  }

  async function onBulkImport() {
    setBusy(true)
    setError('')
    setMessage('')
    setBulkResult('')
    try {
      const inputs = parseEducatorBulkJson(bulkJson)
      if (!confirm(`Publish ${inputs.length} educator(s) from JSON?`)) {
        setBusy(false)
        return
      }
      const result = await bulkCreateTeachers(inputs)
      const failText = result.failed.length
        ? `. Failed: ${result.failed.map((f) => `${f.name} (${f.error})`).join('; ')}`
        : '.'
      const summary = permissionHint(
        `Published ${result.created.length} educator(s)${failText}`,
      )
      setBulkResult(summary)
      setMessage(summary)
      if (result.created.length && !result.failed.length) setBulkJson('')
    } catch (err) {
      setError(permissionHint(err instanceof Error ? err.message : 'Bulk import failed'))
    } finally {
      setBusy(false)
    }
  }

  if (loading || !isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-slate-500">
        {loading ? 'Loading…' : 'Redirecting to admin login…'}
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-amber-400">
              <Trophy className="size-5" />
            </span>
            <span className="text-lg font-black tracking-tight">
              TeacherTop
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/" className="text-slate-500 hover:text-slate-900">
              Leaderboard
            </Link>
            <button
              type="button"
              onClick={() => signOut().then(() => router.replace('/admin/login'))}
              className="text-slate-500 hover:text-slate-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-600">Admin</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Publish educators</h1>
            <p className="mt-2 text-sm text-slate-500">
              Add · edit · delete · bulk JSON import. RTG &amp; tier auto-assign on save.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={seedDefaults}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-60"
          >
            Seed defaults
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-bold">If bulk publish says “insufficient permissions”</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-amber-900/90">
            <li>
              Open{' '}
              <a
                className="font-semibold underline"
                href="https://console.firebase.google.com/project/studio-4110020009-152c3/firestore/rules"
                target="_blank"
                rel="noreferrer"
              >
                Firebase → Firestore → Rules
              </a>
            </li>
            <li>
              Copy everything from this project’s <code className="rounded bg-amber-100 px-1">firestore.rules</code> file
            </li>
            <li>Paste → <b>Publish</b> → retry bulk JSON here</li>
          </ol>
        </div>

        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black">
                <FileJson className="size-5 text-amber-700" />
                Bulk JSON publish
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Paste an array of educators (or {'{ "educators": [...] }'}) matching the schema.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBulkJson(BULK_JSON_EXAMPLE)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-50"
            >
              Load example
            </button>
          </div>
          <textarea
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            rows={12}
            placeholder='[{ "name": "...", "youtube": { "channel_handle": "@..." }, ... }]'
            className="mt-4 w-full rounded-xl border border-amber-200 bg-white px-4 py-3 font-mono text-xs outline-none focus:border-amber-400"
          />
          {bulkResult && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {bulkResult}
            </p>
          )}
          <button
            type="button"
            disabled={busy || !bulkJson.trim()}
            onClick={onBulkImport}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            <Plus className="size-4" />
            {busy ? 'Publishing…' : 'Publish JSON educators'}
          </button>
        </section>

        <form
          onSubmit={onSubmit}
          className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">
              {editingId ? 'Edit educator' : 'Add new educator'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                }}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                Cancel edit
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field
              label="Name"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              required
            />
            <Field
              label="Slug"
              value={form.slug}
              onChange={(v) => setForm((f) => ({ ...f, slug: v }))}
              placeholder="alakh-pandey"
            />
            <Field
              label="Avatar URL (full https link)"
              value={form.avatar_url}
              onChange={(v) => setForm((f) => ({ ...f, avatar_url: v }))}
              placeholder="https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg"
              className="sm:col-span-2"
            />
            {form.avatar_url.trim() ? (
              <div className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.avatar_url.trim()}
                  alt="Avatar preview"
                  referrerPolicy="no-referrer"
                  className="size-14 rounded-lg object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.opacity = '0.25'
                  }}
                />
                <p className="text-xs text-slate-500">
                  Preview — use a public <b>https://</b> image URL. Local paths like{' '}
                  <code>/educators/…</code> only work if the file exists in <code>public/</code>.
                </p>
              </div>
            ) : null}
            <label className="block text-sm font-bold sm:col-span-2">
              Bio
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal outline-none"
              />
            </label>

            <p className="sm:col-span-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-600">
              YouTube
            </p>
            <Field
              label="Channel name"
              value={form.channel_name}
              onChange={(v) => setForm((f) => ({ ...f, channel_name: v }))}
              placeholder="Physics Wallah"
            />
            <Field
              label="Handle"
              value={form.channel_handle}
              onChange={(v) => setForm((f) => ({ ...f, channel_handle: v }))}
              placeholder="@PhysicsWallah"
              required
            />
            <Field
              label="Channel URL"
              value={form.channel_url}
              onChange={(v) => setForm((f) => ({ ...f, channel_url: v }))}
              className="sm:col-span-2"
            />
            <Field
              label="Subscribers (number or 11.7M)"
              value={form.subscriber_count}
              onChange={(v) => setForm((f) => ({ ...f, subscriber_count: v }))}
            />
            <Field
              label="Weekly growth %"
              value={form.weekly_growth}
              onChange={(v) => setForm((f) => ({ ...f, weekly_growth: v }))}
            />

            <p className="sm:col-span-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-600">
              Education
            </p>
            <label className="block text-sm font-bold">
              Category
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal outline-none"
              >
                {TEACHER_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Language"
              value={form.language}
              onChange={(v) => setForm((f) => ({ ...f, language: v }))}
            />
            <Field
              label="Subjects (comma separated)"
              value={form.subjects}
              onChange={(v) => setForm((f) => ({ ...f, subjects: v }))}
              placeholder="JEE, NEET, Physics"
              className="sm:col-span-2"
            />

            <p className="sm:col-span-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-600">
              Rating pillars · RTG &amp; tier auto-assign
            </p>
            <Field
              label="Content"
              value={form.content}
              onChange={(v) => setForm((f) => ({ ...f, content: v }))}
            />
            <Field
              label="Teaching"
              value={form.teaching}
              onChange={(v) => setForm((f) => ({ ...f, teaching: v }))}
            />
            <Field
              label="Impact"
              value={form.impact}
              onChange={(v) => setForm((f) => ({ ...f, impact: v }))}
            />
            <Field
              label="Engagement"
              value={form.engagement}
              onChange={(v) => setForm((f) => ({ ...f, engagement: v }))}
            />

            <label className="block text-sm font-bold sm:col-span-2">
              Card color
              <select
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal outline-none"
              >
                {COLOR_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Featured video"
              value={form.video}
              onChange={(v) => setForm((f) => ({ ...f, video: v }))}
              className="sm:col-span-2"
            />
            <Field
              label="Badges (comma separated)"
              value={form.badges}
              onChange={(v) => setForm((f) => ({ ...f, badges: v }))}
              className="sm:col-span-2"
            />
            <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                className="size-4 rounded border-slate-300"
              />
              Featured educator
            </label>
          </div>

          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            <Plus className="size-4" />
            {busy ? 'Saving…' : editingId ? 'Update educator' : 'Add educator'}
          </button>
        </form>

        <section className="mt-10">
          <h2 className="text-lg font-black">All educators ({teachers.length})</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
            {teachers.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-500">
                No educators yet. Add one above or seed defaults.
              </p>
            )}
            {teachers.map((t) => (
              <article
                key={t.id}
                className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${t.color} text-sm font-black`}
                  >
                    {initialsFromName(t.name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{t.name}</h3>
                    <p className="truncate text-xs text-slate-500">
                      {t.slug} · {t.youtube.channel_handle} · RTG {t.rating.overall} ·{' '}
                      {t.rating.tier} · {formatSubscribers(t.youtube.subscriber_count)} ·{' '}
                      {t.community.total_votes.toLocaleString()} votes
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDelete(t.id, t.name)}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  className = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}) {
  return (
    <label className={`block text-sm font-bold ${className}`}>
      {label}
      <input
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal outline-none focus:border-amber-400"
      />
    </label>
  )
}
