'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getIsAdmin } from '@/lib/isAdmin'

export default function LanguagePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/login')
        return
      }
      try {
        const admin = await getIsAdmin()
        setIsAdmin(!!admin)
      } catch (e) {
        console.warn('getIsAdmin failed', e)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [router])

  const go = (path: '/german' | '/portuguese') => {
    router.push(path)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
        <p className="pt-10 text-center text-white/60">Loading…</p>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
      {/* Admin page icon */}
      {isAdmin && (
        <div className="absolute right-6 top-6 z-20">
          <button
            onClick={() => router.push('/admin')}
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

      {/* Soft background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute top-24 -left-28 h-[380px] w-[380px] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 -right-24 h-[460px] w-[460px] rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.10),transparent_55%)]" />
      </div>

      <div className="relative min-h-screen flex flex-col">
        <div className="flex flex-1 items-center justify-center py-10 sm:py-16">
          <div className="w-full max-w-2xl">
            <div className="min-h-[40vh] rounded-3xl border border-white/10 bg-white/5 py-10 px-6 sm:py-14 sm:px-10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <span className="text-xl">🐧</span>
                </div>
                <div>
                  <p className="text-sm text-white/60">Lingui Academy</p>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                    Choose a language
                  </h1>
                </div>
              </div>

              {/* Cards */}
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <button
                  onClick={() => go('/german')}
                  className="group rounded-3xl border border-white/10 bg-white/5 p-5 text-left shadow-[0_10px_30px_-15px_rgba(0,0,0,0.7)] transition hover:-translate-y-[1px] hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🇩🇪</span>
                      <div>
                        <p className="text-base font-semibold text-white">German</p>
                        <p className="text-sm text-white/55">Deutsch (DE)</p>
                      </div>
                    </div>
                    <span className="text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/60">
                      →
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => go('/portuguese')}
                  className="group rounded-3xl border border-white/10 bg-white/5 p-5 text-left shadow-[0_10px_30px_-15px_rgba(0,0,0,0.7)] transition hover:-translate-y-[1px] hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🇵🇹</span>
                      <div>
                        <p className="text-base font-semibold text-white">Portuguese</p>
                        <p className="text-sm text-white/55">Português (PT)</p>
                      </div>
                    </div>
                    <span className="text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/60">
                      →
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer className="pb-6">
          <p className="text-center text-xs text-white/35">
            Lingui Academy
          </p>
        </footer>
      </div>
    </main>
  )
}