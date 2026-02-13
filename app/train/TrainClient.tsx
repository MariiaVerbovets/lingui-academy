'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type {
  TrainMode,
  NativeLanguage,
  WordRow,
  PoolRow,
  Option,
  Article,
} from '@/lib/types'
import { PRAISE_LINES } from '@/lib/constants'
import {
  shuffle,
  pickRandom,
  normalizeAnswer,
  formatExpectedWriting,
  getTranslationByNativeLang,
  getModeTitle,
  buildTrainSetupUrl,
  hasSingleTargetWord,
  getSingleTargetWord,
  getSingleTargetArticle
} from '@/lib/utils'
import {
  getSessionUserId,
  hasSession,
  fetchNativeLanguage,
  fetchWordsForMode,
  fetchSinglePool,
  checkLessonCleared,
  resetProgressForLesson,
  markWordLearnedCards,
  applyWordAnswer,
} from '@/lib/trainApi'

import { TrainBackground } from '@/app/components/train/TrainBackground'
import { TrainLoadingState } from '@/app/components/train/states/TrainLoadingState'
import { TrainEmptyState } from '@/app/components/train/states/TrainEmptyState'
import { TrainDoneState } from '@/app/components/train/states/TrainDoneState'
import { CardsMode } from '@/app/components/train/modes/CardsMode'
import { SingleMode } from '@/app/components/train/modes/SingleMode'
import { WritingMode } from '@/app/components/train/modes/WritingMode'

function parseTrainMode(value: string | null): TrainMode {
  if (value === 'cards' || value === 'single' || value === 'writing') return value
  return 'cards'
}

function parseRequestedLimit(raw: string | null): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 10
  return Math.max(1, Math.min(5000, Math.floor(n)))
}

function randomPraise() {
  return PRAISE_LINES[Math.floor(Math.random() * PRAISE_LINES.length)]
}

export default function TrainClient() {
  const router = useRouter()
  const sp = useSearchParams()
  const lang = sp.get('lang') ?? 'german'
  const requestedLimit = parseRequestedLimit(sp.get('count'))

  const goBack = () => {
    clearTimer()

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    router.push(`/train/setup?bookId=${encodeURIComponent(bookId)}&lang=${encodeURIComponent(lang)}`)
  }

  const bookId = sp.get('bookId') ?? ''
  const lesson = sp.get('lesson') ?? ''
  const mode = parseTrainMode(sp.get('mode'))

  const parsedBookId = Number(bookId)
  const parsedLesson = Number(lesson)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [words, setWords] = useState<WordRow[]>([])
  const [index, setIndex] = useState(0)

  const [nativeLang, setNativeLang] = useState<NativeLanguage | null>(null)
  const [nativeLangLoading, setNativeLangLoading] = useState(true)

  // cards-only UI
  const [isFlipped, setIsFlipped] = useState(false)

  // session stats
  const [correctThisSession, setCorrectThisSession] = useState(0)
  const [praise, setPraise] = useState<string>(() => randomPraise())

  // done screen + “lesson cleared?” check
  const [done, setDone] = useState(false)
  const [lessonCleared, setLessonCleared] = useState(false)
  const [checkingLessonCleared, setCheckingLessonCleared] = useState(false)

  // reset button state
  const [resetBusy, setResetBusy] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  // ===== SINGLE CHOICE state =====
  const [pool, setPool] = useState<PoolRow[]>([])
  const [answered, setAnswered] = useState(false)
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)

  // ===== WRITING state =====
  const [writingValue, setWritingValue] = useState('')
  const [writingChecked, setWritingChecked] = useState(false)
  const [writingWasCorrect, setWritingWasCorrect] = useState<boolean | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // shared timer
  const timerRef = useRef<number | null>(null)

  const current = words[index] ?? null
  const total = words.length

  const title = lesson ? `Lesson ${lesson}` : 'Lesson'
  const modeTitle = getModeTitle(mode)
  const needsArticle = mode === 'single' && !!current && !!getSingleTargetArticle(current)

  const translation = current ? getTranslationByNativeLang(current, nativeLang) : null
  const promptText = translation ?? 'No translation'

  const options = useMemo<Option[]>(() => {
    if (mode !== 'single') return []
    if (!current) return []
    if (!pool.length) return []
    if (!hasSingleTargetWord(current)) return []

    const distractorPool = pool.filter((x) => x.id !== current.id && hasSingleTargetWord(x))
    const distractors = pickRandom(distractorPool, 3)

    return shuffle([
      { id: current.id, label: getSingleTargetWord(current), isCorrect: true },
      ...distractors.map((d) => ({
        id: d.id,
        label: getSingleTargetWord(d),
        isCorrect: false,
      })),
    ])
  }, [mode, current, pool])

  const finishTraining = () => {
    router.push(buildTrainSetupUrl(bookId, lesson, lang))
  }

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const scheduleNext = (isCorrect: boolean) => {
    const delay = isCorrect ? 1000 : 2000
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      goNext()
    }, delay)
  }

  const resetSingleRoundState = () => {
    setAnswered(false)
    setSelectedOptionId(null)
    setSelectedArticle(null)
  }

  const resetWritingRoundState = () => {
    setWritingValue('')
    setWritingChecked(false)
    setWritingWasCorrect(null)
  }

  // cleanup timers
  useEffect(() => {
    return () => clearTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // load native language
  useEffect(() => {
    let cancelled = false

    const loadNativeLang = async () => {
      setNativeLangLoading(true)
      try {
        const userId = await getSessionUserId()
        if (!userId) {
          router.replace('/login')
          return
        }

        const nl = await fetchNativeLanguage(userId)
        if (!nl) {
          router.replace('/languages')
          return
        }

        if (!cancelled) setNativeLang(nl)
      } catch (e) {
        console.warn('Failed to load native language', e)
        router.replace('/languages')
      } finally {
        if (!cancelled) setNativeLangLoading(false)
      }
    }

    loadNativeLang()
    return () => {
      cancelled = true
    }
  }, [router])

  // reset UI when params change
  useEffect(() => {
    setPraise(randomPraise())
    setCorrectThisSession(0)
    setDone(false)
    setLessonCleared(false)
    setCheckingLessonCleared(false)
    setResetBusy(false)
    setResetError(null)
    setError(null)

    setWords([])
    setIndex(0)
    setPool([])

    setIsFlipped(false)
    resetSingleRoundState()
    resetWritingRoundState()

    clearTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, lesson, mode])

  // ===== LOAD WORDS depending on mode =====
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      setResetError(null)

      if (!(await hasSession())) {
        if (!cancelled) setLoading(false)
        router.push('/login')
        return
      }

      if (!bookId || !lesson) {
        if (!cancelled) {
          setError('Missing bookId or lesson.')
          setLoading(false)
        }
        return
      }

      if (!Number.isFinite(parsedBookId) || !Number.isFinite(parsedLesson)) {
        if (!cancelled) {
          setError('Invalid bookId or lesson.')
          setLoading(false)
        }
        return
      }

      try {
        const loadedWords = await fetchWordsForMode({
          bookId: parsedBookId,
          lesson: parsedLesson,
          mode,
          limit: requestedLimit,
        })

        const normalizedWords =
          mode === 'single'
            ? loadedWords.filter(hasSingleTargetWord)
            : loadedWords

        if (cancelled) return

        setWords(normalizedWords)
        setIndex(0)
        setCorrectThisSession(0)
        setIsFlipped(false)
        resetSingleRoundState()
        resetWritingRoundState()

        if (mode === 'single') {
          const loadedPool = await fetchSinglePool(parsedBookId, parsedLesson)
          if (!cancelled) setPool(loadedPool)
        } else {
          setPool([])
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, lesson, mode, parsedBookId, parsedLesson, router, requestedLimit])

  // ===== NEXT =====
  const goNext = () => {
    setIsFlipped(false)
    resetSingleRoundState()
    resetWritingRoundState()

    setIndex((i) => {
      const next = i + 1
      if (next >= total) {
        setDone(true)
        return i
      }
      return next
    })

    if (mode === 'writing') {
      window.setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  // ===== CHECK "lesson cleared?" when done =====
  const isDone = !error && total > 0 && done

  useEffect(() => {
    if (!isDone) return
    if (!Number.isFinite(parsedBookId) || !Number.isFinite(parsedLesson)) return

    let cancelled = false

    const check = async () => {
      setCheckingLessonCleared(true)
      try {
        const cleared = await checkLessonCleared(parsedBookId, parsedLesson, mode)
        if (!cancelled) setLessonCleared(cleared)
      } catch {
        if (!cancelled) setLessonCleared(false)
      } finally {
        if (!cancelled) setCheckingLessonCleared(false)
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [isDone, parsedBookId, parsedLesson, mode])

  // ===== RESET (mode-specific) =====
  const resetProgress = async () => {
    if (!Number.isFinite(parsedBookId) || !Number.isFinite(parsedLesson)) return

    setResetBusy(true)
    setResetError(null)
    setError(null)

    try {
      if (!(await hasSession())) {
        router.push('/login')
        return
      }

      await resetProgressForLesson(parsedBookId, parsedLesson, mode)
      router.push(buildTrainSetupUrl(bookId, lesson, lang))
    } catch (e: any) {
      setResetError(e?.message ?? 'Failed to reset progress')
    } finally {
      setResetBusy(false)
    }
  }

  // ===== CARDS handlers =====
  const markRemembered = async () => {
    if (!current) return
    try {
      await markWordLearnedCards(current.id)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save progress')
      return
    }

    setCorrectThisSession((v) => v + 1)
    goNext()
  }

  const markWrongCards = () => {
    goNext()
  }

  // ===== SINGLE: answer =====
  const answerSingle = async (opt: Option) => {
    if (!current) return
    if (needsArticle && !selectedArticle) return
    if (answered) return

    setAnswered(true)
    setSelectedOptionId(opt.id)

    const wordCorrect = opt.isCorrect

    const normalizeA = (v: string | null | undefined) => (v ?? '').trim().toLowerCase()
    let articleCorrect = true
    if (needsArticle) {
      const correctArticle = normalizeA(getSingleTargetArticle(current))
      const selected = normalizeA(selectedArticle)
      articleCorrect = !correctArticle || selected === correctArticle
    }

    const isCorrect = wordCorrect && articleCorrect
    if (isCorrect) setCorrectThisSession((v) => v + 1)

    try {
      await applyWordAnswer(current.id, 'single', isCorrect)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save progress')
    }

    scheduleNext(isCorrect)
  }

  // ===== WRITING: submit =====
  const submitWriting = async () => {
    if (!current) return
    if (writingChecked) return

    const expected = normalizeAnswer(formatExpectedWriting(current))
    const given = normalizeAnswer(writingValue)
    const isCorrect = expected.length > 0 && given === expected

    setWritingChecked(true)
    setWritingWasCorrect(isCorrect)
    if (isCorrect) setCorrectThisSession((v) => v + 1)

    try {
      await applyWordAnswer(current.id, 'writing', isCorrect)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save progress')
    }

    scheduleNext(isCorrect)
  }

  // ===== RENDER =====
  if (loading || nativeLangLoading) {
    return <TrainLoadingState />
  }

  if (!error && total === 0) {
    return (
      <TrainEmptyState
        modeTitle={modeTitle}
        lesson={lesson}
        parsedLesson={parsedLesson}
        resetError={resetError}
        resetBusy={resetBusy}
        onBackToSetup={finishTraining}
        onResetProgress={resetProgress}
      />
    )
  }

  if (isDone) {
    return (
      <TrainDoneState
        modeTitle={modeTitle}
        lessonCleared={lessonCleared}
        praise={praise}
        checkingLessonCleared={checkingLessonCleared}
        correctThisSession={correctThisSession}
        total={total}
        resetError={resetError}
        resetBusy={resetBusy}
        onFinish={finishTraining}
        onResetProgress={resetProgress}
      />
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
      <TrainBackground />

      <div className="relative min-h-screen flex flex-col">
        <button
          type="button"
          onClick={goBack}
          className={[
            'absolute left-3 top-5 sm:left-6 sm:top-6 z-30',
            'inline-flex items-center gap-2',
            'text-md text-white/70 hover:text-white',
            'transition',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded-lg px-1',
          ].join(' ')}
          aria-label="Go back"
        >
          <span className="text-base" aria-hidden="true">←</span>
          <span className="hidden sm:inline">Back</span>
        </button>
        <header className="pt-10 pb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">{modeTitle}</h1>
          <p className="mt-2 text-white/60">{title}</p>
        </header>

        <section className="flex-1 flex items-start justify-center pb-10">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
            {error && (
              <div className="mb-5 inline-flex rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-md text-red-200">
                {error}
              </div>
            )}

            {current && (
              <>
                <div className="mb-4 text-center text-md text-white/50">
                  {index + 1} / {total}
                </div>

                {mode === 'cards' && (
                  <CardsMode
                    current={current}
                    isFlipped={isFlipped}
                    translation={translation}
                    onFlip={() => setIsFlipped((v) => !v)}
                    onWrong={markWrongCards}
                    onRemembered={markRemembered}
                  />
                )}

                {mode === 'single' && (
                  <SingleMode
                    current={current}
                    promptText={promptText}
                    needsArticle={needsArticle}
                    selectedArticle={selectedArticle}
                    answered={answered}
                    selectedOptionId={selectedOptionId}
                    options={options}
                    onSelectArticle={(a) => setSelectedArticle((a ? (a.trim().toLowerCase() as Article) : null))}
                    onAnswer={answerSingle}
                  />
                )}

                {mode === 'writing' && (
                  <WritingMode
                    current={current}
                    promptText={promptText}
                    inputRef={inputRef}
                    writingValue={writingValue}
                    writingChecked={writingChecked}
                    writingWasCorrect={writingWasCorrect}
                    onChange={setWritingValue}
                    onSubmit={submitWriting}
                  />
                )}
              </>
            )}
          </div>
        </section>

        <footer className="pb-6 text-center text-xs text-white/35">Lingui Academy</footer>
      </div>
    </main>
  )
}