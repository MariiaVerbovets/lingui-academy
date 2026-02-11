'use client'

import type { RefObject } from 'react'
import type { WordRow } from '@/lib/types'
import { formatExpectedWriting } from '@/lib/utils'
import { WordImage } from '@/app/components/train/WordImage'

type WritingModeProps = {
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
  current,
  promptText,
  inputRef,
  writingValue,
  writingChecked,
  writingWasCorrect,
  onChange,
  onSubmit,
}: WritingModeProps) {
  return (
    <>
      <WordImage src={current.picture} alt="card" square />
      <div className="mt-4 text-center text-lg font-semibold text-white">{promptText}</div>

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
            'flex-1 rounded-2xl px-4 py-3 text-md font-semibold outline-none border transition',
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
          {formatExpectedWriting(current)}
        </div>
      )}
    </>
  )
}