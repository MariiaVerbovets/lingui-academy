import { Suspense } from 'react'
import AdminCreateClient from './AdminCreateClient'

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminCreateClient />
    </Suspense>
  )
}