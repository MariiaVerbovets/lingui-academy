'use client'

import { useMemo, type RefObject } from 'react'
import type { WordRow } from '@/lib/types'
import { formatExpectedWriting, formatExpectedPlural } from '@/lib/utils'
import { WordImage } from '@/app/components/train/WordImage'

type WritingModeProps = {
  mode: 'writing' | 'plural'
  current: WordRow
  promptText: string
  inputRef: RefObject<HTMLInputElement | null>
  writingValue: string
  writingChecked: boolean
  writingWasCorrect: boolean | null
  onChange: (value: string) => void
  onSubmit: () => void
}

export function WritingMode({
  mode,
  current,
  promptText,
  inputRef,
  writingValue,
  writingChecked,
  writingWasCorrect,
  onChange,
  onSubmit,
}: WritingModeProps) {
  const expectedWriting = useMemo(
    () => (mode === 'plural' ? formatExpectedPlural(current) : formatExpectedWriting(current)),
    [mode, current]
  )

  const specialChars = useMemo(() => {
    const expectedText = String(expectedWriting ?? '').trim().normalize('NFC')

    const seen = new Set<string>()
    const result: string[] = []

    for (const ch of expectedText) {
      if (!/\p{L}/u.test(ch)) continue
      if (/^[A-Za-z]$/.test(ch)) continue

      if (!seen.has(ch)) {
        seen.add(ch)
        result.push(ch)
      }
    }

    return result
  }, [expectedWriting])

  const insertSpecialChar = (char: string) => {
    if (writingChecked) return

    const input = inputRef.current
    if (!input) {
      onChange(`${writingValue}${char}`)
      return
    }

    const start = input.selectionStart ?? writingValue.length
    const end = input.selectionEnd ?? writingValue.length

    const nextValue =
      writingValue.slice(0, start) + char + writingValue.slice(end)

    onChange(nextValue)

    requestAnimationFrame(() => {
      input.focus()
      const caretPos = start + char.length
      input.setSelectionRange(caretPos, caretPos)
    })
  }

  return (
    <>
      <WordImage src={current.picture} alt="card" square />
      <div
        className="mt-4 text-center text-2xl font-semibold text-white select-none"
        style={{
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          e.preventDefault()
        }}
      >
        {promptText}
      </div>
      {specialChars.length > 0 && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {specialChars.map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => insertSpecialChar(ch)}
                disabled={writingChecked}
                className={[
                  'rounded-xl px-3 py-2 text-sm font-semibold border transition',
                  writingChecked
                    ? 'bg-white/5 text-white/35 border-white/10 opacity-70'
                    : 'bg-white/10 text-white border-white/10 hover:bg-white/15',
                ].join(' ')}
                aria-label={`Insert ${ch}`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-stretch gap-2">
        <input
          ref={inputRef}
          value={writingValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit()
          }}
          disabled={writingChecked}
          className={[
            'flex-1 rounded-2xl px-4 py-3 text-lg font-semibold outline-none border transition',
            'placeholder:text-white/40',
            writingChecked
              ? writingWasCorrect
                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                : 'border-red-400/30 bg-red-500/10 text-red-100'
              : 'border-white/10 focus:border-white/25 bg-white/10 text-white',
          ].join(' ')}
        />

        <button
          type="button"
          onClick={onSubmit}
          disabled={writingChecked || !writingValue.trim()}
          className={[
            'rounded-2xl px-4 py-3 text-sm font-semibold border transition',
            writingChecked || !writingValue.trim()
              ? 'bg-white/5 text-white/35 border-white/10 opacity-70'
              : 'bg-white text-slate-950 border-white/10 hover:-translate-y-[1px] hover:shadow-lg hover:shadow-white/10',
          ].join(' ')}
        >
          Check
        </button>
      </div>

      {writingChecked && writingWasCorrect === false && (
        <div className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-100 p-3 text-md">
          {expectedWriting}
        </div>
      )}
    </>
  )
}