import type { Article } from '@/lib/types'
import { type NativeLanguage } from '@/lib/nativeLanguage'

export const PRAISE_LINES = [
  'Good job! 🎉',
  'Great work! ⭐️',
  'Awesome! Keep going 🚀',
  'Well done! 💪',
  'You’re doing amazing! 🌟',
  'Nice progress! ✅',
  'Fantastic effort! 🔥',
  'Proud of you! 🫶',
  'You nailed it! 🎯',
  'Excellent session! 🧠',
] as const

export type TrainingLanguage = 'german' | 'portuguese'

export const ARTICLES_BY_LANGUAGE: Record<TrainingLanguage, Article[]> = {
  german: ['der', 'die', 'das'],
  portuguese: ['o', 'a', 'os', 'as'],
}

export const getArticlesForLanguage = (lang?: string | null): Article[] => {
  if (lang === 'portuguese') return ARTICLES_BY_LANGUAGE.portuguese
  return ARTICLES_BY_LANGUAGE.german
}

export const NATIVE_ITEMS: Array<{
  key: NativeLanguage
  title: string
  flag: string
}> = [
  { key: 'en', title: 'English', flag: '/england.png' },
  { key: 'uk', title: 'Ukrainian', flag: '/ukraine.png' },
  { key: 'ru', title: 'Russian', flag: '/russia.jpg' },
]