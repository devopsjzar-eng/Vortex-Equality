import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    console.log('[Profit API] Request for userId:', userId)
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const today = new Date().toISOString().split('T')[0]
    
    console.log('[Profit API] Today date:', today)
    
    // Check jam operasi claim: 10:00 - 24:00 (Asia/Jakarta timezone)
    const now = new Date()
    const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    const hour = jakartaTime.getHours()
    const isClaimTime = hour >= 10 // 10:00 pagi sampai 24:00 WIB
    
    console.log('[Profit API] Jakarta hour:', hour, 'isClaimTime:', isClaimTime)

    // Check if user already has a profit claim for today
    const { data: existingClaim, error: claimQueryError } = await supabase
      .from('profit_claims')
      .select('id, amount, total_percentage, base_percentage, booster_percentage, status, created_at')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    console.log('[Profit API] Existing claim query result:', existingClaim, 'Error:', claimQueryError)
    
    if (existingClaim) {
      return NextResponse.json({ 
        profit: {
          id: existingClaim.id,
          amount: existingClaim.amount,
          total_percentage: existingClaim.total_percentage,
          base_percentage: existingClaim.base_percentage,
          booster_percentage: existingClaim.booster_percentage,
          status: existingClaim.status,
          created_at: existingClaim.created_at
        },
        isClaimTime
      })
    }

    // No profit claim exists for today - check if we should auto-generate
    if (!isClaimTime) {
      return NextResponse.json({ 
        profit: null, 
        message: 'Profit available at 10:00 AM WIB',
        isClaimTime: false
      })
    }

    // It's claim time (10:00+) but no profit yet - AUTO GENERATE for this user
    
    // Get user's profile and wallet
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_deposit, booster_percentage, strategic_booster, is_admin')
      .eq('id', userId)
      .single()

    if (!profile || profile.is_admin || profile.total_deposit <= 0) {
      return NextResponse.json({ 
        profit: null, 
        message: profile?.total_deposit <= 0 ? 'No deposit to earn profit' : 'Not eligible',
        isClaimTime
      })
    }

    // Get asset wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance, initial_capital, total_profit_earned')
      .eq('user_id', userId)
      .eq('wallet_type', 'asset')
      .single()

    if (!wallet || wallet.balance <= 0) {
      return NextResponse.json({ 
        profit: null, 
        message: 'No asset balance',
        isClaimTime
      })
    }

    // Check ROI cap (400%)
    const initialCapital = wallet.initial_capital || wallet.balance
    const totalEarned = wallet.total_profit_earned || 0
    const maxEarning = initialCapital * 4 // 400% ROI cap
    const remainingCap = maxEarning - initialCapital - totalEarned

    if (remainingCap <= 0) {
      return NextResponse.json({ 
        profit: null, 
        message: 'ROI cap reached (400%). Please reinvest.',
        isClaimTime
      })
    }

    // Get or create today's daily_profit record
    let dailyProfitId: string
    let globalProfitPercentage: number
    
    const { data: existingDailyProfit } = await supabase
      .from('daily_profits')
      .select('id, global_profit_percentage')
      .eq('profit_date', today)
      .single()

    if (existingDailyProfit) {
      dailyProfitId = existingDailyProfit.id
      globalProfitPercentage = existingDailyProfit.global_profit_percentage
    } else {
      // Create new daily_profit record with random rate
      const randomRate = Math.random() * 0.01 + 0.01 // 1% to 2%
      globalProfitPercentage = parseFloat(randomRate.toFixed(4))
      
      const { data: newDailyProfit, error: dpError } = await supabase
        .from('daily_profits')
        .insert({
          profit_date: today,
          global_profit_percentage: globalProfitPercentage,
          member_share: 50,
          company_share: 50,
          distribution_time: new Date().toISOString(),
        })
        .select()
        .single()

      if (dpError || !newDailyProfit) {
        console.error('[Profit Today] Failed to create daily_profit:', dpError)
        return NextResponse.json({ 
          profit: null, 
          message: 'Failed to generate profit',
          isClaimTime
        })
      }
      dailyProfitId = newDailyProfit.id
    }

    // Calculate profit
    const boosterPercentage = profile.booster_percentage || 0
    const basePercentage = globalProfitPercentage * 100 * 0.5 // Member gets 50%
    const totalPercentage = basePercentage + boosterPercentage
    
    let profitAmount = wallet.balance * (totalPercentage / 100)
    
    // Cap profit to remaining ROI
    if (profitAmount > remainingCap) {
      profitAmount = remainingCap
    }

    // Create profit claim
    const { data: newClaim, error: claimError } = await supabase
      .from('profit_claims')
      .insert({
        user_id: userId,
        daily_profit_id: dailyProfitId,
        amount: parseFloat(profitAmount.toFixed(2)),
        base_percentage: parseFloat(basePercentage.toFixed(4)),
        booster_percentage: boosterPercentage,
        total_percentage: parseFloat(totalPercentage.toFixed(4)),
        status: 'available',
        expires_at: `${today}T23:59:59.999Z`
      })
      .select()
      .single()

    if (claimError || !newClaim) {
      console.error('[Profit Today] Failed to create profit_claim:', claimError)
      return NextResponse.json({ 
        profit: null, 
        message: 'Failed to create profit claim',
        isClaimTime
      })
    }

    console.log(`[Profit Today] Auto-generated profit for user ${userId}: $${profitAmount.toFixed(2)} (${totalPercentage.toFixed(2)}%)`)

    return NextResponse.json({ 
      profit: {
        id: newClaim.id,
        amount: newClaim.amount,
        total_percentage: newClaim.total_percentage,
        base_percentage: newClaim.base_percentage,
        booster_percentage: newClaim.booster_percentage,
        status: newClaim.status,
        created_at: newClaim.created_at
      },
      isClaimTime,
      autoGenerated: true
    })
  } catch (error: any) {
    console.error('[Profit Today] Error:', error)
    return NextResponse.json({ error: 'Internal error', details: error.message }, { status: 500 })
  }
}
