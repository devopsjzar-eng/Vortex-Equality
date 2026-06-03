import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This endpoint creates an admin user for testing
export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    )
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Check if admin user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const adminUser = existingUsers?.users?.find(u => u.email === 'admin@vortex.com')

    let userId: string

    if (adminUser) {
      userId = adminUser.id
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: 'admin123456',
        email_confirm: true
      })
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'admin@vortex.com',
        password: 'admin123456',
        email_confirm: true,
        user_metadata: {
          full_name: 'Master Council',
          is_admin: true
        }
      })

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      userId = newUser.user.id
    }

    // Update profile to be admin
    await supabaseAdmin
      .from('profiles')
      .update({ is_admin: true, full_name: 'Master Council' })
      .eq('id', userId)

    return NextResponse.json({ 
      success: true, 
      message: 'Admin account ready!',
      email: 'admin@vortex.com',
      password: 'admin123456'
    })

  } catch (error: unknown) {
    console.error('Admin seed error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
