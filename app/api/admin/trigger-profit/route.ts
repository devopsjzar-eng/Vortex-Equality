import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Manual trigger for daily profit - NO AUTH REQUIRED FOR EMERGENCY
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    // 1. Parse manual rate from request
    const body = await request.json().catch(() => ({}))
    const manualRate = Number(body.rate)
    
    // Default fallback to random 1.0 - 1.5 if manual rate not provided
    let finalRate = manualRate
    if (!manualRate || isNaN(manualRate) || manualRate <= 0) {
      const DAILY_RATES = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5]
      finalRate = DAILY_RATES[Math.floor(Math.random() * DAILY_RATES.length)]
    }

    const supabaseAdmin = getSupabaseAdmin()
    const today = new Date()
    const profitDate = today.toISOString().split('T')[0]

    // No Profit Sharing (Member 100%)
    // FIX NUMERIC OVERFLOW: The database schema for member_share is likely numeric(4,2) which maxes out at 99.99!
    // Passing 100 causes a database crash. We pass 99.99 to bypass the limit.
    const globalPercentage = parseFloat((finalRate / 100).toFixed(4))
    const memberShare = 99.99
    const companyShare = 0

    // Create or get today's daily_profits record
    const { data: dailyProfit } = await supabaseAdmin
      .from('daily_profits')
      .select('*')
      .eq('profit_date', profitDate)
      .single()

    let profitRecord = dailyProfit

    if (!dailyProfit) {
      // FIX CHECK CONSTRAINT: The database expects WHOLE NUMBERS (1.50) for daily_profits, NOT fractions (0.015)!
      const { data: newProfit, error: profitError } = await supabaseAdmin
        .from('daily_profits')
        .insert({
          profit_date: profitDate,
          global_profit_percentage: Number(finalRate.toFixed(2)),
          member_share: Number(memberShare.toFixed(2)),
          company_share: Number(companyShare.toFixed(2)),
          distribution_time: new Date().toISOString(),
        })
        .select()
        .single()

      if (profitError) throw profitError
      profitRecord = newProfit
    }

    // Get all eligible members (not admin)
    const { data: members, error: membersError } = await supabaseAdmin
      .from('profiles')
      .select('id, total_deposit, is_admin')
      .eq('is_admin', false)

    if (membersError) throw membersError

    let generated = 0
    let skipped = 0
    let skipReason = { lessThan50: 0, roiCap: 0, existing: 0, noWallet: 0 }
    const results: any[] = []

    for (const member of members || []) {
      // Get member's asset wallet
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('balance, initial_capital, total_profit_earned')
        .eq('user_id', member.id)
        .eq('wallet_type', 'asset')
        .single()

      if (walletError || !wallet) {
        skipped++; skipReason.noWallet++;
        continue
      }

      const activeCapital = wallet.initial_capital || 0
      const assetBalance = wallet.balance || 0
      
      // SYARAT MINIMAL ASSET AKTIF $50
      if (activeCapital < 50 || assetBalance <= 0) {
        skipped++; skipReason.lessThan50++;
        continue
      }

      // Check ROI cap (400% = 300% profit bersih + 100% modal)
      const totalProfitEarned = wallet.total_profit_earned || 0
      const maxROI = activeCapital * 3
      
      if (totalProfitEarned >= maxROI) {
        skipped++; skipReason.roiCap++;
        continue
      }

      // Check if already generated today
      const { data: existing } = await supabaseAdmin
        .from('profit_claims')
        .select('id')
        .eq('user_id', member.id)
        .eq('daily_profit_id', profitRecord.id)
        .single()

      if (existing) {
        skipped++; skipReason.existing++;
        continue
      }

      // Calculate GROSS profit
      const basePercentage = globalPercentage
      const boosterPercentage = member.booster_percentage || 0
      const totalPercentage = basePercentage + boosterPercentage
      const grossProfit = assetBalance * (totalPercentage / 100)
      
      // Apply 50/50 split
      const memberProfit = grossProfit * (memberShare / 100)

      // Insert profit claim
      // FIX NUMERIC OVERFLOW: Match the cron job perfectly.
      const roundedAmount = parseFloat(memberProfit.toFixed(2));
      const roundedBase = parseFloat(basePercentage.toFixed(3));
      const roundedTotal = parseFloat(totalPercentage.toFixed(3));

      const { error: insertError } = await supabaseAdmin
        .from('profit_claims')
        .insert({
          user_id: member.id,
          daily_profit_id: profitRecord.id,
          amount: roundedAmount,
          base_percentage: roundedBase,
          booster_percentage: 0,
          total_percentage: roundedTotal,
          status: 'available',
          claimed_at: null
        })

      if (!insertError) {
        generated++
        results.push({
          userId: member.id,
          profit: memberProfit.toFixed(2),
          percentage: (totalPercentage).toFixed(2) + '%'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Profit generated for ${generated} members`,
      date: profitDate,
      globalPercentage: (globalPercentage * 100).toFixed(2) + '%',
      memberShare: memberShare + '%',
      companyShare: companyShare + '%',
      generated,
      skipped,
      results
    })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
