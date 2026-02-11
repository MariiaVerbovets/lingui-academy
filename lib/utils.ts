import type {
  NativeLanguage,
  WordRow,
  TrainMode
} from '@/lib/types'

// ***** TRAINING PAGE *****
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

export function normalizeAnswer(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function formatExpectedWriting(w: WordRow) {
  const a = (w.article_singular ?? '').trim()
  const s = w.word_singular.trim()
  return a ? `${a} ${s}` : s
}

export function formatCardsWord(w: WordRow) {
  const s = `${w.article_singular ? w.article_singular + ' ' : ''}${w.word_singular}`.trim()

  const pluralWord = (w.word_plural ?? '').trim()
  const pluralArt = (w.article_plural ?? '').trim()

  const hasPlural =
    pluralWord.length > 0 &&
    !isDash(pluralWord) &&
    !isDash(pluralArt) &&
    pluralWord.toLowerCase() !== w.word_singular.trim().toLowerCase()

  if (!hasPlural) return s

  const p = `${pluralArt ? pluralArt + ' ' : ''}${pluralWord}`.trim()
  return `${s}, ${p}`
}

export function isDash(v: string | null | undefined) {
  return (v ?? '').trim() === '-'
}

export function getTranslationByNativeLang(w: WordRow, nl: NativeLanguage | null) {
  if (!w) return null
  if (nl === 'ru') return w.translation_ru?.trim() || null
  if (nl === 'uk') return w.translation_ukr?.trim() || null
  if (nl === 'en') return w.translation_en?.trim() || null
  return null
}

export function getModeTitle(mode: TrainMode): string {
  if (mode === 'cards') return 'Cards review'
  if (mode === 'single') return 'Single choice'
  return 'Writing'
}

export function buildTrainSetupUrl(bookId: string, lesson: string): string {
  const params = new URLSearchParams({
    bookId: String(bookId),
    lesson: String(lesson),
  })
  return `/train/setup?${params.toString()}`
}