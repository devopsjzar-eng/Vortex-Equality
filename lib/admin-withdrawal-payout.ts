import { sendPlisioPayout, mapWithdrawalNetworkToPlisioCurrency } from '@/lib/plisio-payout'

export async function approveWithdrawalWithPlisio(params: {
  supabaseAdmin: any
  withdrawal: any
  adminNotes?: string
}) {
  const { supabaseAdmin, withdrawal, adminNotes } = params

  if (withdrawal.status !== 'pending') {
    return {
      success: false,
      status: 400,
      error: `Withdrawal is already ${withdrawal.status}`,
    }
  }

  const metadata = withdrawal.metadata || {}
  const payoutCurrency = mapWithdrawalNetworkToPlisioCurrency(
    metadata.cryptoNetwork || metadata.crypto_network || metadata.network || withdrawal.coin || 'USDT_BSC'
  )
  const payout = await sendPlisioPayout({
    address: withdrawal.wallet_address,
    amount: Number(withdrawal.net_amount),
    currency: payoutCurrency,
    withdrawalId: withdrawal.id,
  })

  if (!payout.success) {
    await supabaseAdmin
      .from('financial_withdrawals')
      .update({
        metadata: {
          ...metadata,
          admin_notes: adminNotes || metadata.admin_notes || null,
          plisio_payout_error: payout.error,
          plisio_payout_code: payout.code || null,
          payout_attempted_at: new Date().toISOString(),
        },
      })
      .eq('id', withdrawal.id)

    return {
      success: false,
      status: 502,
      error: payout.error,
      payout,
    }
  }

  const processedAt = new Date().toISOString()
  const nextMetadata = {
    ...metadata,
    admin_notes: adminNotes || 'Approved by admin and sent through Plisio',
    approved_at: processedAt,
    payout_provider: 'plisio',
    payout_currency: payout.currency,
    payout_amount: payout.amount,
    plisio_payout_id: payout.payoutId,
    plisio_payout_response: payout.raw,
  }

  const { data: updatedWithdrawal, error: updateError } = await supabaseAdmin
    .from('financial_withdrawals')
    .update({
      status: 'processing',
      provider: 'plisio',
      provider_payout_id: payout.payoutId,
      processed_at: processedAt,
      metadata: nextMetadata,
    })
    .eq('id', withdrawal.id)
    .select()
    .single()

  if (updateError) {
    return {
      success: false,
      status: 500,
      error: updateError.message,
      payout,
    }
  }

  await supabaseAdmin.from('ledger_entries').insert({
    user_id: withdrawal.user_id,
    entry_type: 'withdrawal_completed',
    amount: Number(withdrawal.net_amount) * -1,
    balance_after: null,
    description: 'Withdrawal payout sent through Plisio',
    metadata: {
      withdrawal_id: withdrawal.id,
      gross_amount: withdrawal.gross_amount,
      fee_amount: withdrawal.fee_amount,
      net_amount: withdrawal.net_amount,
      provider: 'plisio',
      provider_payout_id: payout.payoutId,
      currency: payout.currency,
    },
  })

  await supabaseAdmin.from('admin_logs').insert({
    action: 'withdrawal_plisio_payout_sent',
    target_user_id: withdrawal.user_id,
    metadata: {
      withdrawal_id: withdrawal.id,
      net_amount: withdrawal.net_amount,
      provider: 'plisio',
      provider_payout_id: payout.payoutId,
      currency: payout.currency,
      notes: adminNotes || null,
    },
  })

  return {
    success: true,
    status: 200,
    withdrawal: updatedWithdrawal,
    payout,
  }
}
