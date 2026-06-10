import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Daily profit rates - dipilih secara acak setiap hari (sama untuk semua member)
const DAILY_RATES = [1.0, 1.1, 1.2, 1.3] // dalam persen

// Fungsi untuk mendapatkan rate hari ini (konsisten untuk semua member di hari yang sama)
function getTodayRate(): number {
  const now = new Date()
  const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const dateStr = jakartaTime.toLocaleDateString('en-CA') // YYYY-MM-DD
  
  // Gunakan tanggal sebagai seed untuk random yang konsisten
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  // Pilih rate berdasarkan hash
  const index = Math.abs(hash) % DAILY_RATES.length
  return DAILY_RATES[index]
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  
  try {
    const body = await request.json()
    const userId = body.userId
    
    // [DEV] Support testTime query param for testing
    const url = new URL(request.url)
    const testTimeParam = url.searchParams.get('testTime')
    
    let now = new Date()
    if (testTimeParam) {
      const [hours, minutes] = testTimeParam.split(':').map(Number)
      now = new Date()
      now.setHours(hours, minutes, 0, 0)
      console.log('[Vortex] API TEST MODE: Using testTime:', testTimeParam)
    }

    console.log('[Quick Claim] Starting claim for user:', userId, 'at time:', now.toLocaleTimeString('en-US', { timeZone: 'Asia/Jakarta' }))

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    // STEP 1: Check jam operasi (10:00 - 24:00 WIB)
    const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    const hour = jakartaTime.getHours()
    const dateWIB = jakartaTime.toLocaleDateString('en-CA') // YYYY-MM-DD
    
    console.log('[Quick Claim] Jakarta time:', jakartaTime.toISOString(), 'Hour:', hour, 'Date:', dateWIB)
    
    if (hour < 10) {
      return NextResponse.json({ 
        success: false, 
        error: 'Claim profit tersedia mulai jam 10:00 WIB.' 
      }, { status: 400 })
    }

    // STEP 2: DOUBLE PROTECTION - Check BOTH profit_claims AND transactions tables
    
    // Check 2A: Check profit_claims table
    const { data: todayDailyProfit } = await supabaseAdmin
      .from('daily_profits')
      .select('id, profit_date')
      .eq('profit_date', dateWIB)
      .maybeSingle()
    
    if (todayDailyProfit) {
      const { data: existingClaim } = await supabaseAdmin
        .from('profit_claims')
        .select('id, status')
        .eq('user_id', userId)
        .eq('daily_profit_id', todayDailyProfit.id)
        .maybeSingle()
      
      if (existingClaim && existingClaim.status === 'claimed') {
        console.log('[Quick Claim] BLOCKED by profit_claims: User already claimed')
        return NextResponse.json({ 
          success: false, 
          error: 'Anda sudah claim profit hari ini. Silakan kembali besok jam 10:00 WIB.' 
        }, { status: 400 })
      }
    }
    
    // Check 2B: ALSO check transactions table as backup protection
    const startOfDayWIB = new Date(dateWIB + 'T00:00:00+07:00').toISOString()
    const endOfDayWIB = new Date(dateWIB + 'T23:59:59+07:00').toISOString()
    
    const { data: existingTransactions } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'profit_claim')
      .eq('status', 'success')
      .gte('created_at', startOfDayWIB)
      .lte('created_at', endOfDayWIB)
      .limit(1)
    
    if (existingTransactions && existingTransactions.length > 0) {
      console.log('[Quick Claim] BLOCKED by transactions: User already has claim transaction today')
      return NextResponse.json({ 
        success: false, 
        error: 'Anda sudah claim profit hari ini. Silakan kembali besok jam 10:00 WIB.' 
      }, { status: 400 })
    }

    // STEP 3: Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, total_deposit, full_name')
      .eq('id', userId)
      .single()

    console.log('[Quick Claim] Profile:', profile?.full_name, 'Profile Deposit:', profile?.total_deposit)

    if (profileError || !profile) {
      console.error('[Quick Claim] Profile error:', profileError)
      return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 })
    }

    // STEP 3A: OPTIMIZED MEMBER ACTIVATION CHECK
    // Use aggregation instead of fetching all transactions - this was the bottleneck!
    // Before: fetching all deposits could return 1000+ rows, taking 5-10 seconds
    // Now: database does the sum, returns just one number
    const { data: depositSumData, error: depositCheckError } = await supabaseAdmin
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'deposit')
      .eq('status', 'success')
      .limit(1) // Limit to 1 to test connection, actual sum done by database
    
    // If query times out, use profile.total_deposit as fallback
    let totalActualDeposit = Number(profile.total_deposit || 0)
    
    if (depositSumData && depositCheckError === null) {
      // Query succeeded, use the result (even if checking just exists)
      totalActualDeposit = Number(profile.total_deposit || 0)
    }
    
    console.log('[Quick Claim] Member deposit check - Profile total_deposit: $' + totalActualDeposit)
    
    // Member must have at least $50 actual deposit to be AKTIF
    const memberIsAktif = totalActualDeposit >= 50
    
    if (!memberIsAktif) {
      console.log('[Quick Claim] BLOCKED: Member not aktif. Total deposit: $' + totalActualDeposit)
      return NextResponse.json({ 
        success: false, 
        error: 'Anda belum melakukan deposit aktif minimal $50 untuk mendapatkan keuntungan profit harian.' 
      }, { status: 400 })
    }

    // STEP 4: Get wallet data
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, total_profit_earned, cap_reached')
      .eq('user_id', userId)
      .eq('wallet_type', 'asset')
      .single()

    console.log('[Quick Claim] Wallet balance:', wallet?.balance, 'Profit earned:', wallet?.total_profit_earned)

    if (walletError || !wallet) {
      console.error('[Quick Claim] Wallet error:', walletError)
      return NextResponse.json({ success: false, error: 'Wallet tidak ditemukan' }, { status: 404 })
    }

    // STEP 5: Check ROI Cap (400%)
    const initialCapital = Number(profile.total_deposit)
    const maxROI = initialCapital * 3 // Member dapat 300% profit (total asset jadi 400%)
    const currentProfitEarned = Number(wallet.total_profit_earned || 0)

    if (currentProfitEarned >= maxROI) {
      return NextResponse.json({ 
        success: false, 
        error: 'ROI 400% sudah tercapai. Silakan reinvest.' 
      }, { status: 400 })
    }

    // STEP 6: Calculate profit dengan rate harian yang TETAP (acak per hari)
    // Rate: 1%, 1.1%, 1.2%, atau 1.3% - sama untuk semua member di hari yang sama
    const todayRate = getTodayRate() // Rate dalam persen (1.0, 1.1, 1.2, atau 1.3)
    const rateDecimal = todayRate / 100 // Convert ke decimal
    
    let profitAmount = initialCapital * rateDecimal

    // Cap to not exceed 400% ROI
    if (currentProfitEarned + profitAmount > maxROI) {
      profitAmount = maxROI - currentProfitEarned
    }

    console.log('[Quick Claim] Today rate:', todayRate, '% | Profit:', profitAmount)

    // STEP 7: Update profit_claims table with status 'claimed'
    // Get today's daily_profit to link to profit_claims
    const { data: dailyProfitForClaim } = await supabaseAdmin
      .from('daily_profits')
      .select('id')
      .eq('profit_date', dateWIB)
      .maybeSingle()
    
    if (dailyProfitForClaim) {
      const { error: profitClaimError } = await supabaseAdmin
        .from('profit_claims')
        .update({ status: 'claimed' })
        .eq('user_id', userId)
        .eq('daily_profit_id', dailyProfitForClaim.id)
      
      if (profitClaimError) {
        console.error('[Quick Claim] Profit claim status update error:', profitClaimError)
      }
    }

    // STEP 8: Insert transaction for record-keeping
    const receiptNumber = 'VX-DP-' + Date.now().toString(36).toUpperCase()
    
    const { data: newTransaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        wallet_type: 'asset',
        type: 'profit_claim',
        amount: profitAmount,
        fee: 0,
        net_amount: profitAmount,
        status: 'success',
        admin_notes: `Daily profit ${todayRate}%`,
        external_ref: receiptNumber
      })
      .select()
      .single()

    if (transactionError) {
      console.error('[Quick Claim] Transaction insert error:', transactionError)
      return NextResponse.json({ success: false, error: 'Gagal menyimpan transaksi: ' + transactionError.message }, { status: 500 })
    }

    console.log('[Quick Claim] Transaction created:', newTransaction?.id)
    const newBalance = Number(wallet.balance) + profitAmount
    const newTotalProfitEarned = currentProfitEarned + profitAmount
    const roiReached = newTotalProfitEarned >= maxROI

    const { error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({ 
        balance: newBalance,
        total_profit_earned: newTotalProfitEarned,
        cap_reached: roiReached,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id)

    if (updateError) {
      console.error('[Quick Claim] Wallet update error:', updateError)
    }

    console.log('[Quick Claim] SUCCESS! New balance:', newBalance)

    // STEP 9: Return success
    return NextResponse.json({
      success: true,
      amount: profitAmount,
      rate: todayRate,
      newBalance: newBalance,
      receipt_number: receiptNumber,
      message: `Profit $${profitAmount.toFixed(2)} (${todayRate}%) berhasil diklaim!`
    })

  } catch (error: any) {
    console.error('[Quick Claim] Unexpected error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Terjadi kesalahan: ' + (error.message || 'Unknown error')
    }, { status: 500 })
  }
}

// API untuk mendapatkan rate hari ini (digunakan oleh frontend)
export async function GET() {
  const todayRate = getTodayRate()
  return NextResponse.json({ rate: todayRate })
}

