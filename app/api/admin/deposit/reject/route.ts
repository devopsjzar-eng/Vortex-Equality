import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { transactionId, adminNotes } = await request.json()

    if (!transactionId) {
      return NextResponse.json({ error: 'Deposit ID required' }, { status: 400 })
    }

    const { data: cryptoOrder } = await supabaseAdmin
      .from('crypto_deposit_orders')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle()

    if (cryptoOrder) {
      if (cryptoOrder.status === 'confirmed') {
        return NextResponse.json({ error: 'Confirmed deposits cannot be rejected' }, { status: 400 })
      }

      const rejectedAt = new Date().toISOString()
      const metadata = {
        ...(cryptoOrder.metadata || {}),
        rejected_at: rejectedAt,
        admin_notes: adminNotes || 'Rejected by admin',
      }

      const { error: updateError } = await supabaseAdmin
        .from('crypto_deposit_orders')
        .update({
          status: 'failed',
          metadata,
        })
        .eq('id', transactionId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      await supabaseAdmin.from('admin_logs').insert({
        action: 'deposit_rejected',
        target_user_id: cryptoOrder.user_id,
        metadata: {
          crypto_deposit_order_id: cryptoOrder.id,
          provider_payment_id: cryptoOrder.provider_payment_id,
          amount: cryptoOrder.expected_amount,
          notes: adminNotes || null,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Deposit rejected',
        amount: Number(cryptoOrder.expected_amount || 0),
      })
    }

    const { data: legacyTransaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .maybeSingle()

    if (txError || !legacyTransaction) {
      return NextResponse.json({ error: 'Pending deposit not found' }, { status: 404 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('transactions')
      .update({
        status: 'failed',
        admin_notes: adminNotes || 'Rejected by admin',
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await supabaseAdmin.from('admin_logs').insert({
      action: 'legacy_deposit_rejected',
      target_user_id: legacyTransaction.user_id,
      metadata: {
        transaction_id: legacyTransaction.id,
        amount: legacyTransaction.amount,
        notes: adminNotes || null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Deposit rejected',
      amount: Number(legacyTransaction.amount || 0),
    })
  } catch (error: any) {
    console.error('Admin deposit reject error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
