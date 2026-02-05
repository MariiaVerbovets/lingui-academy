export const slugify = (s: string) =>
  (s ?? '')
    .toLowerCase()
    .trim()
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

export const buildWordBase = (p: { lesson: string | number; topicName: string; wordSingular: string }) => {
  return [
    `lesson-${p.lesson}`,
    slugify(p.topicName),
    slugify(p.wordSingular),
  ].filter(Boolean).join('-')
}