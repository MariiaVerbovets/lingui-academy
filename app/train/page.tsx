import { Suspense } from 'react'
import TrainClient from './TrainClient'

export default function TrainPage() {
  return (
    <Suspense fallback={null}>
      <TrainClient />
    </Suspense>
  )
}