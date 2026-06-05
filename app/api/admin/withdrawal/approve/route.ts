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

    // Update transaction status to success
    const { error } = await supabaseAdmin
      .from('transactions')
      .update({ 
        status: 'success', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', transactionId)
      .eq('type', 'withdrawal')

    if (error) {
      console.error('Error approving withdrawal:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Jika Asset Wallet, hitung fee berdasarkan ROI dari initial_capital
    if (transaction.wallet_type === 'asset') {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('initial_capital, total_topup')
        .eq('id', transaction.user_id)
        .single()

      if (profile) {
        // ROI dihitung hanya dari initial_capital (bukan top-up)
        // Total asset = initial_capital + profit_yang_ada
        const initialCapital = profile.initial_capital || 0
        const totalTopup = profile.total_topup || 0
        
        // Hitung profit yang sudah diterima (asset wallet - initial_capital - top-up)
        const { data: wallet } = await supabaseAdmin
          .from('wallets')
          .select('balance')
          .eq('user_id', transaction.user_id)
          .eq('wallet_type', 'asset')
          .single()
        
        const currentAsset = wallet?.balance || 0
        const totalProfit = Math.max(0, currentAsset - initialCapital - totalTopup)
        
        // ROI = profit / initial_capital * 100%
        const roi = initialCapital > 0 ? (totalProfit / initialCapital * 100) : 0
        
        // FEE CALCULATION:
        // - ROI < 100% (belum 2x lipat): FEE 20%
        // - ROI >= 100% (sudah 2x lipat): FEE 5%
        const feePercentage = roi < 100 ? 20 : 5
        
        console.log(`[Withdrawal] User ROI: ${roi.toFixed(2)}%, Fee: ${feePercentage}%`)
      }
      
      // Update total_deposit (mengurangi modal yang ditarik)
      const { data: profile2 } = await supabaseAdmin
        .from('profiles')
        .select('initial_capital')
        .eq('id', transaction.user_id)
        .single()

      if (profile2) {
        // Jika withdrawal dari initial_capital, kurangi initial_capital
        // (tapi jangan sampai negatif)
        const newInitialCapital = Math.max(0, (profile2.initial_capital || 0) - transaction.amount)
        await supabaseAdmin
          .from('profiles')
          .update({ 
            initial_capital: newInitialCapital,
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.user_id)
      }
    }

    return NextResponse.json({ success: true, message: 'Withdrawal approved' })

  } catch (error: any) {
    console.error('Admin withdrawal approve error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
