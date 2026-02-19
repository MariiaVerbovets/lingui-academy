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

export const ARTICLES: Article[] = ['der', 'die', 'das']

export const NATIVE_ITEMS: Array<{
  key: NativeLanguage
  title: string
  flag: string
}> = [
  { key: 'en', title: 'English', flag: '/england.png' },
  { key: 'uk', title: 'Ukrainian', flag: '/ukraine.png' },
  { key: 'ru', title: 'Russian', flag: '/russia.jpg' },
]