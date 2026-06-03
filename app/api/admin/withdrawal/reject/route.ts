import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { transactionId } = await request.json()

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
    }

    // Get transaction details first
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('type', 'withdrawal')
      .single()

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // IMPORTANT: Refund the FULL amount (amount = original withdrawal request, includes fee calculation base)
    // amount = jumlah yang diminta member (sebelum potong fee)
    // fee = potongan
    // net_amount = amount - fee (yang akan diterima member jika disetujui)
    // Saat TOLAK: kembalikan FULL amount ke wallet
    
    const refundAmount = transaction.amount // Kembalikan jumlah asli yang diminta
    
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id, balance')
      .eq('user_id', transaction.user_id)
      .eq('wallet_type', transaction.wallet_type)
      .single()

    if (wallet) {
      await supabaseAdmin
        .from('wallets')
        .update({ 
          balance: wallet.balance + refundAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id)
    }

    // Jika Asset Wallet, kembalikan juga initial_capital yang dikurangi saat approval
    if (transaction.wallet_type === 'asset') {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('initial_capital')
        .eq('id', transaction.user_id)
        .single()

      if (profile) {
        // Kembalikan initial_capital ke nilai sebelum withdrawal (jika ada yang dikurangi)
        await supabaseAdmin
          .from('profiles')
          .update({ 
            initial_capital: (profile.initial_capital || 0) + refundAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.user_id)
      }
    }

    // DELETE transaction record so it doesn't appear in member history
    // Tidak ada jejak sama sekali - kembali seperti semula
    const { error: deleteError } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('id', transactionId)

    if (deleteError) {
      console.error('Error deleting transaction:', deleteError)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Withdrawal rejected - fully refunded, no trace',
      refundedAmount: refundAmount
    })

  } catch (error: any) {
    console.error('Admin withdrawal reject error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
