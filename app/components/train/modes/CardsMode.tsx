'use client'

import type { WordRow } from '@/lib/types'
import { formatCardsWord } from '@/lib/utils'
import { WordImage } from '@/app/components/train/WordImage'

type CardsModeProps = {
  current: WordRow
  isFlipped: boolean
  translation: string | null
  onFlip: () => void
  onWrong: () => void
  onRemembered: () => void
}

export function CardsMode({
  current,
  isFlipped,
  translation,
  onFlip,
  onWrong,
  onRemembered,
}: CardsModeProps) {
  const wordText = formatCardsWord(current)

  return (
    <>
      <button
        type="button"
        onClick={onFlip}
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
              <WordImage src={current.picture} alt={wordText} square />
              <div className="mt-4 text-center text-lg font-semibold text-white">{wordText}</div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className="h-full w-full rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 flex flex-col justify-center">
                <div className="text-center">
                  <div className="text-xl font-semibold text-white">{wordText}</div>
                  <div className="mt-4 text-xl text-white font-medium">
                    {translation ? <span>{translation}</span> : <div className="text-white/40">No translation.</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>

      <div className="mt-12 flex items-center justify-between">
        <button
          type="button"
          onClick={onWrong}
          className={[
            'h-20 w-20 rounded-full',
            'border border-red-400/30 bg-red-500/10',
            'text-red-200',
            'transition hover:bg-red-500/15 hover:-translate-y-[1px]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/20',
          ].join(' ')}
          aria-label="Repeat again"
          title="Repeat again"
        >
          ✕
        </button>

        <button
          type="button"
          onClick={onRemembered}
          className={[
            'h-20 w-20 rounded-full',
            'border border-emerald-400/30 bg-emerald-500/10',
            'text-emerald-200',
            'transition hover:bg-emerald-500/15 hover:-translate-y-[1px]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/20',
          ].join(' ')}
          aria-label="Mark remembered"
          title="Mark remembered"
        >
          ✓
        </button>
      </div>
    </>
  )
}