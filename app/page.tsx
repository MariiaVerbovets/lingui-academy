'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        router.replace('/languages')
      } else {
        router.replace('/login')
      }
    }

    run()
  }, [router])

  return (
    <main style={{ padding: 16 }}>
      <p>Loading…</p>
    </main>
  )
}