'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type WordRow = {
  id: number
  word_singular: string
  translation_ru: string | null
  translation_ukr: string | null
  translation_en: string | null
  picture: string | null
}

const PRAISE_LINES = [
  'Good job! 🎉',
  'Great work! ⭐️',
  'Awesome! Keep going 🚀',
  'Well done! 💪',
  'You’re doing amazing! 🌟',
  'Nice progress! ✅',
  'Fantastic effort! 🔥',
  'Proud of you! 🫶',
  'You nailed it! 🎯',
  'Excellent session! 🧠',
]

export default function TrainCardsReview() {
  const router = useRouter()
  const sp = useSearchParams()

  const bookId = sp.get('bookId') ?? ''
  const lesson = sp.get('lesson') ?? ''
  const mode = sp.get('mode') ?? 'cards'

  const parsedBookId = Number(bookId)
  const parsedLesson = Number(lesson)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [words, setWords] = useState<WordRow[]>([])
  const [index, setIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  // session stats
  const [learnedToday, setLearnedToday] = useState(0)
  const [praise, setPraise] = useState(
    () => PRAISE_LINES[Math.floor(Math.random() * PRAISE_LINES.length)],
  )

  // done screen + “lesson cleared?” check
  const [done, setDone] = useState(false)
  const [lessonCleared, setLessonCleared] = useState(false)
  const [checkingLessonCleared, setCheckingLessonCleared] = useState(false)

  // reset button state
  const [resetBusy, setResetBusy] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const current = words[index] ?? null
  const total = words.length

  // reset UI when params change
  useEffect(() => {
    setPraise(PRAISE_LINES[Math.floor(Math.random() * PRAISE_LINES.length)])
    setLearnedToday(0)
    setDone(false)
    setLessonCleared(false)
    setCheckingLessonCleared(false)
    setResetBusy(false)
    setResetError(null)
    setError(null)
    setWords([])
    setIndex(0)
    setIsFlipped(false)
  }, [bookId, lesson, mode])

  useEffect(() => {
    if (mode !== 'cards') return

    const load = async () => {
      setLoading(true)
      setError(null)
      setResetError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        router.push('/login')
        return
      }

      if (!bookId || !lesson) {
        setError('Missing bookId or lesson.')
        setLoading(false)
        return
      }

      if (!Number.isFinite(parsedBookId) || !Number.isFinite(parsedLesson)) {
        setError('Invalid bookId or lesson.')
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.rpc('get_cards_review_words', {
          p_book_id: parsedBookId,
          p_lesson: parsedLesson,
          p_limit: 10,
        })
        if (error) throw error

        setWords((data ?? []) as WordRow[])
        setIndex(0)
        setIsFlipped(false)
      } catch (e: any) {
        setError(e?.message ?? 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [bookId, lesson, mode, parsedBookId, parsedLesson, router])

  const title = useMemo(() => {
    const l = lesson ? `Lesson ${lesson}` : 'Lesson'
    return `${l}`
  }, [lesson])

  const goNext = () => {
    setIsFlipped(false)
    setIndex((i) => {
      const next = i + 1
      if (next >= total) {
        setDone(true)
        return i // keep index stable; done controls the screen
      }
      return next
    })
  }

  const markRemembered = async () => {
    if (!current) return

    try {
      const { error } = await supabase.rpc('mark_word_learned', {
        p_word_id: current.id,
        p_mode: 'cards',
      })
      if (error) throw error
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save progress')
      return
    }

    setLearnedToday((v) => v + 1)
    goNext()
  }

  const markWrong = () => {
    goNext()
  }

  const finishTraining = () => {
    router.push(`/train/setup?bookId=${encodeURIComponent(bookId)}`)
  }

  const isDone = !error && total > 0 && done

  // when done: check if lesson is fully learned in cards mode
  useEffect(() => {
    if (!isDone) return
    if (!Number.isFinite(parsedBookId) || !Number.isFinite(parsedLesson)) return

    const check = async () => {
      setCheckingLessonCleared(true)
      try {
        const { data, error } = await supabase.rpc('get_cards_review_words', {
          p_book_id: parsedBookId,
          p_lesson: parsedLesson,
          p_limit: 1,
        })
        if (error) throw error
        setLessonCleared((data ?? []).length === 0)
      } catch {
        setLessonCleared(false)
      } finally {
        setCheckingLessonCleared(false)
      }
    }

    check()
  }, [isDone, parsedBookId, parsedLesson])

  // RESET: after reset -> go to setup (so you see 0% there)
  const resetProgress = async () => {
    if (!Number.isFinite(parsedBookId) || !Number.isFinite(parsedLesson)) return

    setResetBusy(true)
    setResetError(null)
    setError(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        router.push('/login')
        return
      }

      const { error } = await supabase.rpc('reset_progress_for_lesson', {
        p_book_id: parsedBookId,
        p_lesson: parsedLesson,
        p_mode: 'cards',
      })
      if (error) throw error

      // ✅ after reset go to setup (so user sees 0% there)
      router.push(`/train/setup?bookId=${encodeURIComponent(bookId)}`)
    } catch (e: any) {
      setResetError(e?.message ?? 'Failed to reset progress')
    } finally {
      setResetBusy(false)
    }
  }

  const Bg = () => (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-28 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="absolute top-24 -left-28 h-[380px] w-[380px] rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-0 -right-24 h-[460px] w-[460px] rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.10),transparent_55%)]" />
    </div>
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
        <p className="pt-10 text-center text-white/60">Loading…</p>
      </main>
    )
  }

  // start screen: no new words at all
  if (!error && total === 0) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
        <Bg />
        <div className="relative min-h-screen flex items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl text-center shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">Cards review</p>
            <h1 className="mt-4 text-2xl font-semibold text-white">No new words left 🎉</h1>
            <p className="mt-2 text-white/60">
              You’ve learned all words in Lesson {Number.isFinite(parsedLesson) ? parsedLesson : lesson}.
            </p>

            {resetError && (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                {resetError}
              </div>
            )}

            <button
              type="button"
              onClick={finishTraining}
              className="mt-6 w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:-translate-y-[1px] hover:shadow-xl active:translate-y-0"
            >
              Back to setup
            </button>

            <button
              type="button"
              onClick={resetProgress}
              disabled={resetBusy}
              className="mt-3 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-base font-semibold text-white/90 transition hover:bg-white/15 disabled:opacity-60"
            >
              {resetBusy ? 'Resetting…' : 'Reset progress'}
            </button>
          </div>
        </div>
      </main>
    )
  }

  // final screen after finishing this session
  if (isDone) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
        <Bg />
        <div className="relative min-h-screen flex flex-col items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-12 backdrop-blur-xl text-center shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">Cards review</p>

            <h1 className="mt-4 text-2xl font-semibold text-white">
              {lessonCleared ? 'You learned all words in this lesson! 🎉' : praise}
            </h1>

            <p className="mt-2 text-white/60">
              {checkingLessonCleared
                ? 'Checking progress…'
                : lessonCleared
                  ? 'Amazing! There are no new words left for Cards review in this lesson.'
                  : 'Nice session — keep going!'}
            </p>

            <div className="mt-5">
              <p className="text-4xl font-semibold text-white">
                {learnedToday} / {total}
              </p>
            </div>

            {resetError && (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                {resetError}
              </div>
            )}

            <button
              type="button"
              onClick={finishTraining}
              className="mt-6 w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:-translate-y-[1px] hover:shadow-xl active:translate-y-0"
            >
              Finish training
            </button>

            <button
              type="button"
              onClick={resetProgress}
              disabled={resetBusy}
              className="mt-3 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-base font-semibold text-white/90 transition hover:bg-white/15 disabled:opacity-60"
            >
              {resetBusy ? 'Resetting…' : 'Reset progress'}
            </button>
          </div>
        </div>
      </main>
    )
  }

  // normal training screen
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
      <Bg />

      <div className="relative min-h-screen flex flex-col">
        <header className="pt-10 pb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Cards review</h1>
          <p className="mt-2 text-white/60">{title}</p>
        </header>

        <section className="flex-1 flex items-start justify-center pb-10">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
            {error && (
              <div className="mb-5 inline-flex rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            {current && (
              <>
                <div className="mb-4 text-center text-md text-white/50">
                  {index + 1} / {total}
                </div>

                <button
                  type="button"
                  onClick={() => setIsFlipped((v) => !v)}
                  className="w-full focus:outline-none"
                  aria-label="Flip card"
                >
                  <div className="mx-auto [perspective:1200px]">
                    <div
                      className={[
                        'relative w-full aspect-square',
                        'transition-transform duration-500 [transform-style:preserve-3d]',
                        isFlipped ? '[transform:rotateY(180deg)]' : '',
                      ].join(' ')}
                    >
                      {/* Front */}
                      <div className="absolute inset-0 [backface-visibility:hidden]">
                        <div className="h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                          {current.picture ? (
                            <img
                              src={current.picture}
                              alt={current.word_singular}
                              className="h-full w-full object-cover"
                              draggable={false}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-white/40">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="mt-4 text-center text-lg font-semibold text-white">
                          {current.word_singular}
                        </div>
                      </div>

                      {/* Back */}
                      <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                        <div className="h-full w-full rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 flex flex-col justify-center">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-white">{current.word_singular}</div>

                            <div className="mt-4 space-y-2 text-sm text-white/80">
                              {current.translation_en && (
                                <div>
                                  <span className="text-white/45">EN:</span> {current.translation_en}
                                </div>
                              )}
                              {current.translation_ru && (
                                <div>
                                  <span className="text-white/45">RU:</span> {current.translation_ru}
                                </div>
                              )}
                              {current.translation_ukr && (
                                <div>
                                  <span className="text-white/45">UA:</span> {current.translation_ukr}
                                </div>
                              )}

                              {!current.translation_en && !current.translation_ru && !current.translation_ukr && (
                                <div className="text-white/40">No translations.</div>
                              )}
                            </div>

                            <p className="mt-5 text-xs text-white/40">Tap the card to flip</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                <div className="mt-7 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={markWrong}
                    className={[
                      'h-20 w-20 rounded-full',
                      'border border-red-400/30 bg-red-500/10',
                      'text-red-200',
                      'transition hover:bg-red-500/15 hover:-translate-y-[1px]',
                      'focus:outline-none focus:ring-2 focus:ring-red-400/20',
                    ].join(' ')}
                    aria-label="Wrong"
                    title="Wrong"
                  >
                    ✕
                  </button>

                  <button
                    type="button"
                    onClick={markRemembered}
                    className={[
                      'h-20 w-20 rounded-full',
                      'border border-emerald-400/30 bg-emerald-500/10',
                      'text-emerald-200',
                      'transition hover:bg-emerald-500/15 hover:-translate-y-[1px]',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-400/20',
                    ].join(' ')}
                    aria-label="Remembered"
                    title="Remembered"
                  >
                    ✓
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        <footer className="pb-6 text-center text-xs text-white/35">Lingui Academy</footer>
      </div>
    </main>
  )
}