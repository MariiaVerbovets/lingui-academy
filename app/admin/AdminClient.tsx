'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getIsAdmin } from '@/lib/isAdmin'
import AdminCreateContentTab from './AdminCreateContentTab'
import AdminBookAccessTab from './AdminBookAccessTab'

type TabKey = 'create' | 'access'

export default function AdminClient() {
  const router = useRouter()
  const sp = useSearchParams()
  const from = sp.get('from')

  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('create')
  const [isOwner, setIsOwner] = useState(false)

  const goBack = () => {
    if (from) return router.push(from)
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/languages')
  }

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/login')
        return
      }

      const admin = await getIsAdmin()
      if (!admin) {
        router.replace('/languages')
        return
      }

      // owner flag
      const { data: me, error } = await supabase
        .from('profiles')
        .select('is_owner')
        .eq('id', data.session.user.id)
        .maybeSingle()

      if (!error) setIsOwner(!!me?.is_owner)

      setLoading(false)
    }

    run()
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
        <p className="pt-10 text-center text-white/60">Loading…</p>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
      {/* Back */}
      <button
        type="button"
        onClick={goBack}
        className={['absolute left-6 z-30', 'inline-flex items-center gap-2', 'text-md text-white/70 hover:text-white', 'transition'].join(' ')}
        style={{ top: 'calc(env(safe-area-inset-top) + 0.6rem)' }}
      >
        <span className="text-base">←</span>
        Back
      </button>

      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute top-24 -left-28 h-[380px] w-[380px] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 -right-24 h-[460px] w-[460px] rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.10),transparent_55%)]" />
      </div>

      <div className="relative min-h-screen flex flex-col">
        <div className="flex flex-1 items-center justify-center pt-20 pb-10 sm:pt-16 sm:py-16">
          <div className="w-full max-w-3xl">
            <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl py-8 px-6 sm:py-10 sm:px-10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <span className="text-xl">🐧</span>
                </div>
                <div>
                  <p className="text-sm text-white/60">Lingui Academy</p>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Admin panel</h1>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTab('create')}
                  className={[
                    'rounded-2xl px-4 py-2 text-sm font-semibold transition',
                    tab === 'create' ? 'bg-white text-slate-950 shadow-lg shadow-white/10' : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15',
                  ].join(' ')}
                >
                  ✍️ Create content
                </button>

                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setTab('access')}
                    className={[
                      'rounded-2xl px-4 py-2 text-sm font-semibold transition',
                      tab === 'access' ? 'bg-white text-slate-950 shadow-lg shadow-white/10' : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15',
                    ].join(' ')}
                  >
                    🔐 Book access
                  </button>
                )}
              </div>

              {/* Tab content */}
              <div className="mt-8">
                {tab === 'create' ? <AdminCreateContentTab /> : null}
                {tab === 'access' ? (isOwner ? <AdminBookAccessTab /> : null) : null}
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