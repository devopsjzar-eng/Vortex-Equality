'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/vx-ctrl-9f2a') }, [router])
  return null
}
