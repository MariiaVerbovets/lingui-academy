import { supabase } from '@/lib/supabaseClient'
import { extFromFile, langFolder } from './filenames'

type Language = 'DE' | 'PT'
type Entity = 'books' | 'words'

async function existsInFolder(bucket: string, folder: string, filename: string) {
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    search: filename,
    limit: 100,
  })
  if (error) throw error
  return (data ?? []).some((x) => x.name === filename)
}

export async function uploadWithIncrement(
  file: File,
  opts: {
    entity: Entity
    language: Language
    baseName: string
  }
) {
  const bucket = 'images'
  const ext = extFromFile(file)

  const folder = `${opts.entity}/${langFolder(opts.language)}`
  const makeName = (n?: number) => (n ? `${opts.baseName}-${n}.${ext}` : `${opts.baseName}.${ext}`)

  let n = 0
  let filename = makeName()

  for (let i = 0; i < 200; i++) {
    const taken = await existsInFolder(bucket, folder, filename)
    if (!taken) break
    n = n === 0 ? 2 : n + 1
    filename = makeName(n)
  }

  const path = `${folder}/${filename}`

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: '3600',
  })
  if (error) throw error

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return pub.publicUrl
}