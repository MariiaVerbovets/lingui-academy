'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getNativeLanguage, setNativeLanguage, type NativeLanguage } from '@/lib/nativeLanguage'
import { FlagCircle } from '../languages/page'
import { NATIVE_ITEMS } from '@/lib/constants'

type TabKey = 'general' | 'progress'

export default function ProfileClient() {
  const router = useRouter()
  const sp = useSearchParams()
  const from = sp.get('from')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('general')
  const [name, setName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nativeLang, setNativeLang] = useState<NativeLanguage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const goBack = () => {
    if (from && from.startsWith('/')) return router.push(from)
    if (typeof window !== 'undefined' && window.history.length > 1) return router.back()
    router.push('/languages')
  }

  useEffect(() => {
    if (!ok) return
    const t = setTimeout(() => setOk(null), 5000)
    return () => clearTimeout(t)
  }, [ok])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/login')
        return
      }

      const user = data.session.user

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .maybeSingle()

      const nl = await getNativeLanguage()

      if (!cancelled) {
        setName(profile?.first_name ?? '')
        setNativeLang(nl)
        setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [router])

  const saveName = async () => {
    setError(null)
    setOk(null)

    const { data } = await supabase.auth.getSession()
    if (!data.session) return

    const { error: updErr } = await supabase
      .from('profiles')
      .update({ first_name: name })
      .eq('id', data.session.user.id)

    if (updErr) {
      setError(updErr.message)
      return
    }

    setOk('Name saved ✅')
    setEditingName(false)
  }

  const changeNative = async (lang: NativeLanguage) => {
    setError(null)
    setOk(null)

    const prev = nativeLang
    setNativeLang(lang)

    try {
      await setNativeLanguage(lang)
      setOk('Native language saved ✅')
    } catch (e: any) {
      setNativeLang(prev ?? null)
      setError(e?.message ?? 'Failed to save native language')
    }
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
      {/* Back */}
      <button
        type="button"
        onClick={goBack}
        className="absolute left-6 z-30 inline-flex items-center gap-2 text-md text-white/70 hover:text-white transition"
        style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <span className="text-base">←</span>
        Back
      </button>

      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute top-24 -left-28 h-[380px] w-[380px] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 -right-24 h-[460px] w-[460px] rounded-full bg-emerald-400/15 blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col">
        <div className="flex flex-1 items-center justify-center pt-20 pb-10 sm:pt-16 sm:py-16">
          <div className="w-full max-w-3xl">
            <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl py-8 px-6 sm:py-10 sm:px-10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">

              {/* Header */}
              <div className="flex items-center gap-3">
                  <FlagCircle isAppIcon src="/app-icon.png" alt="Lingui Academy" />
                <div>
                  <p className="text-sm text-white/60">Lingui Academy</p>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                    Profile
                  </h1>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setTab('general')}
                  className={`rounded-2xl px-8 py-3 text-md font-semibold transition ${
                    tab === 'general'
                      ? 'bg-white text-slate-950 shadow-lg shadow-white/10'
                      : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15'
                  }`}
                >
                  ⚙️ General
                </button>

                <button
                  onClick={() => setTab('progress')}
                  className={`rounded-2xl px-8 py-3 text-md font-semibold transition ${
                    tab === 'progress'
                      ? 'bg-white text-slate-950 shadow-lg shadow-white/10'
                      : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15'
                  }`}
                >
                  📊 Progress
                </button>
              </div>

              {/* ===== GENERAL TAB ===== */}
              {tab === 'general' && (
                <div className="mt-8 space-y-8">

                  {/* Name block */}
                  <div>
                    {error && (
                      <div className="justify-self-start w-fit mb-5 inline-flex rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-md text-red-200">
                        {error}
                      </div>
                    )}

                    {ok && (
                      <div className="justify-self-start w-fit mb-5 inline-flex rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-md text-emerald-200">
                        {ok}
                      </div>
                    )}

                    <div className="text-lg text-white/80 mb-2">Your name</div>

                    {!editingName ? (
                      <div className="flex items-center gap-3">
                        <div className="text-lg text-white font-semibold">
                          {name || '—————'}
                        </div>
                        <button
                          onClick={() => setEditingName(true)}
                          className="text-white text-xl transition hover:cursor-pointer"
                        >
                          ✏️
                        </button>
                      </div>
                    ) : (
                      <form
                        className="flex gap-3"
                        onSubmit={(e) => {
                          e.preventDefault()
                          saveName()
                        }}
                      >
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="rounded-xl bg-white/10 border w-[130px] border-white/15 px-4 py-2 text-white text-lg outline-none"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-white text-slate-950 px-4 py-2 font-semibold"
                        >
                          Save
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Native language */}
                  <div>
                    <div className="text-lg text-white/80 mb-4">
                      Native language
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      {NATIVE_ITEMS.map((it) => (
                        <button
                          key={it.key}
                          onClick={() => changeNative(it.key)}
                          className={`group rounded-3xl border p-4 text-left transition ${
                            nativeLang === it.key
                              ? 'border-white bg-white/15'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <FlagCircle src={it.flag} alt={it.title} />
                            <div className="text-white font-medium">
                              {it.title}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* ===== PROGRESS TAB ===== */}
              {tab === 'progress' && (
                <div className="mt-8 text-white/70">
                  📊 Progress overview coming soon…
                </div>
              )}

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