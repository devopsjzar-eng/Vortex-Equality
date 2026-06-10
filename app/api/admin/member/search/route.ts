import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/require-admin'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const username = searchParams.get('username')

    if (!email && !username) {
      return NextResponse.json(
        { error: 'Provide email or username' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    let query = supabaseAdmin.from('profiles').select('*')

    if (email) {
      query = query.eq('email', email)
    } else if (username) {
      query = query.eq('username', username)
    }

    const { data, error } = await query.single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      member: {
        id: data.id,
        email: data.email,
        username: data.username,
        full_name: data.full_name,
        created_at: data.created_at
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
