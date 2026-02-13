import type {
  NativeLanguage,
  WordRow,
  TrainMode,
  WordLike
} from '@/lib/types'

const hasLetters = (v: string) => /\p{L}/u.test((v ?? '').trim())

export function isDash(v: string | null | undefined) {
  return (v ?? '').trim() === '-'
}

function isMissingWord(v: string | null | undefined) {
  const t = (v ?? '').trim()
  if (!t) return true
  if (t === '-' || t === '–' || t === '—' || t === '0') return true
  if (!hasLetters(t)) return true
  return false
}

function cleanArticle(v: string | null | undefined) {
  const t = (v ?? '').trim()
  if (!t) return ''
  if (t === '-' || t === '–' || t === '—' || t === '0') return ''
  return t
}

function joinArticleWord(article: string, word: string) {
  const a = cleanArticle(article)
  const w = (word ?? '').trim()
  return a ? `${a} ${w}`.trim() : w
}

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

/**
 * Target for single/writing:
 * - usually singular
 * - if singular is missing ("", "-", "0", no letters) => plural
 */
export function getSingleTargetWord(w: WordLike): string {
  const singular = (w.word_singular ?? '').trim()
  const plural = (w.word_plural ?? '').trim()
  return isMissingWord(singular) ? plural : singular
}

/**
 * Article for single/writing target:
 * - singular article for singular target
 * - plural article when singular is missing and plural is used
 */
export function getSingleTargetArticle(w: WordLike): string {
  const singular = (w.word_singular ?? '').trim()
  return isMissingWord(singular)
    ? cleanArticle(w.article_plural)
    : cleanArticle(w.article_singular)
}

export function hasSingleTargetWord(w: WordLike): boolean {
  return !isMissingWord(getSingleTargetWord(w))
}

export function formatExpectedWriting(w: WordRow) {
  const article = getSingleTargetArticle(w)
  const word = getSingleTargetWord(w)
  return article ? `${article} ${word}`.trim() : word
}

/**
 * Cards rules:
 * - if singular exists and plural exists => show both
 * - if singular missing => show only plural
 * - if plural missing => show only singular
 */
export function formatCardsWord(w: WordRow) {
  const singularWord = (w.word_singular ?? '').trim()
  const pluralWord = (w.word_plural ?? '').trim()

  const hasSingular = !isMissingWord(singularWord)
  const hasPlural = !isMissingWord(pluralWord)

  const singularPart = hasSingular
    ? joinArticleWord(w.article_singular ?? '', singularWord)
    : ''

  const pluralPart = hasPlural
    ? joinArticleWord(w.article_plural ?? '', pluralWord)
    : ''

  if (singularPart && pluralPart) return `${singularPart}, ${pluralPart}`
  if (singularPart) return singularPart
  if (pluralPart) return pluralPart
  return ''
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

export function buildTrainSetupUrl(bookId: string, lesson: string, lang: string): string {
  const params = new URLSearchParams({
    bookId: String(bookId),
    lesson: String(lesson),
    lang: String(lang)
  })
  return `/train/setup?${params.toString()}`
}