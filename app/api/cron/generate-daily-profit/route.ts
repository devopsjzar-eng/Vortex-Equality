import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This cron job runs at 10:00 AM WIB (03:00 UTC) to generate profit for all eligible members
// Vercel Cron: 0 3 * * *

function getSupabaseAdmin() { return createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
) }

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date()
    const profitDate = today.toISOString().split('T')[0]
    
    // Set expiry to midnight tonight (23:59:59)
    const expiresAt = new Date(today)
    expiresAt.setHours(23, 59, 59, 999)

    const supabaseAdmin = getSupabaseAdmin()

    // Generate FIXED profit rate - acak pilih dari [1%, 1.1%, 1.2%, 1.3%]
    // Profit diberikan 100% ke member, tidak ada profit sharing
    const DAILY_RATES = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5] // Fixed rates only
    const selectedRate = DAILY_RATES[Math.floor(Math.random() * DAILY_RATES.length)]
    const globalProfitPercentage = parseFloat((selectedRate / 100).toFixed(4)) // e.g., 0.01 = 1%
    
    const { data: profitRecord, error: profitError } = await supabaseAdmin
      .from('daily_profits')
      .insert({
        profit_date: profitDate,
        global_profit_percentage: globalProfitPercentage,
        distribution_time: new Date().toISOString(),
      })
      .select()
      .single()

    if (profitError) {
      // Try to get existing record if already created today
      const { data: existingProfit } = await supabaseAdmin
        .from('daily_profits')
        .select('*')
        .eq('profit_date', profitDate)
        .single()
      
      if (!existingProfit) throw profitError
    }

    // Get all eligible members (deposit > 0, not admin)
    const { data: members, error: membersError } = await supabaseAdmin
      .from('profiles')
      .select('id, total_deposit, booster_percentage, strategic_booster, is_admin')
      .eq('is_admin', false)
      .gt('total_deposit', 0)

    if (membersError) throw membersError

    let generated = 0
    let skipped = 0

    for (const member of members || []) {
      // Get member's asset wallet balance
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('balance, initial_capital, total_profit_earned')
        .eq('user_id', member.id)
        .eq('wallet_type', 'asset')
        .single()

      if (walletError || !wallet) {
        skipped++
        continue
      }

      // MENGGUNAKAN WALLET BALANCE SEBAGAI BASIS AUTO-COMPOUND (SESUAI PRIORITAS 1)
      const assetBalance = wallet.balance || 0
      if (assetBalance <= 0) {
        skipped++
        continue
      }

      // Check ROI cap (400% = 300% profit bersih + Modal 100%)
      // Active Capital adalah initial_capital (modal deposit murni)
      const activeCapital = wallet.initial_capital || 0
      const totalProfitEarned = wallet.total_profit_earned || 0
      const maxROI = activeCapital * 3  // 300% batas profit murni (total asset menjadi 400%)
      
      if (totalProfitEarned >= maxROI) {
        skipped++
        console.log(`[Profit] Skipped member ${member.id} - ROI 400% reached (earned: ${totalProfitEarned}, max: ${maxROI})`)
        continue // Skip - ROI cap reached, perlu reinvest
      }

      // Calculate profit with marketing plan (Auto-Compound dari Wallet Balance)
      const basePercentage = globalProfitPercentage * 100 
      
      // STRATEGIC BOOSTER DIHAPUS (SESUAI INSTRUKSI OWNER)
      const strategicBooster = 0
      const totalPercentage = basePercentage
      
      // Calculate member profit dari Wallet Balance (Auto-Compound)
      const memberProfit = assetBalance * (totalPercentage / 100)

      // Check if already generated today
      const { data: existing } = await supabaseAdmin
        .from('profit_claims')
        .select('id')
        .eq('user_id', member.id)
        .gte('created_at', profitDate)
        .single()

      if (existing) {
        skipped++
        continue // Already generated
      }

      // Insert profit claim record
      const { error: insertError } = await supabaseAdmin
        .from('profit_claims')
        .insert({
          user_id: member.id,
          daily_profit_id: profitRecord?.id || null,
          amount: parseFloat(memberProfit.toFixed(2)),
          base_percentage: parseFloat(basePercentage.toFixed(3)),
          booster_percentage: strategicBooster,
          total_percentage: parseFloat(totalPercentage.toFixed(3)),
          status: 'available',
          claimed_at: null
        })

      if (!insertError) {
        generated++
        console.log(`[Profit] Generated $${memberProfit.toFixed(2)} for member ${member.id} (base: ${basePercentage.toFixed(3)}%, booster: ${strategicBooster}%, total: ${totalPercentage.toFixed(3)}%)`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Daily profit generated for ${generated} members`,
      details: {
        date: profitDate,
        globalPercentage: (globalProfitPercentage * 100).toFixed(2) + '%',
        generated,
        skipped,
      }
    })

  } catch (error) {
    console.error('Error generating daily profit:', error)
    return NextResponse.json({ error: 'Failed to generate daily profit' }, { status: 500 })
  }
}
