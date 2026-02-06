"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // If already signed in, go to language selection
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.push("/languages");
    })();
  }, [router]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setIsError(false);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000'
            : 'https://lingui-academy.vercel.app',
      },
    });

    if (error) {
      setIsError(true);
      setMessage(error.message);
    } else {
      setIsError(false);
      setMessage("Magic link sent. Open the email on this device.");
    }

    setLoading(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4">
      {/* Soft background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute top-24 -left-28 h-[380px] w-[380px] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 -right-24 h-[460px] w-[460px] rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.10),transparent_55%)]" />
      </div>

      <div className="relative min-h-screen flex flex-col">
        {/* Center card */}
        <div className="flex flex-1 items-center justify-center py-10 sm:py-16">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              {/* Brand */}
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <span className="text-xl">🐧</span>
                </div>
                <div>
                  <p className="text-sm text-white/60">Lingui Academy</p>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                    Login
                  </h1>
                </div>
              </div>

              <form onSubmit={sendMagicLink} className="mt-7 space-y-4">
                <label className="block text-sm font-medium text-white/80">
                  Email
                </label>

                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoFocus
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-base text-white placeholder:text-white/40 outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                />

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:-translate-y-[1px] hover:shadow-xl active:translate-y-0 disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send link"}
                </button>
              </form>

              {message && (
                <div
                  className={`mt-5 rounded-2xl border p-4 text-sm ${
                    isError
                      ? "border-red-400/20 bg-red-500/10 text-red-200"
                      : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="mt-6 space-y-2 text-sm text-white/55">
                <p><strong>Tip:</strong> open the link on the same device & check spam folder.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="pb-6">
          <p className="text-center text-xs text-white/35">
            Lingui Academy
          </p>
        </footer>
      </div>
    </main>
  );
}