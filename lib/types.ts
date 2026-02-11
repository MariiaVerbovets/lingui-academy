export type TrainMode = 'cards' | 'single' | 'writing'
export type NativeLanguage = 'en' | 'uk' | 'ru'

export type WordRow = {
  id: number
  word_singular: string
  word_plural: string | null
  article_singular: string | null
  article_plural: string | null
  translation_ru: string | null
  translation_ukr: string | null
  translation_en: string | null
  picture: string | null
}

export type PoolRow = { id: number; word_singular: string; article_singular: string | null }

export type Option = {
  id: number
  label: string
  isCorrect: boolean
}

export type Article = 'der' | 'die' | 'das'

export type FormState = {
  user_id: string
  language: Language
  book_id: string
  allow_all: boolean
  lessonsCsv: string
}

export type Language = 'DE' | 'PT'

export type ProfileRow = { id: string; email: string | null }

export type BookRow = { id: number; name: string; language: Language }

export type BookAccessRow = {
  id: number
  user_id: string
  book_id: number
  allow_all: boolean
  allowed_lessons: number[] | null
  created_at: string
}