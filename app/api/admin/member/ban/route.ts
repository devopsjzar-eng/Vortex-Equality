import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  try {
    const supabase = await createClient()
    const body = await request.json()
    const userId = String(body.userId || '').trim()
    const isBanned = Boolean(body.isBanned)
    const reason = typeof body.reason === 'string' ? body.reason : null

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const { data: status, error } = await supabase.rpc('set_user_ban_status', {
      p_user_id: userId,
      p_is_banned: isBanned,
      p_reason: reason,
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      status,
    })
  } catch (error) {
    console.error('Ban status error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
