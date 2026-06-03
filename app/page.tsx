import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPageClient from './landing/page'

export default async function HomePage() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // If user is logged in, redirect to dashboard
    if (user) {
      redirect('/dashboard')
    }
  } catch (error) {
    // Supabase not available - show landing page
    console.log('[HomePage] Supabase unavailable during render, showing landing page')
  }

  // If not logged in, show landing page (so meta tags can be read by bots)
  return <LandingPageClient />
}
