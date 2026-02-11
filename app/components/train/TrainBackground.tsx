'use client'

export function TrainBackground() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-28 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="absolute top-24 -left-28 h-[380px] w-[380px] rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-0 -right-24 h-[460px] w-[460px] rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.10),transparent_55%)]" />
    </div>
  )
}