import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const claimDate = body?.claimDate || null

    const { data: wallet, error } = await supabase.rpc('claim_unclaimed_profit', {
      p_claim_date: claimDate,
    })

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to claim profit' },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Profit claimed successfully.',
      wallet,
    })
  } catch (error) {
    console.error('Claim error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
