import { supabase } from '@/lib/supabaseClient'
import type { NativeLanguage, PoolRow, TrainMode, WordRow } from '@/lib/types'

type AnswerMode = Extract<TrainMode, 'single' | 'writing'>

export async function getSessionUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

export async function hasSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return Boolean(data.session)
}

export async function fetchNativeLanguage(userId: string): Promise<NativeLanguage | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('native_language')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return (data?.native_language ?? null) as NativeLanguage | null
}

export async function fetchWordsForMode(params: {
  bookId: number
  lesson: number
  mode: TrainMode
  limit?: number
}): Promise<WordRow[]> {
  const { bookId, lesson, mode, limit = 10 } = params

  if (mode === 'cards') {
    const { data, error } = await supabase.rpc('get_cards_review_words', {
      p_book_id: bookId,
      p_lesson: lesson,
      p_limit: limit,
    })
    if (error) throw error
    return (data ?? []) as WordRow[]
  }

  const { data, error } = await supabase.rpc('get_train_words', {
    p_book_id: bookId,
    p_lesson: lesson,
    p_mode: mode,
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as WordRow[]
}

export async function fetchSinglePool(bookId: number, lesson: number): Promise<PoolRow[]> {
  const { data, error } = await supabase
    .from('words')
    .select('id, word_singular, article_singular, word_plural')
    .eq('book_id', bookId)
    .eq('lesson', lesson)

  if (error) throw error
  return (data ?? []) as PoolRow[]
}

export async function checkLessonCleared(bookId: number, lesson: number, mode: TrainMode): Promise<boolean> {
  const words = await fetchWordsForMode({ bookId, lesson, mode, limit: 1 })
  return words.length === 0
}

export async function resetProgressForLesson(bookId: number, lesson: number, mode: TrainMode): Promise<void> {
  const { error } = await supabase.rpc('reset_progress_for_lesson', {
    p_book_id: bookId,
    p_lesson: lesson,
    p_mode: mode,
  })
  if (error) throw error
}

export async function markWordLearnedCards(wordId: number): Promise<void> {
  const { error } = await supabase.rpc('mark_word_learned', {
    p_word_id: wordId,
    p_mode: 'cards',
  })
  if (error) throw error
}

export async function applyWordAnswer(wordId: number, mode: AnswerMode, correct: boolean): Promise<void> {
  const { error } = await supabase.rpc('apply_word_answer', {
    p_word_id: wordId,
    p_mode: mode,
    p_correct: correct,
  })
  if (error) throw error
}