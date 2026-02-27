'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getNativeLanguage, setNativeLanguage, type NativeLanguage } from '@/lib/nativeLanguage'
import { FlagCircle } from '../languages/page'
import { NATIVE_ITEMS } from '@/lib/constants'

type TabKey = 'general' | 'progress'
type StudyLanguage = 'DE' | 'PT'

type ProgressDailyRow = {
  date: string
  points: number
  mastered: number
}

type ProgressOverview = {
  language: string
  days: number
  quick: {
    mastered_last_days: number
    mastered_month: number
    mastered_all: number
    points_last_days: number
    streak_days: number
  }
  daily: ProgressDailyRow[]
  rank: {
    position: number
    total: number
    top_percent: number | null
  }
  top5: Array<{
    rank: number
    user_id: string
    first_name: string
    points: number
  }>
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function formatDateShort(iso: string) {
  // iso: YYYY-MM-DD
  const [y, m, d] = iso.split('-').map((x) => Number(x))
  if (!y || !m || !d) return iso
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`
}

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

  // ===== Progress state
  const [studyLang, setStudyLang] = useState<StudyLanguage>('DE')
  const [progressLoading, setProgressLoading] = useState(false)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressOverview | null>(null)
  const [canSwitchLang, setCanSwitchLang] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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
      setCurrentUserId(user.id)

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

  const fetchProgress = async (lang: StudyLanguage) => {
    setProgressLoading(true)
    setProgressError(null)

    try {
      const { data: canSwitch, error: canSwitchErr } =
      await supabase.rpc('can_show_progress_language_switch')

      if (canSwitchErr) throw canSwitchErr
      setCanSwitchLang(!!canSwitch)

      const { data, error } = await supabase.rpc('get_progress_overview', {
        p_language: lang,
        p_days: 7,
        p_exclude_owner: null,
      })

      if (error) throw error

      // RPC returns jsonb => supabase-js gives plain object
      setProgress(data as ProgressOverview)
    } catch (e: any) {
      setProgress(null)
      setProgressError(e?.message ?? 'Failed to load progress')
    } finally {
      setProgressLoading(false)
    }
  }


  // load progress when tab opens (and when language changes)
  useEffect(() => {
    if (tab !== 'progress') return
    fetchProgress(studyLang)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, studyLang])

  const daily = progress?.daily ?? []
  const maxPoints = useMemo(() => {
    const m = Math.max(1, ...daily.map((d) => Number(d.points ?? 0)))
    return m
  }, [daily])

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
        <p className="pt-10 text-center text-white/60">Loading…</p>
      </main>
    )
  }

  const StatCard = ({
    title,
    value,
    sub,
    icon,
  }: {
    title: string
    value: string | number
    sub?: string
    icon: string
  }) => (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-md text-white/55">{title}</p>
          {sub ? <p className="mt-1 text-xs text-white/45">{sub}</p> : <div className="mt-1 h-4" />}
          <div className="mt-2 sm:text-2xl text-lg font-semibold text-white">{value}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-lg">
          {icon}
        </div>
      </div>
    </div>
  )


  const LeaderRow = ({
    rank,
    name,
    points,
    isMe,
  }: {
    rank: number
    name: string
    points: number
    isMe?: boolean
  }) => (
    <div
      className={[
        'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3',
        isMe ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-white/10 bg-white/5',
      ].join(' ')}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={[
            'w-9 h-9 flex items-center justify-center rounded-xl border text-sm font-semibold',
            'border-white/10 bg-white/10 text-white/80',
          ].join(' ')}
        >
          #{rank}
        </div>
        <div className="min-w-0">
          <div
            className={[
              "text-white/90 truncate",
              isMe ? 'font-bold' : '',
            ].join(' ')}
          >
          {name || 'No name'}</div>
        </div>
      </div>
      <div className="text-white font-semibold">{points}</div>
    </div>
  )


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
            <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl py-6 px-3 sm:py-10 sm:px-10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
              {/* Header */}
              <div className="flex items-center gap-3">
                <FlagCircle isAppIcon src={tab === 'general' ? '/app-icon-2.png' : '/app-icon-prize.png'} alt="Lingui Academy" />
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
                        <div className="text-lg text-white font-semibold">{name || '—————'}</div>
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
                    <div className="text-lg text-white/80 mb-4">Native language</div>


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
                            <div className="text-white font-medium">{it.title}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}


              {/* ===== PROGRESS TAB ===== */}
              {tab === 'progress' && (
                <div className="mt-8">
                  {/* Top controls */}
                  {canSwitchLang && (
                    <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
                      {(['DE', 'PT'] as StudyLanguage[]).map((l) => (
                        <button
                          key={l}
                          onClick={() => setStudyLang(l)}
                          className={[
                            'rounded-xl px-4 py-2 text-sm font-semibold transition',
                            studyLang === l ? 'bg-white text-slate-950' : 'text-white/75 hover:bg-white/10',
                          ].join(' ')}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  )}

                  {progressError && (
                    <div className="mt-5 inline-flex rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-md text-red-200">
                      {progressError}
                    </div>
                  )}


                  {/* Loading skeleton */}
                  {progressLoading && !progress && (
                    <div className="mt-6 grid gap-4">
                      <div className="h-28 rounded-3xl border border-white/10 bg-white/5 animate-pulse" />
                      <div className="h-36 rounded-3xl border border-white/10 bg-white/5 animate-pulse" />
                      <div className="h-44 rounded-3xl border border-white/10 bg-white/5 animate-pulse" />
                    </div>
                  )}


                  {progress && (
                    <>
                      {/* Quick stats */}
                      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <StatCard
                          title="Your rank"
                          value={`#${progress.rank.position}`}
                          icon="🏆"
                        />
                        <StatCard
                          title="Streak"
                          value={`${progress.quick.streak_days} ${progress.quick.streak_days === 1 ? 'day' : 'days'}`}
                          icon="🔥"
                        />
                        <StatCard
                          title="Points"
                          sub="(7 days)"
                          value={progress.quick.points_last_days}
                          icon="⚡"
                        />
                        <StatCard
                          title="Mastered"
                          sub="(7 days)"
                          value={progress.quick.mastered_last_days}
                          icon="✅"
                        />
                        <StatCard
                          title="Mastered"
                          sub="(month)"
                          value={progress.quick.mastered_month}
                          icon="📅"
                        />
                        <StatCard
                          title="Mastered"
                          sub="(all time)"
                          value={progress.quick.mastered_all}
                          icon="🏁"
                        />
                      </div>


                      {/* Mini chart */}
                      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-semibold text-lg">Points per day</div>
                            <div className="text-sm text-white/45">Last 7 days • {studyLang === "DE" ? "German" : "Portuguese"}</div>
                          </div>
                          <div className="rounded-4xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/70">
                            max {maxPoints}
                          </div>
                        </div>
                        <div className="mt-5">
                          <div className="flex items-end gap-2">
                            {daily.map((d) => {
                              const v = Number(d.points ?? 0)
                              const m = Number(d.mastered ?? 0)
                              const t = maxPoints > 0 ? v / maxPoints : 0
                              const alpha = v === 0 ? 0.06 : 0.12 + 0.38 * t
                              const h = clamp(Math.round((v / Math.max(1, maxPoints)) * 140), 8, 140)

                              return (
                                <div key={d.date} className="flex-1 min-w-0">
                                  <div
                                    className="w-full rounded-xl border transition-all duration-300 hover:scale-[1.04] flex items-end justify-center"
                                    style={{
                                      height: `${h}px`,
                                      backgroundColor: `rgba(16, 185, 129, ${alpha})`,
                                      borderColor:
                                        v === 0
                                          ? 'rgba(255,255,255,0.08)'
                                          : `rgba(16,185,129,${Math.min(alpha + 0.15, 0.65)})`,
                                      boxShadow:
                                        v > 0
                                          ? `0 10px 24px rgba(16,185,129,${alpha * 0.35})`
                                          : undefined,
                                    }}
                                    title={`${v} points, ${m} mastered`}
                                  >
                                    {v > 0 && h >= 18 && (
                                      <span className="pb-1 text-xs sm:text-sm font-semibold text-white/90 select-none">
                                        {v}
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-2 sm:text-sm text-[10px] text-white/45 text-center truncate">
                                    {formatDateShort(d.date)}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Leaderboard */}
                      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-semibold text-lg">Leaderboard</div>
                            <div className="text-sm text-white/45">Top 5 by points (last 7 days)</div>
                          </div>
                          {progress.rank.position < 5 && (
                            <div className="rounded-4xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white/70">
                              You: #{progress.rank.position}
                            </div>
                          )}
                        </div>


                        <div className="mt-4 grid gap-3">
                          {progress.top5.length === 0 ? (
                            <div className="text-white/60 text-sm">
                              No activity yet. Start training to appear here 🙂
                            </div>
                          ) : (
                            progress.top5.map((r) => (
                              <LeaderRow
                                key={r.user_id}
                                rank={r.rank}
                                name={r.first_name || 'Student'}
                                points={r.points}
                                isMe={r.user_id === currentUserId}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
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