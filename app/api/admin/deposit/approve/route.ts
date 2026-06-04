import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAndSaveNetworkTree } from '@/lib/network-tree-generator'

// Service role client - bypasses ALL RLS
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { transactionId } = await request.json()

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      )
    }

    // Get transaction details
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (txError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    if (transaction.type !== 'deposit') {
      return NextResponse.json(
        { error: 'Only deposit transactions can be approved' },
        { status: 400 }
      )
    }

    // Update transaction status to success
    const { error: updateError } = await supabaseAdmin
      .from('transactions')
      .update({ status: 'success', updated_at: new Date().toISOString() })
      .eq('id', transactionId)

    if (updateError) throw updateError

    // Get profile data for tracking
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', transaction.user_id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Check if this is FIRST DEPOSIT or TOP-UP
    const isFirstDeposit = profile.initial_capital === 0
    
    if (isFirstDeposit) {
      // FIRST DEPOSIT - set initial_capital
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          initial_capital: transaction.amount,
          total_deposit: transaction.amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.user_id)
      
      if (profileError) throw profileError
    } else {
      // TOP-UP - add to total_topup (TIDAK mengubah initial_capital)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          total_topup: (profile.total_topup || 0) + transaction.amount,
          total_deposit: (profile.total_deposit || 0) + transaction.amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.user_id)
      
      if (profileError) throw profileError
    }

    // Credit wallet - TOP-UP hanya nambahin saldo, TIDAK dihitung untuk ROI
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', transaction.user_id)
      .eq('wallet_type', 'asset')
      .single()

    if (!wallet) throw new Error('Wallet not found')

    const newBalance = (wallet.balance || 0) + transaction.amount
    const newCapital = (wallet.initial_capital || 0) + transaction.amount

    // RESET 400% PROGRESS
    const { error: creditError } = await supabaseAdmin
      .from('wallets')
      .update({
        balance: newBalance,
        initial_capital: newCapital,
        total_profit_earned: 0,
        cap_reached: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)

    if (creditError) throw creditError

    // NOTE: Sponsor bonus distribution is handled by /api/deposit/route.ts PUT endpoint
    // DO NOT distribute bonus here to avoid duplication

    return NextResponse.json({
      success: true,
      message: 'Deposit approved successfully',
      transaction: { ...transaction, status: 'success' },
    })
  } catch (error: any) {
    console.error('[Admin] Approve deposit error:', error.message)
    return NextResponse.json(
      { error: 'Failed to approve deposit' },
      { status: 500 }
    )
  } finally {
    // Auto-generate and save network tree after deposit approval
    try {
      await generateAndSaveNetworkTree()
    } catch (err) {
      console.error('[Network Tree] Error saving network record:', err)
    }
  }
}
