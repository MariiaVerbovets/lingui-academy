'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'
import { getNativeLanguage, setNativeLanguage, type NativeLanguage } from '@/lib/nativeLanguage'
import SettingsBlock from '../components/SettingsBlock'
import { NATIVE_ITEMS } from '@/lib/constants'

type Step = 'checking' | 'pick_native' | 'main'

type LearnItem = {
  path: '/languages/german' | '/languages/portuguese'
  title: string
  subtitle: string
  flagSrc: string
  flagAlt: string
}

const LEARN_ITEMS: LearnItem[] = [
  {
    path: '/languages/german',
    title: 'German',
    subtitle: 'Deutsch (DE)',
    flagSrc: '/germany.png',
    flagAlt: 'Germany flag',
  },
  {
    path: '/languages/portuguese',
    title: 'Portuguese',
    subtitle: 'Português (PT)',
    flagSrc: '/portugal2.png',
    flagAlt: 'Portugal flag',
  },
]

export function FlagCircle({ src, alt, isAppIcon }: { src: string; alt: string; isAppIcon?: boolean }) {
  return (
    <div
      className={`relative shrink-0
        ${isAppIcon
          ? `
            h-20 w-20 p-[2px] rounded-full
            bg-gradient-to-br from-fuchsia-400/60 via-purple-500/40 to-indigo-500/40
            shadow-[0_0_40px_rgba(168,85,247,0.35)]
          `
          : 'h-12 w-12 rounded-full'
        }
      `}
    >
      <div className="relative h-full w-full rounded-full overflow-hidden bg-slate-900">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={isAppIcon ? "80px" : "48px"}
          className="object-cover"
        />
      </div>
    </div>
  )
}

export default function LanguagePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)

  const [step, setStep] = useState<Step>('checking')
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)

    const run = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/login')
        return
      }

      try {
        // native language check
        const nl = await getNativeLanguage()
        setStep(nl ? 'main' : 'pick_native')
      } catch (e: any) {
        console.warn('language page init failed', e)
        setStep('main')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [router])

  const go = (path: '/languages/german' | '/languages/portuguese') => {
    router.push(path)
  }

  const pickNative = async (lang: NativeLanguage) => {
    setSaveBusy(true)
    setSaveError(null)
    try {
      await setNativeLanguage(lang)
      setStep('main')
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to save native language')
    } finally {
      setSaveBusy(false)
    }
  }

  if (loading || step === 'checking') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
        <p className="pt-10 text-center text-white/60">Loading…</p>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
      {/* Settings block */}
      <SettingsBlock />

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
            <div className="rounded-3xl border border-white/10 bg-white/5 py-10 px-6 sm:py-14 sm:px-10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center gap-3">
                <FlagCircle isAppIcon src="/app-icon.png" alt="Lingui Academy" />
                <div>
                  <p className="text-sm text-white/60">Lingui Academy</p>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                    {step === 'pick_native' ? 'Choose your native language' : 'Choose a language'}
                  </h1>
                </div>
              </div>

              {/* ===== NATIVE LANGUAGE SCREEN ===== */}
              {step === 'pick_native' && (
                <>

                  {saveError && (
                    <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
                      {saveError}
                    </div>
                  )}

                  <div className="mt-7 grid gap-3 sm:grid-cols-3">
                    {NATIVE_ITEMS.map((it) => (
                      <button
                        key={it.key}
                        onClick={() => pickNative(it.key)}
                        disabled={saveBusy}
                        className={[
                          'group rounded-3xl border border-white/10 bg-white/5 p-5 text-left',
                          'shadow-[0_10px_30px_-15px_rgba(0,0,0,0.7)] transition',
                          'hover:-translate-y-[1px] hover:bg-white/10',
                          'disabled:opacity-60 disabled:hover:translate-y-0',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FlagCircle src={it.flag} alt={it.title} />
                              <p className="text-sm font-semibold text-white">{it.title}</p>
                          </div>
                          <span className="text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/60">
                            →
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* ===== NORMAL LANGUAGE SCREEN ===== */}
              {step === 'main' && (
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  {LEARN_ITEMS.map((it) => (
                    <button
                      key={it.path}
                      onClick={() => go(it.path)}
                      className="group rounded-3xl border border-white/10 bg-white/5 p-5 text-left shadow-[0_10px_30px_-15px_rgba(0,0,0,0.7)] transition hover:-translate-y-[1px] hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FlagCircle src={it.flagSrc} alt={it.flagAlt} />
                          <div>
                            <p className="text-base font-semibold text-white">{it.title}</p>
                            <p className="text-sm text-white/55">{it.subtitle}</p>
                          </div>
                        </div>
                        <span className="text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/60">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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