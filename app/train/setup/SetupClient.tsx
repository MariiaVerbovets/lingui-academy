'use client'


import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getIsAdmin } from '@/lib/isAdmin'
import Select from '../../components/Select'

type TrainMode = 'cards' | 'single' | 'writing'

type RawLessonRow = {
  lesson: number
  total_words: number
  cards_percent: number
  single_percent: number
  writing_percent: number
  overall_percent: number
}

type BookAccessRow = {
  book_id: number
  book_name: string | null
  allow_all: boolean
  allowed_lessons: number[] | null
}

export default function SetupClient({ bookId }: { bookId: string }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const sp = useSearchParams()
  const lang = sp.get('lang')
  const lessonFromUrl = sp.get('lesson')
  const [bookName, setBookName] = useState<string | null>(null)

  const parsedLessonFromUrl =
    lessonFromUrl && Number.isFinite(Number(lessonFromUrl))
      ? Number(lessonFromUrl)
      : null

  const goBack = () => {
    if (lang) {
      router.push(`/languages/${encodeURIComponent(lang)}`)
      return
    }
    router.push('/languages')
  }


  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<RawLessonRow[]>([])
  const [allowAll, setAllowAll] = useState(false)
  const [allowedLessons, setAllowedLessons] = useState<number[]>([])
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null)
  const [mode, setMode] = useState<TrainMode>('cards')
  const [error, setError] = useState<string | null>(null)

useEffect(() => {
  const run = async () => {
    setLoading(true)
    setError(null)


    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      router.push('/login')
      return
    }


    const admin = await getIsAdmin()
    setIsAdmin(admin)


    if (!bookId?.trim()) {
      setError('Missing bookId.')
      setRows([])
      setSelectedLesson(null)
      setLoading(false)
      return
    }


    try {
      const bookIdNum = Number(bookId)


      const [{ data: progress, error: progressErr }, { data: accessRows, error: accessErr }] = await Promise.all([
        supabase.rpc('get_book_lesson_progress', { p_book_id: bookIdNum }),
        supabase.rpc('get_book_access_for_me', { p_book_id: bookIdNum }),
      ])


      if (progressErr) throw progressErr
      if (accessErr) throw accessErr


      // get_book_access_for_me returns ARRAY, so take first row (or null)
      const accessRow = (accessRows?.[0] ?? null) as BookAccessRow | null
      setBookName((accessRow?.book_name ?? '').trim() || null)

      const allow = !!accessRow?.allow_all
      const allowedArr = (accessRow?.allowed_lessons ?? [])
        .map((x) => Number(x))
        .filter((x) => Number.isFinite(x))


      setAllowAll(allow)
      setAllowedLessons(allowedArr)


      const raw = (progress ?? []) as any[]
      const normalized: RawLessonRow[] = raw.map((r) => ({
        lesson: Number(r.lesson),
        total_words: Number(r.total_words ?? 0),
        cards_percent: Number(r.cards_percent ?? 0),
        single_percent: Number(r.single_percent ?? 0),
        writing_percent: Number(r.writing_percent ?? 0),
        overall_percent: Number(r.overall_percent ?? 0),
      }))


      const allowedSet = new Set(allowedArr)
      const visible = allow ? normalized : normalized.filter((r) => allowedSet.has(r.lesson))


      setRows(visible)


      if (visible.length) {
        setSelectedLesson((prev) => {
          if (prev !== null && visible.some((r) => r.lesson === prev)) return prev
          if (parsedLessonFromUrl && visible.some((r) => r.lesson === parsedLessonFromUrl)) return parsedLessonFromUrl
          return visible[0].lesson
        })
      } else {
        setSelectedLesson(null)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error')
      setRows([])
      setSelectedLesson(null)
    } finally {
      setLoading(false)
    }
  }

  run()
}, [bookId, router, parsedLessonFromUrl])

  const selectedRow = useMemo(() => {
    if (selectedLesson === null) return null
    return rows.find((r) => r.lesson === selectedLesson) ?? null
  }, [rows, selectedLesson])


  const cardsPct = selectedRow?.cards_percent ?? 0
  const singlePct = selectedRow?.single_percent ?? 0
  const writingPct = selectedRow?.writing_percent ?? 0


  const canStart = useMemo(() => {
    return !!bookId && selectedLesson !== null && (mode === 'cards' || mode === 'single' || mode === 'writing')
  }, [bookId, selectedLesson, mode])


  const start = () => {
    if (!canStart) return


    const params = new URLSearchParams({
      bookId: String(bookId),
      lesson: String(selectedLesson),
      mode,
      ...(lang ? { lang } : {}),
    })


    router.push(`/train?${params.toString()}`)
  }


  const lessonOptions = useMemo(() => {
    return [...rows]
      .sort((a, b) => a.lesson - b.lesson)
      .map((r) => ({
        value: String(r.lesson),
        label: `Lesson ${r.lesson} (${r.total_words}) — Overall ${r.overall_percent}%`,
      }))
  }, [rows])


  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
        <p className="pt-10 text-center text-white/60">Loading…</p>
      </main>
    )
  }


  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
      {isAdmin && (
        <div className="absolute right-6 top-6 z-20">
          <button
            onClick={() => router.push('/admin?from=' + encodeURIComponent('/languages/german'))}
            className={[
              'group relative h-10 w-10 rounded-xl border border-white/15 bg-white/5',
              'transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20',
            ].join(' ')}
            aria-label="Admin"
            type="button"
          >
            <div
              className="h-full w-full transition-transform duration-200 ease-out group-hover:rotate-12"
              style={{
                WebkitMask: 'url(/admin.svg) center / 60% no-repeat',
                mask: 'url(/admin.svg) center / 60% no-repeat',
                backgroundColor: 'rgba(255,255,255,0.85)',
              }}
            />
            <span
              className={[
                'pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2',
                'whitespace-nowrap rounded-lg border border-white/10 bg-black/50 px-2 py-1',
                'text-xs text-white/85 shadow-lg backdrop-blur',
                'opacity-0 translate-y-1 transition duration-150',
                'group-hover:opacity-100 group-hover:translate-y-0',
              ].join(' ')}
            >
              Admin
            </span>
          </button>
        </div>
      )}


      <button
        type="button"
        onClick={goBack}
        className={[
          'absolute left-6 top-6 z-30',
          'inline-flex items-center gap-2',
          'text-md text-white/70 hover:text-white',
          'transition',
        ].join(' ')}
      >
        <span className="text-base">←</span>
        Back
      </button>


      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute top-24 -left-28 h-[380px] w-[380px] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 -right-24 h-[460px] w-[460px] rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.10),transparent_55%)]" />
      </div>


      <div className="relative min-h-screen flex flex-col">
        <div className="flex flex-1 items-center justify-center py-10 sm:py-16">
          <div className="w-full max-w-2xl">
            <div className="min-h-[40vh] rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl py-10 px-6 sm:py-14 sm:px-10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <span className="text-xl">{lang === 'german' ? '🇩🇪' : lang === 'portuguese' ? '🇵🇹' : '🐧'}</span>
                </div>
                <div>
                  <p className="text-sm text-white/60">{bookName ?? 'Lingui Academy'}</p>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                    Training setup
                  </h1>
                </div>
              </div>


              {error && (
                <div className="mt-6 inline-flex rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-md text-red-200">
                  {error}
                </div>
              )}


              {!error && rows.length === 0 && (
                <div className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/5 p-4 text-md text-white/60">
                  No available lessons for this book.
                </div>
              )}


              {/* Lessons */}
              <div className="mt-6 space-y-2">
                <div className="text-md font-medium text-white/80">Lesson</div>


                <Select
                  value={selectedLesson === null ? '' : String(selectedLesson)}
                  onChange={(v) => setSelectedLesson(v ? Number(v) : null)}
                  placeholder="Select lesson…"
                  options={lessonOptions}
                />
              </div>


              {/* Modes */}
              <div className="mt-12 space-y-2">
                <div className="text-md font-medium text-white/80">Training mode</div>


                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('cards')}
                    className={[
                      'rounded-2xl px-4 py-3 text-sm font-semibold transition',
                      mode === 'cards'
                        ? 'bg-white text-slate-950 shadow-lg shadow-white/10'
                        : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15',
                    ].join(' ')}
                  >
                    Cards review <span className="opacity-60">({cardsPct}%)</span>
                  </button>


                  <button
                    type="button"
                    onClick={() => setMode('single')}
                    className={[
                      'rounded-2xl px-4 py-3 text-sm font-semibold transition',
                      mode === 'single'
                        ? 'bg-white text-slate-950 shadow-lg shadow-white/10'
                        : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15',
                    ].join(' ')}
                  >
                    Single choice <span className="opacity-60">({singlePct}%)</span>
                  </button>


                  <button
                    type="button"
                    onClick={() => setMode('writing')}
                    className={[
                      'rounded-2xl px-4 py-3 text-sm font-semibold transition',
                      mode === 'writing'
                        ? 'bg-white text-slate-950 shadow-lg shadow-white/10'
                        : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15',
                    ].join(' ')}
                  >
                    Writing <span className="opacity-60">({writingPct}%)</span>
                  </button>
                </div>
              </div>


              <button
                type="button"
                onClick={start}
                disabled={!canStart}
                className="mt-12 w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:-translate-y-[1px] hover:shadow-xl active:translate-y-0 disabled:opacity-60"
              >
                Start
              </button>
            </div>
          </div>
        </div>


        <footer className="pb-6">
          <p className="text-center text-xs text-white/35">Lingui Academy</p>
        </footer>
      </div>
    </main>
  )
}