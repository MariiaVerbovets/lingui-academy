import { supabase } from '@/lib/supabaseClient'

export type NativeLanguage = 'en' | 'uk' | 'ru'

export async function getNativeLanguage(): Promise<NativeLanguage | null> {
  const { data: sessionData, error: sErr } = await supabase.auth.getSession()
  if (sErr) throw sErr
  const userId = sessionData.session?.user?.id
  if (!userId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('native_language')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error

  const v = (data?.native_language ?? null) as any
  if (v === 'en' || v === 'uk' || v === 'ru') return v
  return null
}

export async function hasNativeLanguage(): Promise<boolean> {
  const nl = await getNativeLanguage()
  return nl !== null
}

export async function setNativeLanguage(lang: NativeLanguage): Promise<void> {
  const { data: sessionData, error: sErr } = await supabase.auth.getSession()
  if (sErr) throw sErr
  const user = sessionData.session?.user
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, native_language: lang },
      { onConflict: 'id' },
    )

  if (error) throw error
}