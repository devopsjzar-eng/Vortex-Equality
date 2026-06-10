'use server'

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = formData.get('redirectTo') as string

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // If a specific redirect was requested (e.g. from middleware), honour it
  if (redirectTo && redirectTo !== '/dashboard') {
    redirect(redirectTo)
  }

  // Use service role client to bypass RLS for the admin role check
  const supabaseAdmin = getSupabaseAdmin()
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', data.user.id)
    .single()

  redirect(profile?.is_admin ? '/vx-ctrl-9f2a' : '/dashboard')
}
