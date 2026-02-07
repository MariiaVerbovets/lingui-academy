'use client'

import { useSearchParams } from 'next/navigation'
import SetupClient from './SetupClient'

export default function SetupPageClient() {
  const sp = useSearchParams()
  const bookId = sp.get('bookId') ?? ''

  return <SetupClient bookId={bookId} />
}