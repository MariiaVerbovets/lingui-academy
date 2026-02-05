'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { removeFromImagesBucketByPublicUrl } from '@/lib/removePictureByPublicUrl'

type Props = {
  value: string
  disabled?: boolean
  onChange: (url: string) => void
  upload: (file: File) => Promise<string>
  canUpload?: () => { ok: true } | { ok: false; message: string }
}

export function ImageUploader({
  value,
  onChange,
  upload,
  disabled,
  canUpload,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState<null | 'upload' | 'delete'>(null)
  const uploading = busy === 'upload'
  const deleting = busy === 'delete'
  const isBusy = busy !== null
  const [previewUrl, setPreviewUrl] = useState<string>('')

  const shownPreview = useMemo(() => value || previewUrl, [value, previewUrl])

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const openPicker = () => inputRef.current?.click()

  const validateBeforeUpload = () => {
    if (disabled) return { ok: false as const, message: 'Disabled' }
    if (canUpload) return canUpload()
    return { ok: true as const }
  }

  const doUpload = async (file: File) => {
    const check = validateBeforeUpload()
    if (!check.ok) {
      alert(check.message)
      return
    }

    // optimistic preview
    const nextPreview = URL.createObjectURL(file)
    setPreviewUrl((old) => {
      if (old.startsWith('blob:')) URL.revokeObjectURL(old)
      return nextPreview
    })

    setBusy('upload')
    try {
      const newUrl = await upload(file)

      // delete old after successful upload
      if (value) {
        try {
          await removeFromImagesBucketByPublicUrl(value)
        } catch (e) {
          console.warn('Could not delete old image', e)
        }
      }

      onChange(newUrl)
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
    if (!value) return
    if (!confirm('Delete the current image?')) return

    setBusy('delete')
    try {
      await removeFromImagesBucketByPublicUrl(value)
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
    <div className="w-50 h-65">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onInputChange}
      />

      <div
        onClick={() => !isBusy && openPicker()}
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
          'relative h-full w-full cursor-pointer overflow-hidden rounded-2xl border border-white/15 bg-white/10',
          'transition hover:bg-white/15',
          dragOver ? 'ring-2 ring-white/30 border-white/30' : '',
          isBusy ? 'opacity-90' : '',
        ].join(' ')}
      >
        {/* Loading overlay */}
        {isBusy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/35">
            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-white">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
              {uploading ? 'Uploading…' : 'Deleting…'}
            </div>
          </div>
        )}

        {/* Content */}
        {shownPreview ? (
          <div className="flex h-full w-full flex-col">
            {/* preview area */}
            <div className="relative flex-1 p-3">
              <img
                src={shownPreview}
                alt="preview"
                className="h-full w-full rounded-xl object-cover border border-white/10"
                draggable={false}
              />
            </div>

            {/* buttons row */}
            {value && (
              <div className="flex items-center justify-between gap-2 px-3 pb-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    openPicker()
                  }}
                  disabled={isBusy}
                  className="h-9 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white/80 hover:bg-white/15 disabled:opacity-50"
                >
                  Replace
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void removeImage()
                  }}
                  disabled={isBusy}
                  className="h-9 flex-1 rounded-xl border border-red-400/20 bg-red-500/10 px-3 text-sm text-red-200 hover:bg-red-500/15 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-4">
            <div
              className="h-[80%] w-[80%] opacity-80"
              style={{
                WebkitMask: "url(/upload.svg) center / contain no-repeat",
                mask: "url(/upload.svg) center / contain no-repeat",
                backgroundColor: "rgba(255,255,255,0.2)",
              }}
            />
            <p className="mt-2 text-xs text-white/45">Click or drag & drop</p>
          </div>
        )}
      </div>
    </div>
  )
}