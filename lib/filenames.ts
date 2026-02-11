const GERMAN_CHAR_MAP: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss',
}

export const slugify = (s: string) =>
  (s ?? '')
    .toLowerCase()
    .trim()
    .replace(/[äöüß]/g, (ch) => GERMAN_CHAR_MAP[ch] ?? ch)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_.]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^\-|\-$/g, '')

export const extFromFile = (file: File) => {
  const byName = file.name.split('.').pop()?.toLowerCase()
  if (byName && byName.length <= 5) return byName
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/jpeg') return 'jpg'
  return 'bin'
}

export const langFolder = (lang: 'DE' | 'PT') => lang.toLowerCase()

export const buildBookBase = (bookName: string) => slugify(bookName) || 'book'

export const buildWordBase = (p: {
  lesson: string | number
  topicName: string
  wordSingular: string
  wordPlural?: string
}) => {
  const singular = (p.wordSingular ?? '').trim()
  const plural = (p.wordPlural ?? '').trim()

  const rawWordName =
    singular === '-'
      ? plural
      : singular || plural

  const wordSlug = slugify(rawWordName) || 'word'

  return [
    `lesson-${p.lesson}`,
    slugify(p.topicName),
    wordSlug,
  ]
    .filter(Boolean)
    .join('-')
}