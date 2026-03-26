'use client'

import { useEffect, useMemo } from 'react'
import type { Article, WordRow } from '@/lib/types'
import { getArticlesTargetArticle, getArticlesTargetWord } from '@/lib/utils'
import { WordImage } from '@/app/components/train/WordImage'
import { getArticlesForLanguage } from '@/lib/constants'

type ArticlesModeProps = {
  current: WordRow
  answered: boolean
  selectedArticle: Article | null
  onAnswer: (a: Article) => void
  lang?: string | null
}

const normalizeA = (v: string | null | undefined) => (v ?? '').trim().toLowerCase()

function getArticlesGridClass(length: number) {
  if (length <= 2) return 'grid-cols-2'
  if (length === 3) return 'grid-cols-3'
  return 'grid-cols-2 sm:grid-cols-4'
}

export function ArticlesMode({
  current,
  answered,
  selectedArticle,
  onAnswer,
  lang,
}: ArticlesModeProps) {
  const targetWord = getArticlesTargetWord(current)
  const correctArticle = normalizeA(getArticlesTargetArticle(current))
  const selectedNorm = normalizeA(selectedArticle)

  const articles = useMemo(() => getArticlesForLanguage(lang), [lang])

  const keyMap = useMemo(() => {
    return articles.reduce<Record<string, Article>>((acc, article, index) => {
      const key = String(index + 1)
      acc[key] = article
      acc[`Numpad${key}`] = article
      return acc
    }, {})
  }, [articles])

  useEffect(() => {
    if (answered) return

    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const tag = t?.tagName?.toLowerCase()

      if (tag === 'input' || tag === 'textarea' || (t as any)?.isContentEditable) return

      const article = keyMap[e.key]
      if (!article) return

      e.preventDefault()
      onAnswer(article)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [answered, onAnswer, keyMap])

  return (
    <>
      <WordImage src={current.picture} alt="word" square />
      <div className="mt-4 text-center text-2xl font-semibold text-white">{targetWord}</div>

      <div className={`mt-6 grid gap-2 ${getArticlesGridClass(articles.length)}`}>
        {articles.map((a, idx) => {
          const aNorm = normalizeA(a)
          const isSel = selectedNorm === aNorm
          const isCorrect = answered && aNorm === correctArticle
          const isWrongSel = answered && isSel && aNorm !== correctArticle
          const keyHint = String(idx + 1)

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
              onClick={() => onAnswer(a)}
              className={cls}
              aria-label={`${a}. Keyboard: ${keyHint}`}
              title={`Keyboard: ${keyHint}`}
            >
              <span>{a}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}