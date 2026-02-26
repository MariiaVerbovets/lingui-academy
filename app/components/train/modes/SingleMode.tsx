'use client'

import { ARTICLES } from '@/lib/constants'
import { getSingleTargetArticle } from '@/lib/utils'
import { SingleModeProps } from '@/lib/types'
import { WordImage } from '@/app/components/train/WordImage'

export function SingleMode({
  current,
  promptText,
  needsArticle,
  selectedArticle,
  answered,
  selectedOptionId,
  options,
  onSelectArticle,
  onAnswer,
}: SingleModeProps) {
  const normalizeA = (v: string | null | undefined) => (v ?? '').trim().toLowerCase()
  const correctArticle = normalizeA(getSingleTargetArticle(current)) || null

  return (
    <>
      <WordImage src={current.picture} alt="card" square />
      <div className="mt-4 text-center text-xl font-semibold text-white">{promptText}</div>

      {needsArticle && (
        <div className="mt-6 grid grid-cols-3 gap-2">
          {ARTICLES.map((a) => {
            const aNorm = normalizeA(a)
            const selNorm = normalizeA(selectedArticle)

            const isSel = selNorm === aNorm
            const isCorrect = answered && !!correctArticle && aNorm === correctArticle
            const isWrongSel = answered && isSel && !isCorrect

            const cls = [
              'rounded-2xl px-4 py-3 text-lg font-semibold transition border',
              isCorrect
                ? 'bg-emerald-500/15 text-emerald-100 border-emerald-400/30'
                : isWrongSel
                  ? 'bg-red-500/15 text-red-100 border-red-400/30'
                  : isSel
                    ? 'bg-white text-slate-950 border-white/10 shadow-lg shadow-white/10'
                    : 'bg-white/10 text-white/90 border-white/10 hover:bg-white/15',
              answered ? 'opacity-80' : '',
            ].join(' ')

            return (
              <button
                key={a}
                type="button"
                disabled={answered}
                onClick={() => onSelectArticle(a)}
                className={cls}
              >
                {a}
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((opt) => {
          const isSelected = selectedOptionId === opt.id
          const showCorrect = answered && opt.isCorrect
          const showWrong = answered && isSelected && !opt.isCorrect

          const base = 'w-full rounded-2xl px-4 py-3 text-lg font-semibold transition border'
          const normal = 'bg-white/10 text-white/90 border-white/10 hover:bg-white/15'
          const correct = 'bg-emerald-500/15 text-emerald-100 border-emerald-400/30'
          const wrong = 'bg-red-500/15 text-red-100 border-red-400/30'
          const disabled = 'opacity-80'

          const cls = [base, showCorrect ? correct : showWrong ? wrong : normal, answered ? disabled : ''].join(' ')

          return (
            <button
              key={opt.id}
              type="button"
              disabled={answered}
              onClick={() => onAnswer(opt)}
              className={cls}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </>
  )
}