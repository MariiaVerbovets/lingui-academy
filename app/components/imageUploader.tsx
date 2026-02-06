'use client'
import { useEffect, useMemo, useRef, useState, useId } from 'react'
import { removeFromImagesBucketByPublicUrl } from '@/lib/removePictureByPublicUrl'
type Props = {
 value: string
 resetKey?: string | number
 disabled?: boolean
 onChange: (url: string) => void
 upload: (file: File) => Promise<string>
 canUpload?: () => { ok: true } | { ok: false; message: string }
 maxBytes?: number
 onError?: (message: string) => void
}
export function ImageUploader({
 value,
 resetKey,
 onChange,
 upload,
 disabled,
 canUpload,
  onError,
  maxBytes
}: Props) {
 const inputRef = useRef<HTMLInputElement | null>(null)
 const inputId = useId()
 const [dragOver, setDragOver] = useState(false)
 const [busy, setBusy] = useState<null | 'upload' | 'delete'>(null)
 const uploading = busy === 'upload'
 const isBusy = busy !== null
 const [previewUrl, setPreviewUrl] = useState<string>('')
 const shownPreview = useMemo(() => value || previewUrl, [value, previewUrl])
 const formatMb = (bytes: number) => (bytes / 1024 / 1024).toFixed(2)

 useEffect(() => {
  setPreviewUrl((old) => {
    if (old.startsWith('blob:')) URL.revokeObjectURL(old)
    return ''
  })
  if (inputRef.current) inputRef.current.value = ''
 }, [resetKey])

 useEffect(() => {
   return () => {
     if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
   }
 }, [previewUrl])

 const validateBeforeUpload = () => {
   if (disabled) return { ok: false as const, message: 'Disabled' }
   if (canUpload) return canUpload()
   return { ok: true as const }
 }

 const doUpload = async (file: File) => {
    const max = maxBytes ?? 2 * 1024 * 1024
      if (file.size > max) {
        const msg = `File is too large (${formatMb(file.size)} MB). Max is ${formatMb(max)} MB.`
        onError?.(msg)
        alert(msg)
        return
  }

   const check = validateBeforeUpload()
   if (!check.ok) {
     alert(check.message)
     return
   }

   const nextPreview = URL.createObjectURL(file)
   setPreviewUrl((old) => {
     if (old.startsWith('blob:')) URL.revokeObjectURL(old)
     return nextPreview
   })

   setBusy('upload')

   try {
     const newUrl = await upload(file)
     if (value) {
       try {
         await removeFromImagesBucketByPublicUrl(value)
       } catch (e) {
         console.warn('Could not delete old image', e)
       }
     }
     onChange(newUrl)
   } catch (err: any) {
    const msg = err?.message || err?.error_description || 'Upload failed. Please try again.'
    onError?.(msg)
    alert(msg)
   } finally {
     setBusy(null)
     if (inputRef.current) inputRef.current.value = ''
   }
 }
 const onInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
   const file = e.target.files?.[0]
   if (!file) return
   await doUpload(file)
 }
 const onDrop = async (e: React.DragEvent) => {
   e.preventDefault()
   e.stopPropagation()
   setDragOver(false)
   if (uploading) return
   const file = e.dataTransfer.files?.[0]
   if (!file) return
   await doUpload(file)
 }
 const removeImage = async () => {
   const urlToDelete = value || previewUrl
   if (!urlToDelete) return
   if (!confirm('Delete the current image?')) return
   if (urlToDelete.startsWith('blob:')) {
     setPreviewUrl((old) => {
       if (old.startsWith('blob:')) URL.revokeObjectURL(old)
       return ''
     })
     if (inputRef.current) inputRef.current.value = ''
     return
   }
   setBusy('delete')
   try {
     await removeFromImagesBucketByPublicUrl(urlToDelete)
     onChange('')
     setPreviewUrl((old) => {
       if (old.startsWith('blob:')) URL.revokeObjectURL(old)
       return ''
     })
   } finally {
     setBusy(null)
     if (inputRef.current) inputRef.current.value = ''
   }
 }
 return (
   <div className="w-full max-w-[220px] h-65">
     <input
       id={inputId}
       ref={inputRef}
       type="file"
       accept="image/*"
       className="sr-only"
       onChange={onInputChange}
       disabled={disabled || isBusy}
     />
     <label
       htmlFor={disabled || isBusy ? undefined : inputId}
       onDragEnter={(e) => {
         e.preventDefault()
         e.stopPropagation()
         if (!isBusy) setDragOver(true)
       }}
       onDragOver={(e) => {
         e.preventDefault()
         e.stopPropagation()
         if (!isBusy) setDragOver(true)
       }}
       onDragLeave={(e) => {
         e.preventDefault()
         e.stopPropagation()
         setDragOver(false)
       }}
       onDrop={onDrop}
       className={[
         'relative block h-full w-full cursor-pointer overflow-hidden rounded-2xl border border-white/15 bg-white/10',
         'transition hover:bg-white/15',
         dragOver ? 'ring-2 ring-white/30 border-white/30' : '',
         isBusy ? 'opacity-90 cursor-not-allowed' : '',
       ].join(' ')}
     >
       {/* Loading overlay */}
       {isBusy && (
         <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/35">
           <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-white">
             <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
             {uploading ? 'Uploading…' : 'Deleting…'}
           </div>
         </div>
       )}
       {/* Content */}
       {shownPreview ? (
         <div className="flex h-full w-full flex-col">
           <div className="relative flex-1 min-h-0 p-3">
             <img
               src={shownPreview}
               alt="preview"
               className="h-full w-full rounded-xl object-cover border border-white/10"
               draggable={false}
             />
           </div>
           <div className="shrink-0 flex items-center justify-between gap-2 px-3 pb-3">
             <button
               type="button"
               onClick={(e) => {
                 e.preventDefault()
                 e.stopPropagation()
                 inputRef.current?.click()
               }}
               disabled={isBusy}
               className="h-9 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white/80 hover:bg-white/15 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
             >
               Replace
             </button>
             <button
               type="button"
               onClick={(e) => {
                 e.preventDefault()
                 e.stopPropagation()
                 void removeImage()
               }}
               disabled={isBusy}
               className="h-9 flex-1 rounded-xl border border-red-400/20 bg-red-500/10 px-3 text-sm text-red-200 hover:bg-red-500/15 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
             >
               Delete
             </button>
           </div>
         </div>
       ) : (
         <div className="flex h-full w-full flex-col items-center justify-center p-4">
           <div
             className="pointer-events-none h-[80%] w-[80%] opacity-80"
             style={{
               WebkitMask: 'url(/upload.svg) center / contain no-repeat',
               mask: 'url(/upload.svg) center / contain no-repeat',
               backgroundColor: 'rgba(255,255,255,0.2)',
             }}
           />
           <p className="pointer-events-none mt-2 text-xs text-white/45">Click or drag &amp; drop</p>
         </div>
       )}
     </label>
   </div>
 )
}