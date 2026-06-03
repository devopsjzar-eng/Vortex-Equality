import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key)
}

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'

// Bitget Withdrawal via Server Proxy
async function sendBitgetPayout(address: string, amount: number) {
  const proxyUrl = process.env.BITGET_PROXY_URL
  
  if (!proxyUrl) {
    return { success: false, error: 'Bitget proxy server not configured' }
  }

  try {
    console.log('[v0] Sending Bitget payout via proxy:', proxyUrl)
    
    const res = await fetch(`${proxyUrl}/api/payout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        amount: amount.toFixed(2),
        coin: 'USDT',
        chain: address.startsWith('0x') ? 'bsc' : 'trx'
      })
    })

    const data = await res.json()
    console.log('[v0] Bitget payout response:', data)

    if (data.success) {
      return { success: true, payoutId: data.orderId }
    }
    
    return { success: false, error: data.error || 'Bitget payout failed' }
  } catch (e: any) {
    console.error('[v0] Bitget payout error:', e.message)
    return { success: false, error: e.message }
  }
}

// =====================
// GET - List withdrawals
// =====================
export async function GET(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key')
    if (adminKey !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: withdrawals, error } = await supabaseAdmin
      .from('transactions')
      .select(`*, profiles:user_id (full_name, email)`)
      .eq('type', 'withdrawal')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 })
    return NextResponse.json({ success: true, withdrawals: withdrawals || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =====================
// POST - Process withdrawal
// =====================
export async function POST(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key')
    if (adminKey !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { transactionId, action, adminNotes, txHash } = body

    if (!transactionId || !['approve', 'reject', 'confirm'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('type', 'withdrawal')
      .single()

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // =====================
    // STEP 1: APPROVE → AUTO PAYOUT via Bitget
    // =====================
    if (action === 'approve') {
      if (transaction.status !== 'pending') {
        return NextResponse.json({ error: `Sudah ${transaction.status}` }, { status: 400 })
      }

      if (!transaction.crypto_address) {
        return NextResponse.json({
          success: false,
          error: 'No crypto address provided'
        }, { status: 400 })
      }

      // Send payout via Bitget
      const payoutResult = await sendBitgetPayout(
        transaction.crypto_address,
        transaction.net_amount
      )

      // Only mark as success if payout was sent
      if (!payoutResult.success) {
        return NextResponse.json({
          success: false,
          message: `Payout GAGAL: ${payoutResult.error}`,
          payoutError: payoutResult.error
        }, { status: 400 })
      }

      // Update transaction to success
      await supabaseAdmin
        .from('transactions')
        .update({
          status: 'success',
          admin_notes: adminNotes || 'Auto-payout via Bitget',
          external_ref: payoutResult.payoutId || transaction.external_ref,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)

      // Update total_withdrawal on profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('total_withdrawal')
        .eq('id', transaction.user_id)
        .single()

      if (profile) {
        await supabaseAdmin
          .from('profiles')
          .update({
            total_withdrawal: (profile.total_withdrawal || 0) + transaction.net_amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.user_id)
      }

      return NextResponse.json({
        success: true,
        message: `Payout terkirim via Bitget. Order ID: ${payoutResult.payoutId}`,
        payoutId: payoutResult.payoutId,
        status: 'success'
      })
    }



    // =====================
    // REJECT → refund balance
    // =====================
    if (action === 'reject') {
      if (!['pending', 'processing'].includes(transaction.status)) {
        return NextResponse.json({ error: `Sudah ${transaction.status}` }, { status: 400 })
      }

      await supabaseAdmin
        .from('transactions')
        .update({
          status: 'rejected',
          admin_notes: adminNotes || 'Ditolak admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)

      // Refund balance
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
            balance: Number(wallet.balance) + transaction.amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', wallet.id)
      }

      return NextResponse.json({
        success: true,
        message: 'Withdrawal ditolak dan saldo dikembalikan ke member.',
        status: 'rejected'
      })
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
