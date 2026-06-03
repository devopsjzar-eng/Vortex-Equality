import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DEMO_EMAIL = 'demo@vortex.com'
const DEMO_PASSWORD = 'Demo@123456'

export async function POST() {
  const supabase = await createClient()
  
  // Try to sign in with existing demo account
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  })
  
  if (signInData.user) {
    return NextResponse.json({ success: true, redirect: '/dashboard' })
  }
  
  // If demo account doesn't exist, create it
  if (signInError?.message?.includes('Invalid login credentials')) {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      options: {
        data: {
          full_name: 'Demo User',
          is_admin: false,
        },
      },
    })
    
    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }
    
    // Auto-confirm and sign in (for demo purposes)
    if (signUpData.user) {
      // Sign in again after signup
      const { error: finalSignInError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      })
      
      if (finalSignInError) {
        return NextResponse.json({ 
          success: true, 
          message: 'Demo account created! Please check email to confirm, or use login.',
          needsConfirmation: true 
        })
      }
      
      return NextResponse.json({ success: true, redirect: '/dashboard' })
    }
  }
  
  return NextResponse.json({ error: signInError?.message || 'Failed to login' }, { status: 400 })
}
