import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
    .from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? user : null
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabaseAdmin = getSupabaseAdmin()
    const { transactionId, adminNotes } = await request.json()

    if (!transactionId) {
      return NextResponse.json({ error: 'Withdrawal ID required' }, { status: 400 })
    }

    // 1. Fetch the withdrawal
    const { data: withdrawal, error: withdrawalError } = await supabaseAdmin
      .from('financial_withdrawals')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (withdrawalError || !withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }

    if (!['pending', 'processing'].includes(withdrawal.status)) {
      return NextResponse.json({ error: `Withdrawal is already ${withdrawal.status}` }, { status: 400 })
    }

    // 2. Fetch the wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('financial_wallets')
      .select('*')
      .eq('user_id', withdrawal.user_id)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json({ error: 'Financial wallet not found' }, { status: 404 })
    }

    const grossAmount = Number(withdrawal.gross_amount)
    const rejectedAt = new Date().toISOString()

    // 3. Restore wallet — request_withdrawal always deducts gross_amount from
    //    main_balance and adds to total_withdrawn, so we reverse exactly that.
    const { error: walletUpdateError } = await supabaseAdmin
      .from('financial_wallets')
      .update({
        main_balance: Number(wallet.main_balance) + grossAmount,
        total_withdrawn: Math.max(0, Number(wallet.total_withdrawn) - grossAmount),
        updated_at: rejectedAt,
      })
      .eq('user_id', withdrawal.user_id)

    if (walletUpdateError) {
      return NextResponse.json({ error: walletUpdateError.message }, { status: 500 })
    }

    // 4. Recalculate BEP / maxed-out flags
    await supabaseAdmin.rpc('recalculate_wallet_state', { p_user_id: withdrawal.user_id })

    // 5. Scrub ledger entries tied to this withdrawal
    await supabaseAdmin
      .from('ledger_entries')
      .delete()
      .in('entry_type', ['withdrawal_request', 'withdrawal_fee'])
      .eq('user_id', withdrawal.user_id)
      .filter('metadata->>withdrawal_id', 'eq', withdrawal.id)

    // 6. Hard-delete the withdrawal record — full scrub from user history
    const { error: deleteError } = await supabaseAdmin
      .from('financial_withdrawals')
      .delete()
      .eq('id', transactionId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // 7. Log admin action (internal audit only — not visible to user)
    await supabaseAdmin.from('admin_logs').insert({
      admin_user_id: adminUser.id,
      action: 'withdrawal_rejected_scrubbed',
      target_user_id: withdrawal.user_id,
      metadata: {
        withdrawal_id: withdrawal.id,
        refunded_amount: grossAmount,
        notes: adminNotes || null,
        rejected_at: rejectedAt,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Withdrawal rejected. $${grossAmount.toFixed(2)} returned to member wallet. Record fully scrubbed.`,
      refundedAmount: grossAmount,
    })
  } catch (error: any) {
    console.error('Admin withdrawal reject error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
