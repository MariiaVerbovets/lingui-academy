import { supabase } from './supabaseClient'

export async function getIsAdmin(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!user) return false

  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (error) return false
  return Boolean(data?.is_admin)
}