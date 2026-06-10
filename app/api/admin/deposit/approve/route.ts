import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAndSaveNetworkTree } from '@/lib/network-tree-generator'
import { requireAdmin } from '@/lib/require-admin'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key)
}

export async function POST(request: Request) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { transactionId } = await request.json()

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
        return NextResponse.json({
          success: true,
          message: 'Deposit already approved',
        })
      }

      const amount = Number(cryptoOrder.expected_amount || 0)
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Deposit amount is invalid' }, { status: 400 })
      }

      const approvedAt = new Date().toISOString()
      const metadata = {
        ...(cryptoOrder.metadata || {}),
        admin_approved: true,
        approved_at: approvedAt,
      }

      const { error: topUpError } = await supabaseAdmin.rpc('apply_user_top_up', {
        p_user_id: cryptoOrder.user_id,
        p_amount: amount,
        p_source: cryptoOrder.provider || 'admin-manual',
        p_external_id: cryptoOrder.provider_payment_id,
        p_metadata: metadata,
        p_referral_commission_percentage: 8,
      })

      if (topUpError) {
        return NextResponse.json({ error: topUpError.message }, { status: 500 })
      }

      await supabaseAdmin
        .from('crypto_deposit_orders')
        .update({
          status: 'confirmed',
          confirmed_amount: amount,
          confirmed_at: approvedAt,
          metadata,
        })
        .eq('id', cryptoOrder.id)

      await supabaseAdmin.from('admin_logs').insert({
        action: 'deposit_approved',
        target_user_id: cryptoOrder.user_id,
        metadata: {
          crypto_deposit_order_id: cryptoOrder.id,
          provider_payment_id: cryptoOrder.provider_payment_id,
          amount,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Deposit approved successfully',
      })
    }

    const { data: financialDeposit } = await supabaseAdmin
      .from('financial_deposits')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle()

    if (financialDeposit) {
      return NextResponse.json({
        success: true,
        message: 'Deposit is already confirmed',
      })
    }

    const { data: legacyTransaction, error: legacyError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('type', 'deposit')
      .maybeSingle()

    if (legacyError || !legacyTransaction) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
    }

    const amount = Number(legacyTransaction.amount || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Deposit amount is invalid' }, { status: 400 })
    }

    const { error: topUpError } = await supabaseAdmin.rpc('apply_user_top_up', {
      p_user_id: legacyTransaction.user_id,
      p_amount: amount,
      p_source: 'manual-admin',
      p_external_id: legacyTransaction.external_ref || legacyTransaction.id,
      p_metadata: {
        legacy_transaction_id: legacyTransaction.id,
        receipt: legacyTransaction.receipt_data || null,
      },
      p_referral_commission_percentage: 8,
    })

    if (topUpError) {
      return NextResponse.json({ error: topUpError.message }, { status: 500 })
    }

    await supabaseAdmin
      .from('transactions')
      .update({ status: 'success', updated_at: new Date().toISOString() })
      .eq('id', legacyTransaction.id)

    await supabaseAdmin.from('admin_logs').insert({
      action: 'legacy_deposit_approved',
      target_user_id: legacyTransaction.user_id,
      metadata: {
        transaction_id: legacyTransaction.id,
        amount,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Deposit approved successfully',
    })
  } catch (error: any) {
    console.error('[Admin] Approve deposit error:', error.message)
    return NextResponse.json({ error: error.message || 'Failed to approve deposit' }, { status: 500 })
  } finally {
    try {
      await generateAndSaveNetworkTree()
    } catch (error) {
      console.error('[Network Tree] Error saving network record:', error)
    }
  }
}
