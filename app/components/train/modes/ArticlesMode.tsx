'use client'

import { useEffect, useMemo } from 'react'
import { ARTICLES } from '@/lib/constants'
import type { Article, WordRow } from '@/lib/types'
import { getArticlesTargetArticle, getArticlesTargetWord } from '@/lib/utils'
import { WordImage } from '@/app/components/train/WordImage'

type ArticlesModeProps = {
  current: WordRow
  answered: boolean
  selectedArticle: Article | null
  onAnswer: (a: Article) => void
}

const normalizeA = (v: string | null | undefined) => (v ?? '').trim().toLowerCase()

export function ArticlesMode({ current, answered, selectedArticle, onAnswer }: ArticlesModeProps) {
  const targetWord = getArticlesTargetWord(current)
  const correctArticle = normalizeA(getArticlesTargetArticle(current))
  const selectedNorm = normalizeA(selectedArticle)

  const keyMap = useMemo(() => {
    const a0 = ARTICLES[0] as Article | undefined
    const a1 = ARTICLES[1] as Article | undefined
    const a2 = ARTICLES[2] as Article | undefined
    return {
      '1': a0,
      '2': a1,
      '3': a2,
      Numpad1: a0,
      Numpad2: a1,
      Numpad3: a2,
    } as const
  }, [])

  useEffect(() => {
    if (answered) return

    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const tag = t?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || (t as any)?.isContentEditable) return

      const a = (keyMap as any)[e.key] as Article | undefined
      if (!a) return

      e.preventDefault()
      onAnswer(a)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [answered, onAnswer, keyMap])

  return (
    <>
      <WordImage src={current.picture} alt="word" square />
      <div className="mt-4 text-center text-2xl font-semibold text-white">{targetWord}</div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {ARTICLES.map((a, idx) => {
          const aNorm = normalizeA(a)
          const isSel = selectedNorm === aNorm
          const isCorrect = answered && aNorm === correctArticle
          const isWrongSel = answered && isSel && aNorm !== correctArticle
          const keyHint = idx === 0 ? '1' : idx === 1 ? '2' : '3'
          const cls = [
            'group relative',
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
              onClick={() => onAnswer(a as Article)}
              className={cls}
              aria-label={`${a}. Keyboard: ${keyHint}`}
              title={`Keyboard: ${keyHint}`}
            >
              {a}
            </button>
          )
        })}
      </div>
    </>
  )
}