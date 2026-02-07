'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getIsAdmin } from '@/lib/isAdmin'

type Language = 'DE' | 'PT'

type Book = {
  id: number
  name: string
  language: Language
  picture?: string | null
}

export default function GermanPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [books, setBooks] = useState<Book[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

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

        const admin = await getIsAdmin()
        setIsAdmin(admin)

        const { data: b, error: e } = await supabase
          .from('books')
          .select('id,name,language,picture')
          .eq('language', 'DE')
          .order('name', { ascending: true })

        if (e) throw e
        setBooks((b ?? []) as Book[])
      } catch (err: any) {
        console.warn('German page load failed', err)
        setIsAdmin(false)
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
      {isAdmin && (
        <div className="absolute right-6 top-6 z-20">
          <button
            onClick={() => router.push('/admin?from=' + encodeURIComponent('/languages/german'))}
            className={[
              "group relative h-10 w-10 rounded-xl border border-white/15 bg-white/5",
              "transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20",
            ].join(" ")}
            aria-label="Admin"
            type="button"
          >
            {/* icon */}
            <div
              className="h-full w-full transition-transform duration-200 ease-out group-hover:rotate-12"
              style={{
                WebkitMask: "url(/admin.svg) center / 60% no-repeat",
                mask: "url(/admin.svg) center / 60% no-repeat",
                backgroundColor: "rgba(255,255,255,0.85)",
              }}
            />

            {/* tooltip */}
            <span
              className={[
                "pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2",
                "whitespace-nowrap rounded-lg border border-white/10 bg-black/50 px-2 py-1",
                "text-xs text-white/85 shadow-lg backdrop-blur",
                "opacity-0 translate-y-1 transition duration-150",
                "group-hover:opacity-100 group-hover:translate-y-0",
              ].join(" ")}
            >
              Admin
            </span>
          </button>
        </div>
      )}
      {/* Back button OUTSIDE card */}
      <button
        type="button"
        onClick={() => router.push('/languages')}
        className={[
          'absolute left-6 top-6 z-30',
          'inline-flex items-center gap-2',
          'text-sm text-white/70 hover:text-white',
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
                <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <span className="text-xl">🇩🇪</span>
                </div>
                <div>
                  <p className="text-sm text-white/60">Lingui Academy</p>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                    Choose a book
                  </h1>
                </div>
              </div>

              {error && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
                  {error}
                </div>
              )}

              {!error && !hasBooks && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                  No German books yet.
                </div>
              )}

              {/* Books grid - RECTANGULAR cards */}
              <div className="mt-6 overflow-x-auto scroll-smooth scrollbar-hide">
                <div className="flex gap-16 p-5 rounded-2xl">
                    {books.map((b) => (
                    <div
                        key={b.id}
                        className={[
                        "group w-44 shrink-0 flex flex-col items-center",
                        "transform-gpu transition-transform duration-300 ease-out",
                        "hover:scale-[1.06]",
                        ].join(" ")}
                    >
                        <button
                        type="button"
                        className={[
                            "relative isolate overflow-hidden rounded-sm",
                            "border border-white/10 bg-white/5",
                            "aspect-[2/3] w-full",
                            "shadow-[0_10px_30px_-15px_rgba(0,0,0,0.7)]",
                            "transition-all duration-300 ease-out",
                            "group-hover:border-white/25 group-hover:bg-white/10",
                            "group-hover:shadow-[0_18px_45px_-25px_rgba(255,255,255,0.35)]",
                            "focus:outline-none focus:ring-2 focus:ring-white/15",
                        ].join(" ")}
                        onClick={() => {
                          router.push(`/train/setup?bookId=${String(b.id)}&from=${encodeURIComponent('/languages/german')}`)
                        }}
                        >
                        <div className="absolute inset-0">
                            <img
                            src={b.picture ?? ""}
                            alt={b.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            draggable={false}
                            />
                            <div className="absolute inset-0 bg-black/20 transition-opacity duration-300 group-hover:opacity-10" />
                        </div>
                        </button>
                        <p
                        className={[
                            "min-h-[40px] mt-3 text-sm font-semibold text-white/70 text-center leading-tight",
                            "transition-colors duration-300 group-hover:text-white",
                        ].join(" ")}
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

        <footer className="pb-6">
          <p className="text-center text-xs text-white/35">Lingui Academy</p>
        </footer>
      </div>
    </main>
  )
}