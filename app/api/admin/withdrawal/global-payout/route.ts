import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
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

export async function POST() {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: withdrawals, error } = await supabaseAdmin
      .from('financial_withdrawals')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const results = []
    for (const withdrawal of withdrawals || []) {
      const result = await approveWithdrawalWithPlisio({
        supabaseAdmin,
        withdrawal,
        adminNotes: 'Global payout by admin',
      })
      results.push({
        withdrawalId: withdrawal.id,
        userId: withdrawal.user_id,
        success: result.success,
        error: result.success ? null : result.error,
        payoutId: (result.success && result.payout && result.payout.success) ? result.payout.payoutId : null,
      })
    }

    const paid = results.filter((result) => result.success)
    const failed = results.filter((result) => !result.success)

    await supabaseAdmin.from('admin_logs').insert({
      action: 'withdrawal_global_plisio_payout',
      metadata: {
        pending_count: withdrawals?.length || 0,
        paid_count: paid.length,
        failed_count: failed.length,
        results,
      },
    })

    return NextResponse.json({
      success: failed.length === 0,
      message: `Global payout finished. Paid ${paid.length}, failed ${failed.length}.`,
      paidCount: paid.length,
      failedCount: failed.length,
      results,
    })
  } catch (error: any) {
    console.error('Admin global payout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
