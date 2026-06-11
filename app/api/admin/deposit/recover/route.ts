import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/require-admin'

// POST /api/admin/deposit/recover
// Manually processes a confirmed Plisio deposit that got stuck due to webhook failures.
// Body: { txnId: string }
export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  try {
    const { txnId } = await request.json()
    if (!txnId) {
      return NextResponse.json({ error: 'txnId is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: order, error: orderError } = await supabase
      .from('crypto_deposit_orders')
      .select('*')
      .eq('provider_payment_id', txnId)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Deposit order not found for that txnId' }, { status: 404 })
    }

    if (order.status === 'confirmed') {
      return NextResponse.json({ error: 'This deposit has already been processed' }, { status: 409 })
    }

    const amount = Number(order.expected_amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid deposit amount on order' }, { status: 400 })
    }

    // Mark the order as confirmed
    await supabase
      .from('crypto_deposit_orders')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        metadata: {
          ...(order.metadata || {}),
          manual_recovery: true,
          recovered_at: new Date().toISOString(),
        },
      })
      .eq('id', order.id)

    // Credit the member's wallet
    const { error: topUpError } = await supabase.rpc('apply_user_top_up', {
      p_user_id: order.user_id,
      p_amount: amount,
      p_source: 'plisio_recovered',
      p_external_id: txnId,
      p_metadata: { manual_recovery: true, order_id: order.id },
      p_referral_commission_percentage: 8,
    })

    if (topUpError) {
      return NextResponse.json({ error: topUpError.message }, { status: 500 })
    }

    // Fetch member info for confirmation
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', order.user_id)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      message: `Deposit of $${amount} credited to ${profile?.email || order.user_id}`,
      txnId,
      amount,
    })
  } catch (err) {
    console.error('[DepositRecover]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/admin/deposit/recover?txnId=... — preview order without processing
export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const txnId = new URL(request.url).searchParams.get('txnId')
  if (!txnId) {
    return NextResponse.json({ error: 'txnId query param required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data: order } = await supabase
    .from('crypto_deposit_orders')
    .select('*')
    .eq('provider_payment_id', txnId)
    .maybeSingle()

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', order.user_id)
    .maybeSingle()

  return NextResponse.json({ order, profile })
}
