'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Select from '../components/Select'
import {
  FormState,
  Language,
  ProfileRow,
  BookRow,
  BookAccessRow,
} from '@/lib/types'

const languageOptions = [
  { value: 'DE', label: 'DE' },
  { value: 'PT', label: 'PT' },
]

function parseLessons(input: string): number[] {
  const result = new Set<number>()


  input.split(',').forEach((part) => {
    const p = part.trim()

    if (/^\d+$/.test(p)) {
      result.add(Number(p))
      return
    }

    const m = p.match(/^(\d+)\s*-\s*(\d+)$/)
    if (!m) return

    const start = Number(m[1])
    const end = Number(m[2])
    if (start > end) return

    for (let i = start; i <= end; i++) result.add(i)
  })

  return [...result].sort((a, b) => a - b)
}

type AccessField = 'user_id' | 'language' | 'book_id' | 'lessonsCsv'
type AccessErrors = Partial<Record<AccessField, string>>

export default function AdminBookAccessTab() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [books, setBooks] = useState<BookRow[]>([])
  const [grants, setGrants] = useState<BookAccessRow[]>([])

  const [form, setForm] = useState<FormState>({
    user_id: '',
    language: 'DE' as Language,
    book_id: '',
    allow_all: false,
    lessonsCsv: '',
  })

  const [accessErrors, setAccessErrors] = useState<AccessErrors>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const validateAccessForm = (f: FormState): AccessErrors => {
    const errs: AccessErrors = {}

    if (!f.user_id) errs.user_id = 'Choose a student'
    if (!f.language) errs.language = 'Choose a language'
    if (!f.book_id) errs.book_id = 'Choose a book'

    if (!f.allow_all) {
      const parsed = parseLessons(f.lessonsCsv)
      if (parsed.length === 0) {
        errs.lessonsCsv = 'Enter allowed lessons'
      }
    }


    return errs
  }

  const setF = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [k]: v }
      if (submitAttempted) {
        setAccessErrors(validateAccessForm(next))
      }
      return next
    })
  }

  const bookOptions = useMemo(() => {
    return books
      .filter((b) => b.language === form.language)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((b) => ({ value: String(b.id), label: b.name }))
  }, [books, form.language])

  const userOptions = useMemo(() => {
    return profiles
      .filter((p) => !!p.email)
      .sort((a, b) => String(a.email).localeCompare(String(b.email)))
      .map((p) => ({ value: p.id, label: p.email as string }))
  }, [profiles])

  const loadAll = async () => {
    setError(null)

    // users list (owner-only via RPC)
    const { data: profData, error: profErr } = await supabase.rpc('owner_list_profiles')
    if (profErr) throw profErr
    setProfiles((profData ?? []) as ProfileRow[])

    // books
    const { data: bookData, error: bookErr } = await supabase
      .from('books')
      .select('id,name,language')
      .order('name', { ascending: true })
    if (bookErr) throw bookErr
    setBooks((bookData ?? []) as BookRow[])

    // existing access rows
    const { data: accessData, error: accessErr } = await supabase
      .from('book_access')
      .select('id,user_id,book_id,allow_all,allowed_lessons,created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (accessErr) throw accessErr
    setGrants((accessData ?? []) as BookAccessRow[])
  }

  const scrollToTop = () => {
    if (typeof window === 'undefined') return
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        setLoading(true)
        await loadAll()
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ok) return
    const t = setTimeout(() => setOk(null), 5000)
    return () => clearTimeout(t)
  }, [ok])

  const upsertAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setOk(null)
    setSubmitAttempted(true)
    scrollToTop()

    const errs = validateAccessForm(form)
    setAccessErrors(errs)
    if (Object.keys(errs).length > 0) return

    const lessons = form.allow_all ? [] : parseLessons(form.lessonsCsv)

    const { error: rpcErr } = await supabase.rpc('grant_book_lessons_append', {
      p_user_id: form.user_id,
      p_book_id: Number(form.book_id),
      p_lessons: lessons,
      p_allow_all: form.allow_all,
    })

    if (rpcErr) return setError(rpcErr.message)

    setOk('Access saved ✅')
    setAccessErrors({})
    setF('allow_all', false)
    setF('lessonsCsv', '')
    setSubmitAttempted(false)

    await loadAll()
  }

  const removeAccess = async (row: BookAccessRow) => {
    setError(null)
    setOk(null)

    const { error: delErr } = await supabase
      .from('book_access')
      .delete()
      .eq('id', row.id)

    if (delErr) return setError(delErr.message)

    setOk('Access removed ✅')
    await loadAll()
  }

  if (loading) {
    return <p className="pt-10 text-center text-white/60">Loading…</p>
  }

  const FieldError = ({ msg }: { msg?: string }) => (
    <p
      className={[
        'mt-1 min-h-[12px] text-xs leading-4',
        msg ? 'text-red-300' : 'text-transparent',
      ].join(' ')}
    >
      {msg || '\u00A0'}
    </p>
  )

  const bookNameById = new Map(books.map((b) => [String(b.id), b.name]))
  const emailById = new Map(profiles.map((p) => [p.id, p.email ?? p.id]))

  return (
    <div className="grid gap-8">
      {error && (
        <div className="justify-self-start w-fit inline-flex rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-md text-red-200">
          {error}
        </div>
      )}
      {ok && (
        <div className="justify-self-start w-fit inline-flex rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {ok}
        </div>
      )}

      <form onSubmit={upsertAccess} noValidate className="grid gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-x-5">
          <div className="grid gap-2 sm:col-span-6">
            <label className="text-md text-white/80">Student</label>
            <Select
              value={form.user_id}
              onChange={(v) => setF('user_id', v)}
              options={userOptions}
              placeholder="- choose -"
            />
            <FieldError msg={accessErrors.user_id} />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <label className="text-md text-white/80">Language</label>
            <Select
              value={form.language}
              onChange={(v) => {
                setF('language', v as Language)
                setF('book_id', '')
              }}
              options={languageOptions}
              placeholder="Language"
            />
            <FieldError msg={accessErrors.language} />
          </div>

          <div className="grid gap-2 sm:col-span-4">
            <label className="text-md text-white/80">Book</label>
            <Select
              value={form.book_id}
              onChange={(v) => setF('book_id', v)}
              options={bookOptions}
              placeholder="- choose -"
            />
            <FieldError msg={accessErrors.book_id} />
          </div>
        </div>

        <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="flex items-center gap-3 text-white/85">
            <input
              type="checkbox"
              checked={form.allow_all}
              onChange={(e) => setF('allow_all', e.target.checked)}
              className="h-4 w-4 accent-violet-500"
            />
            All lessons allowed
          </label>

          {!form.allow_all && (
            <div className="mt-4 grid gap-2">
              <label className="text-sm text-white/60">Allowed lessons</label>
              <input
                value={form.lessonsCsv}
                onChange={(e) => setF('lessonsCsv', e.target.value)}
                placeholder="1,2,3"
                className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
              />
              <FieldError msg={accessErrors.lessonsCsv} />
            </div>
          )}
        </div>

        <button
          type="submit"
          className="mt-6 w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:-translate-y-[1px] hover:shadow-xl active:translate-y-0"
        >
          Save access
        </button>
      </form>

      <hr className="m-6 border-white/20" />

      {/* Existing grants */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-white font-semibold">Existing access</p>

        <div className="mt-4 grid gap-2">
          {grants.length === 0 ? (
            <p className="text-white/60 text-sm">No access rows yet.</p>
          ) : (
            grants.map((g) => (
              <div
                key={g.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/10 bg-black/20 p-3"
              >
                <div className="text-sm text-white/85">
                  <div>
                    <span className="text-white/50">Student:</span> {emailById.get(g.user_id)}
                  </div>
                  <div>
                    <span className="text-white/50">Book:</span>{' '}
                    {bookNameById.get(String(g.book_id)) ?? `#${g.book_id}`}
                  </div>
                  <div>
                    <span className="text-white/50">Lessons:</span>{' '}
                    {g.allow_all ? 'ALL' : (g.allowed_lessons ?? []).join(', ')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeAccess(g)}
                  className="self-start sm:self-auto rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/15"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}