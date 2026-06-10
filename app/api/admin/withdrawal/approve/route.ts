import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { approveWithdrawalWithPlisio } from '@/lib/admin-withdrawal-payout'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key)
}

async function getAdminUser() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const supabaseAdmin = getSupabaseAdmin()
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return profile?.is_admin ? user : null
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { transactionId, adminNotes } = await request.json()

    if (!transactionId) {
      return NextResponse.json({ error: 'Withdrawal ID required' }, { status: 400 })
    }

    const { data: withdrawal, error: withdrawalError } = await supabaseAdmin
      .from('financial_withdrawals')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (withdrawalError || !withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }

    if (withdrawal.status !== 'pending') {
      return NextResponse.json({ error: `Withdrawal is already ${withdrawal.status}` }, { status: 400 })
    }

    const result = await approveWithdrawalWithPlisio({
      supabaseAdmin,
      withdrawal,
      adminNotes,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error, payout: result.payout || null }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      message: 'Plisio payout sent. Withdrawal is now processing.',
      withdrawal: result.withdrawal,
      payout: result.payout,
    })
  } catch (error: any) {
    console.error('Admin withdrawal approve error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
