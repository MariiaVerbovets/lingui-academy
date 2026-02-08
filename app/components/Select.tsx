'use client'

import React from 'react'

type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type Props = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'value' | 'onChange'
> & {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className,
  disabled,
  ...rest
}: Props) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={[
        'w-full h-10 rounded-2xl border border-white/15 bg-white/10',
        'text-white/80 outline-none',
        'focus:border-white/25 focus:ring-2 focus:ring-white/10',
        'px-4',
        'py-0',
        'leading-[2.5rem]',
        'text-md font-medium',
        'pr-12',
        'appearance-none',

        className ?? '',
      ].join(' ')}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M5 7.5l5 5 5-5' stroke='rgba(255,255,255,0.85)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
        backgroundSize: '18px 18px',
        ...(rest.style ?? {}),
      }}
      {...rest}
    >
      <option value="" disabled className="text-slate-800">
        {placeholder}
      </option>

      {options.map((opt) => (
        <option
          key={opt.value}
          value={opt.value}
          disabled={opt.disabled}
          className="text-slate-950"
        >
          {opt.label}
        </option>
      ))}
    </select>
  )
}