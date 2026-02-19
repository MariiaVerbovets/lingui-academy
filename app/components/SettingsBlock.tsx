'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getIsAdmin } from '@/lib/isAdmin'

export default function TopRightIcons() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isAdmin, setIsAdmin] = useState(false)

  const currentUrl = useMemo(() => {
    const qs = searchParams.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }, [pathname, searchParams])

  useEffect(() => {
    const run = async () => {
      try {
        const admin = await getIsAdmin()
        setIsAdmin(admin)
      } catch {
        setIsAdmin(false)
      }
    }
    run()
  }, [])

  return (
    <div className="absolute right-6 top-6 z-20 flex items-center gap-3">
      {/* ===== PROFILE ===== */}
      <button
        onClick={() =>
          router.push('/profile?from=' + encodeURIComponent(currentUrl))
        }
        className={[
          'group relative h-10 w-10 rounded-xl border border-white/15 bg-white/5',
          'transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20',
        ].join(' ')}
        aria-label="Profile"
        type="button"
      >
        <div
          className="h-full w-full transition-transform duration-200 ease-out group-hover:rotate-12"
          style={{
            WebkitMask: 'url(/profile.svg) center / 60% no-repeat',
            mask: 'url(/profile.svg) center / 60% no-repeat',
            backgroundColor: 'rgba(255,255,255,0.85)',
          }}
        />
        <span
          className={[
            'pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2',
            'whitespace-nowrap rounded-lg border border-white/10 bg-black/50 px-2 py-1',
            'text-xs text-white/85 shadow-lg backdrop-blur',
            'opacity-0 translate-y-1 transition duration-150',
            'group-hover:opacity-100 group-hover:translate-y-0',
          ].join(' ')}
        >
          Profile
        </span>
      </button>

      {/* ===== ADMIN ===== */}
      {isAdmin && (
        <button
          onClick={() =>
            router.push('/admin?from=' + encodeURIComponent(currentUrl))
          }
          className={[
            'group relative h-10 w-10 rounded-xl border border-white/15 bg-white/5',
            'transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20',
          ].join(' ')}
          aria-label="Admin"
          type="button"
        >
          <div
            className="h-full w-full transition-transform duration-200 ease-out group-hover:rotate-12"
            style={{
              WebkitMask: 'url(/admin.svg) center / 60% no-repeat',
              mask: 'url(/admin.svg) center / 60% no-repeat',
              backgroundColor: 'rgba(255,255,255,0.85)',
            }}
          />
          <span
            className={[
              'pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2',
              'whitespace-nowrap rounded-lg border border-white/10 bg-black/50 px-2 py-1',
              'text-xs text-white/85 shadow-lg backdrop-blur',
              'opacity-0 translate-y-1 transition duration-150',
              'group-hover:opacity-100 group-hover:translate-y-0',
            ].join(' ')}
          >
            Admin
          </span>
        </button>
      )}
    </div>
  )
}