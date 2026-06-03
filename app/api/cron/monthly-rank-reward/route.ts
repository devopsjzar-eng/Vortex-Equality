import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Rank definitions with monthly rewards
const RANKS = [
  { rank: 'Bronze', salary: 0 },
  { rank: 'STARTER', salary: 0 },
  { rank: 'P1', salary: 100 },
  { rank: 'P2', salary: 300 },
  { rank: 'P3', salary: 500 },
  { rank: 'P4', salary: 3000 },
  { rank: 'P5', salary: 5000 }
]

// This cron runs on 1st of every month to distribute monthly rank rewards
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format

    // Get all users with rank P1 or higher
    const { data: eligibleUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, rank')
      .in('rank', ['P1', 'P2', 'P3', 'P4', 'P5'])

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No eligible users for monthly rank reward',
        processed: 0
      })
    }

    let processedCount = 0
    let totalRewardsPaid = 0
    const results: any[] = []

    for (const user of eligibleUsers) {
      // Check if user already received reward this month
      const { data: existingReward } = await supabase
        .from('rank_rewards')
        .select('id')
        .eq('user_id', user.id)
        .eq('reward_month', currentMonth)
        .eq('reward_type', 'monthly')
        .single()

      if (existingReward) {
        // Already received this month
        results.push({
          userId: user.id,
          rank: user.rank,
          status: 'skipped',
          reason: 'Already received this month'
        })
        continue
      }

      // Get reward amount for user's rank
      const rankInfo = RANKS.find(r => r.rank === user.rank)
      const rewardAmount = rankInfo?.salary || 0

      if (rewardAmount <= 0) {
        results.push({
          userId: user.id,
          rank: user.rank,
          status: 'skipped',
          reason: 'No reward for this rank'
        })
        continue
      }

      // Get user's bonus wallet
      const { data: bonusWallet } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .eq('wallet_type', 'bonus')
        .single()

      if (!bonusWallet) {
        results.push({
          userId: user.id,
          rank: user.rank,
          status: 'error',
          reason: 'Bonus wallet not found'
        })
        continue
      }

      // Credit the reward to bonus wallet
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: bonusWallet.balance + rewardAmount })
        .eq('id', bonusWallet.id)

      if (updateError) {
        results.push({
          userId: user.id,
          rank: user.rank,
          status: 'error',
          reason: updateError.message
        })
        continue
      }

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_type: 'bonus',
          type: 'rank_reward',
          amount: rewardAmount,
          fee: 0,
          net_amount: rewardAmount,
          status: 'success',
          admin_notes: `Monthly rank reward for ${user.rank} - ${currentMonth}`,
          external_ref: `MONTHLY-${user.rank}-${currentMonth}`
        })

      // Create rank reward record
      await supabase
        .from('rank_rewards')
        .insert({
          user_id: user.id,
          rank: user.rank,
          reward_amount: rewardAmount,
          reward_month: currentMonth,
          reward_type: 'monthly',
          status: 'paid'
        })

      processedCount++
      totalRewardsPaid += rewardAmount

      results.push({
        userId: user.id,
        rank: user.rank,
        status: 'success',
        amount: rewardAmount
      })
    }

    console.log(`Monthly rank rewards distributed: ${processedCount} users, $${totalRewardsPaid} total`)

    return NextResponse.json({
      success: true,
      month: currentMonth,
      processed: processedCount,
      totalRewardsPaid,
      results
    })

  } catch (error) {
    console.error('Monthly rank reward error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
