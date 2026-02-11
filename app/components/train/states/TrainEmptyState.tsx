'use client'

import { TrainBackground } from '@/app/components/train/TrainBackground'

type TrainEmptyStateProps = {
  modeTitle: string
  lesson: string
  parsedLesson: number
  resetError: string | null
  resetBusy: boolean
  onBackToSetup: () => void
  onResetProgress: () => void
}

export function TrainEmptyState({
  modeTitle,
  lesson,
  parsedLesson,
  resetError,
  resetBusy,
  onBackToSetup,
  onResetProgress,
}: TrainEmptyStateProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
      <TrainBackground />
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl text-center shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
          <p className="text-xs uppercase tracking-[0.25em] text-white/45">{modeTitle}</p>
          <h1 className="mt-4 text-2xl font-semibold text-white">No new words left 🎉</h1>
          <p className="mt-2 text-white/60">
            You’ve learned all words in Lesson {Number.isFinite(parsedLesson) ? parsedLesson : lesson}.
          </p>

          {resetError && (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-md text-red-200">
              {resetError}
            </div>
          )}

          <button
            type="button"
            onClick={onBackToSetup}
            className="mt-6 w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:-translate-y-[1px] hover:shadow-xl active:translate-y-0"
          >
            Back to setup
          </button>

          <button
            type="button"
            onClick={onResetProgress}
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