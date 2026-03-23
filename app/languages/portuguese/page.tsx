'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { FlagCircle } from '../page'
import SettingsBlock from '../../components/SettingsBlock'

type Language = 'DE' | 'PT'

type Book = {
  id: number
  name: string
  language: Language
  picture?: string | null
}

export default function PortuguesePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [books, setBooks] = useState<Book[]>([])
  const [error, setError] = useState<string | null>(null)

  const scrollerRef = useRef<HTMLDivElement | null>(null)

  const scrollByCards = (dir: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    const amount = Math.round(el.clientWidth * 0.4)
    el.scrollBy({ left: amount * dir, behavior: 'smooth' })
  }

  // wheel -> horizontal scroll (PC mouse)
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      // if trackpad already sends horizontal, don't interfere
      if (Math.abs(e.deltaX) > 0) return

      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    setLoading(true)

    const run = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/login')
        return
      }

      try {
        setError(null)

        const { data: b, error: e } = await supabase.rpc('get_allowed_books', {
          p_lang: 'PT'
        })

        if (e) throw e
        setBooks((b ?? []) as Book[])
      } catch (err: any) {
        console.warn('Portuguese page load failed', err)
        setError(err?.message ?? 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [router])

  const hasBooks = useMemo(() => books.length > 0, [books])

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
        <p className="pt-10 text-center text-white/60">Loading…</p>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
      <SettingsBlock />

      {/* Back button OUTSIDE card */}
      <button
        type="button"
        onClick={() => router.push('/languages')}
        className={[
          'absolute left-6 top-6 z-30',
          'inline-flex items-center gap-2',
          'text-md text-white/70 hover:text-white',
          'transition',
        ].join(' ')}
      >
        <span className="text-base">←</span>
        Back
      </button>

      {/* Soft background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute top-24 -left-28 h-[380px] w-[380px] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 -right-24 h-[460px] w-[460px] rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.10),transparent_55%)]" />
      </div>

      <div className="relative min-h-screen flex flex-col">
        <div className="flex flex-1 items-center justify-center py-10 sm:py-16">
          <div className="w-full max-w-5xl">
            <div className="rounded-3xl border border-white/10 bg-white/5 py-10 px-6 sm:py-14 sm:px-10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center gap-3">
                <FlagCircle isAppIcon src='/app-icon-portuguese.png' alt='Penguin with Portuguese book' />
                <div>
                  <p className="text-sm text-white/60">Lingui Academy</p>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                    Choose a book
                  </h1>
                </div>
              </div>

              {error && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-md text-red-200">
                  {error}
                </div>
              )}

              {!error && !hasBooks && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-md text-white/60">
                  No Portuguese books yet.
                </div>
              )}

              {/* Books row with arrows + wheel horizontal scroll */}
              <div className="mt-6 relative md:px-18">
                {books.length > 0 && (
                  <>
                    {/* left arrow (PC) */}
                    <button
                      type="button"
                      onClick={() => scrollByCards(-1)}
                      className={[
                        'hidden md:flex',
                        'absolute left-1 top-1/2 -translate-y-12 z-20',
                        'h-10 w-10 items-center justify-center rounded-full',
                        'border border-white/15 bg-black/30 text-white/80',
                        'backdrop-blur transition hover:bg-black/40 hover:text-white',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
                      ].join(' ')}
                      aria-label="Scroll left"
                      title="Scroll left"
                    >
                      ←
                    </button>

                    {/* right arrow (PC) */}
                    <button
                      type="button"
                      onClick={() => scrollByCards(1)}
                      className={[
                        'hidden md:flex',
                        'absolute right-1 top-1/2 -translate-y-12 z-20',
                        'h-10 w-10 items-center justify-center rounded-full',
                        'border border-white/15 bg-black/30 text-white/80',
                        'backdrop-blur transition hover:bg-black/40 hover:text-white',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
                      ].join(' ')}
                      aria-label="Scroll right"
                      title="Scroll right"
                    >
                      →
                    </button>
                  </>
                )}

                <div
                  ref={scrollerRef}
                  className="overflow-x-auto scroll-smooth scrollbar-hide"
                >
                  <div className="flex gap-10 p-5 rounded-2xl">
                    {books.map((b) => (
                      <div
                        key={b.id}
                        className={[
                          'group w-44 shrink-0 flex flex-col items-center',
                          'transform-gpu transition-transform duration-300 ease-out',
                          'sm:hover:scale-[1.06]',
                        ].join(' ')}
                      >
                        <button
                          type="button"
                          className={[
                            'relative isolate overflow-hidden rounded-sm',
                            'border border-white/20 bg-white/12',
                            'aspect-[2/3] w-full',
                            'shadow-[0_12px_34px_-18px_rgba(0,0,0,0.6)]',
                            'transition-all duration-300 ease-out',
                            'sm:group-hover:border-white/30 sm:group-hover:bg-white/18',
                            'sm:group-hover:shadow-[0_18px_45px_-25px_rgba(255,255,255,0.35)]',
                            'focus:outline-none focus:ring-2 focus:ring-white/15',
                          ].join(' ')}
                          onClick={() => {
                            router.push(`/train/setup?bookId=${String(b.id)}&lang=portuguese`)
                          }}
                        >
                          <div className="absolute inset-0">
                            <img
                              src={b.picture ?? ''}
                              alt={b.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              draggable={false}
                            />
                            <div className="absolute inset-0 bg-black/10 transition-opacity duration-300 sm:group-hover:opacity-5" />
                          </div>
                        </button>

                        <p
                          className={[
                            'min-h-[40px] mt-3 text-md font-semibold text-white/80 text-center leading-tight',
                            'transition-colors duration-300 group-hover:text-white',
                          ].join(' ')}
                        >
                          {b.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="pb-6">
          <p className="text-center text-xs text-white/35">Lingui Academy</p>
        </footer>
      </div>
    </main>
  )
}