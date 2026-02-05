import { supabase } from '@/lib/supabaseClient'

export function publicUrlToStoragePath(publicUrl: string, bucket = 'images'): string | null {
  try {
    const u = new URL(publicUrl)
    const marker = `/storage/v1/object/public/${bucket}/`
    const idx = u.pathname.indexOf(marker)
    if (idx === -1) return null
    return decodeURIComponent(u.pathname.slice(idx + marker.length))
  } catch {
    return null
  }
}

export async function removeFromImagesBucketByPublicUrl(publicUrl: string) {
  const path = publicUrlToStoragePath(publicUrl, 'images')
  if (!path) return

  const { error } = await supabase.storage.from('images').remove([path])
  if (error) throw error
}