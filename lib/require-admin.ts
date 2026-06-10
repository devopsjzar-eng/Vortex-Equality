import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

type AdminGuardResult =
  | { adminUser: { id: string; email: string | undefined }; errorResponse: null }
  | { adminUser: null; errorResponse: NextResponse }

export async function requireAdmin(): Promise<AdminGuardResult> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      adminUser: null,
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return {
      adminUser: null,
      errorResponse: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }),
    }
  }

  return {
    adminUser: { id: user.id, email: user.email },
    errorResponse: null,
  }
}
