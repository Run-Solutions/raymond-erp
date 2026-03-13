'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import Loader from '@/components/ui/loader'
import LandingPage from '@/components/landing/LandingPage'

export default function Home() {
  const router = useRouter()
  const { user, isLoading, restoreSession } = useAuthStore()
  // We start by checking auth status. 
  // If we determine user is NOT logged in, we set this to false to show the landing page.
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    router.push('/login')
  }, [router])

  // While checking auth state or if redirecting, show loader
  if (isLoading || (user && isChecking)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader size="lg" text="Cargando..." />
      </div>
    )
  }

  // If not logged in, show the landing page
  return <LandingPage />
}
