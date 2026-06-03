import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { claimId, userId } = body

    if (!claimId || !userId) {
      return NextResponse.json({ success: false, error: 'Missing claimId or userId' }, { status: 400 })
    }

    // Check jam operasi: 10:00 - 24:00 (Asia/Jakarta timezone)
    // Profit hangus pada jam 24:00 (tengah malam)
    const now = new Date()
    const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    const hour = jakartaTime.getHours()
    
    // Klaim hanya boleh jam 10:00 sampai 23:59
    if (hour < 10) {
      return NextResponse.json({ 
        success: false, 
        error: 'Claim profit tersedia mulai jam 10:00 WIB. Saat ini belum waktunya.' 
      }, { status: 400 })
    }

    // Get profit claim
    const { data: profitClaim, error: claimError } = await supabaseAdmin
      .from('profit_claims')
      .select('*')
      .eq('id', claimId)
      .eq('user_id', userId)
      .single()

    if (claimError || !profitClaim) {
      return NextResponse.json({ success: false, error: 'Profit claim not found' }, { status: 404 })
    }

    if (profitClaim.status === 'claimed') {
      return NextResponse.json({ success: false, error: 'Already claimed' }, { status: 400 })
    }

    const profitAmount = Number(profitClaim.amount)

    // Get user asset wallet with initial_capital for ROI calculation
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, initial_capital, total_profit_earned')
      .eq('user_id', userId)
      .eq('wallet_type', 'asset')
      .single()

    if (walletError || !wallet) {
      return NextResponse.json({ success: false, error: 'Wallet not found' }, { status: 404 })
    }

    // Get user profile for total_deposit
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('total_deposit')
      .eq('id', userId)
      .single()

    const initialCapital = wallet.initial_capital || profile?.total_deposit || 0
    const currentProfitEarned = wallet.total_profit_earned || 0
    const maxROI = initialCapital * 4  // 400% = 4x modal awal
    
    // Check if already at 400% ROI
    if (currentProfitEarned >= maxROI) {
      return NextResponse.json({ 
        success: false, 
        error: 'ROI 400% sudah tercapai. Silakan reinvest untuk mendapatkan profit kembali.' 
      }, { status: 400 })
    }

    // Check if this claim would exceed 400% ROI
    let actualProfitAmount = profitAmount
    const projectedTotalProfit = currentProfitEarned + profitAmount
    
    if (projectedTotalProfit > maxROI) {
      // Cap profit to reach exactly 400%
      actualProfitAmount = maxROI - currentProfitEarned
    }

    const newBalance = Number(wallet.balance) + actualProfitAmount
    const newTotalProfitEarned = currentProfitEarned + actualProfitAmount

    // Update wallet balance and total_profit_earned
    const { error: updateWalletError } = await supabaseAdmin
      .from('wallets')
      .update({ 
        balance: newBalance,
        total_profit_earned: newTotalProfitEarned,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id)

    if (updateWalletError) {
      return NextResponse.json({ success: false, error: 'Failed to update wallet' }, { status: 500 })
    }

    // Update profit claim status
    const { error: updateClaimError } = await supabaseAdmin
      .from('profit_claims')
      .update({ 
        status: 'claimed',
        claimed_at: new Date().toISOString()
      })
      .eq('id', claimId)

    if (updateClaimError) {
      return NextResponse.json({ success: false, error: 'Failed to update claim' }, { status: 500 })
    }

    // Check if 400% ROI reached after this claim - RESET BOOSTER
    const roiReached = newTotalProfitEarned >= maxROI
    if (roiReached) {
      // Update wallet cap_reached status
      await supabaseAdmin
        .from('wallets')
        .update({
          cap_reached: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id)

      // Reset strategic booster to 0 - member must reinvest to get new booster
      await supabaseAdmin
        .from('profiles')
        .update({
          strategic_booster: 0,
          strategic_booster_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      console.log(`[ROI 400%] User ${userId} reached 400% ROI. Strategic booster reset to 0. Cap_reached set to true.`)
    }

    // Record transaction (optional - if it fails, still success)
    const receiptNumber = 'VX-DP-' + Date.now().toString(36).toUpperCase()
    await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        wallet_type: 'asset',
        type: 'profit_claim',
        amount: actualProfitAmount,
        net_amount: actualProfitAmount,
        status: 'completed',
        external_ref: claimId,
        receipt_data: {
          receipt_number: receiptNumber,
          profit_rate: profitClaim.total_percentage,
          timestamp: new Date().toISOString(),
          roi_reached: roiReached
        }
      })
      .then()
      .catch(err => console.error('Transaction record error (non-fatal):', err))

    const responseData: any = {
      success: true,
      message: roiReached 
        ? 'Profit berhasil diklaim! ROI 400% tercapai. Silakan reinvest untuk lanjut.' 
        : 'Profit berhasil diklaim!',
      amount: actualProfitAmount,
      newBalance: newBalance,
      receipt_number: receiptNumber,
      roi_reached: roiReached
    }

    if (roiReached) {
      responseData.roi_message = 'Selamat! Anda sudah mencapai 400% ROI. Strategic booster telah di-reset. Lakukan reinvest untuk memulai siklus baru.'
    }

    return NextResponse.json(responseData)

  } catch (error: any) {
    console.error('Claim error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 })
  }
}
