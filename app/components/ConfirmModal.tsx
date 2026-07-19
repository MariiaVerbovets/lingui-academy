'use client'

import { useEffect } from 'react'

type ConfirmModalProps = {
  open: boolean
  title: string
  description: React.ReactNode
  confirmText?: string
  cancelText?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onCancel()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <button
        type="button"
        disabled={loading}
        onClick={onCancel}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        aria-label="Close"
      />

      {/* Modal */}
      <div
        className="
          relative
          w-full
          max-w-md
          rounded-3xl
          border
          border-white/15
          from-slate-950 via-slate-950 to-slate-900
          backdrop-blur-2xl
          p-7
          shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]
        "
      >
        <h2 className="text-2xl font-semibold text-white">
          {title}
        </h2>

        <p className="mt-4 text-md leading-6 text-white/65">
          {description}
        </p>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="
              flex-1
              rounded-2xl
              border border-white/10
              bg-white/10
              px-4 py-3
              text-base font-semibold
              text-white/90
              transition
              hover:bg-white/15
              disabled:opacity-50
            "
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="
              flex-1
              rounded-2xl
              bg-white
              px-4 py-3
              text-base font-semibold
              text-slate-950
              shadow-lg shadow-white/10
              transition
              hover:-translate-y-[1px]
              hover:shadow-xl
              active:translate-y-0
              disabled:opacity-60
            "
          >
            {loading ? 'Resetting…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}