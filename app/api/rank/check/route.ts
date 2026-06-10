import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('get_rank_progress', {
      p_user_id: user.id,
    })

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Get rank error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { data, error } = await supabase.rpc('get_rank_progress', {
      p_user_id: body.userId || user.id,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, ...data })
  } catch (error) {
    console.error('Rank check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
