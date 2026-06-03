import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() { return createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
) }

export async function POST(request: Request) {
  try {
    const { email, newPassword } = await request.json()

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Find user by email
    const { data: users, error: findError } = await getSupabaseAdmin().auth.admin.listUsers()
    
    if (findError) {
      return NextResponse.json({ error: 'Failed to find user' }, { status: 500 })
    }

    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update password
    const { error: updateError } = await getSupabaseAdmin().auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
