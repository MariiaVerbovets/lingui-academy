'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
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
    <main style={{ maxWidth: 420, margin: '60px auto', padding: 16 }}>
      <p>Authentication...</p>
    </main>
  )
}