import { Suspense } from 'react'
import SetupPageClient from './SetupPageClient'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SetupPageClient />
    </Suspense>
  )
}