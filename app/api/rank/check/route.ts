import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Rank definitions based on blueprint - using exact rank names from database
const RANKS = [
  {
    rank: 'Bronze',
    directReferrals: 0,
    groupTurnover: 0,
    minAsset: 0,
    salary: 0,
    lineRequirement: null
  },
  {
    rank: 'P1',
    directReferrals: 5,
    groupTurnover: 5000,
    minAsset: 50,
    salary: 100,
    lineRequirement: null
  },
  {
    rank: 'P2',
    directReferrals: 3,
    groupTurnover: 15000,
    minAsset: 200,
    salary: 300,
    lineRequirement: { count: 3, turnover: 5000 }
  },
  {
    rank: 'P3',
    directReferrals: 3,
    groupTurnover: 45000,
    minAsset: 600,
    salary: 500,
    lineRequirement: { count: 3, turnover: 15000 }
  },
  {
    rank: 'P4',
    directReferrals: 3,
    groupTurnover: 135000,
    minAsset: 1000,
    salary: 3000,
    lineRequirement: { count: 3, turnover: 45000 }
  },
  {
    rank: 'P5',
    directReferrals: 3,
    groupTurnover: 300000,
    minAsset: 2000,
    salary: 5000,
    lineRequirement: { count: 3, turnover: 100000 }
  }
]

// POST - Check and update rank for a user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      // If no userId, check for current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get user's asset wallet
    const { data: assetWallet } = await supabase
      .from('wallets')
      .select('initial_capital')
      .eq('user_id', targetUserId)
      .eq('wallet_type', 'asset')
      .single()

    const currentAsset = assetWallet?.initial_capital || 0

    // Get direct referrals count
    const { count: directReferrals } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', targetUserId)

    // Calculate group turnover (all downlines' deposits)
    const groupTurnover = await calculateGroupTurnover(supabase, targetUserId)

    // Get line turnovers for advanced ranks
    const lineTurnovers = await calculateLineTurnovers(supabase, targetUserId)

    // Determine eligible rank
    let newRank = 'STARTER'
    let eligibleSalary = 0

    for (let i = RANKS.length - 1; i >= 0; i--) {
      const rank = RANKS[i]
      
      // Check basic requirements
      const meetsDirectReferrals = (directReferrals || 0) >= rank.directReferrals
      const meetsGroupTurnover = groupTurnover >= rank.groupTurnover
      const meetsMinAsset = currentAsset >= rank.minAsset
      
      // Check line requirements for P2+
      let meetsLineRequirement = true
      if (rank.lineRequirement) {
        const qualifyingLines = lineTurnovers.filter(
          turnover => turnover >= rank.lineRequirement!.turnover
        ).length
        meetsLineRequirement = qualifyingLines >= rank.lineRequirement.count
      }

      if (meetsDirectReferrals && meetsGroupTurnover && meetsMinAsset && meetsLineRequirement) {
        newRank = rank.rank
        eligibleSalary = rank.salary
        break
      }
    }

    // Check if rank changed
    const rankChanged = profile.rank !== newRank
    const rankIndex = RANKS.findIndex(r => r.rank === newRank)
    const previousRankIndex = RANKS.findIndex(r => r.rank === profile.rank)
    const isPromotion = rankIndex > previousRankIndex

    // Update profile if rank changed
    if (rankChanged) {
      await supabase
        .from('profiles')
        .update({
          rank: newRank,
          group_turnover: groupTurnover,
          total_direct_referrals: directReferrals || 0
        })
        .eq('id', targetUserId)

      // If promoted, give immediate rank reward
      if (isPromotion && eligibleSalary > 0) {
        // Get bonus wallet
        const { data: bonusWallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('wallet_type', 'bonus')
          .single()

        if (bonusWallet) {
          // Credit rank reward
          await supabase
            .from('wallets')
            .update({ balance: bonusWallet.balance + eligibleSalary })
            .eq('id', bonusWallet.id)

          // Create transaction record
          await supabase
            .from('transactions')
            .insert({
              user_id: targetUserId,
              wallet_type: 'bonus',
              type: 'rank_reward',
              amount: eligibleSalary,
              fee: 0,
              net_amount: eligibleSalary,
              status: 'success',
              admin_notes: `Rank achievement reward: ${newRank}`,
              external_ref: `RANK-${newRank}-${Date.now()}`
            })

          // Create rank reward record
          await supabase
            .from('rank_rewards')
            .insert({
              user_id: targetUserId,
              rank: newRank,
              reward_amount: eligibleSalary,
              reward_month: new Date().toISOString().slice(0, 7), // YYYY-MM format
              status: 'paid'
            })
        }
      }
    } else {
      // Just update stats
      await supabase
        .from('profiles')
        .update({
          group_turnover: groupTurnover,
          total_direct_referrals: directReferrals || 0
        })
        .eq('id', targetUserId)
    }

    return NextResponse.json({
      success: true,
      previousRank: profile.rank,
      currentRank: newRank,
      rankChanged,
      isPromotion,
      rewardPaid: isPromotion ? eligibleSalary : 0,
      stats: {
        directReferrals: directReferrals || 0,
        groupTurnover,
        currentAsset,
        lineTurnovers
      }
    })

  } catch (error) {
    console.error('Rank check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Get rank requirements and progress
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('rank, group_turnover, total_direct_referrals')
      .eq('id', user.id)
      .single()

    // Get user's asset
    const { data: assetWallet } = await supabase
      .from('wallets')
      .select('initial_capital')
      .eq('user_id', user.id)
      .eq('wallet_type', 'asset')
      .single()

    const currentAsset = assetWallet?.initial_capital || 0
    const lineTurnovers = await calculateLineTurnovers(supabase, user.id)

    // Find current rank index
    const currentRankIndex = RANKS.findIndex(r => r.rank === profile?.rank)
    const nextRank = currentRankIndex < RANKS.length - 1 ? RANKS[currentRankIndex + 1] : null

    return NextResponse.json({
      currentRank: profile?.rank || 'STARTER',
      currentRankIndex,
      ranks: RANKS,
      nextRank,
      progress: {
        directReferrals: profile?.total_direct_referrals || 0,
        groupTurnover: profile?.group_turnover || 0,
        currentAsset,
        lineTurnovers
      }
    })

  } catch (error) {
    console.error('Get rank error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to calculate total group turnover
async function calculateGroupTurnover(supabase: any, userId: string): Promise<number> {
  // Get all direct referrals
  const { data: directReferrals } = await supabase
    .from('profiles')
    .select('id, total_deposit')
    .eq('referred_by', userId)

  if (!directReferrals || directReferrals.length === 0) return 0

  let totalTurnover = 0

  for (const referral of directReferrals) {
    totalTurnover += referral.total_deposit || 0
    // Recursively get downline turnover
    const downlineTurnover = await calculateGroupTurnover(supabase, referral.id)
    totalTurnover += downlineTurnover
  }

  return totalTurnover
}

// Helper function to calculate turnover per line (each direct referral's total group)
async function calculateLineTurnovers(supabase: any, userId: string): Promise<number[]> {
  const { data: directReferrals } = await supabase
    .from('profiles')
    .select('id, total_deposit')
    .eq('referred_by', userId)

  if (!directReferrals || directReferrals.length === 0) return []

  const lineTurnovers: number[] = []

  for (const referral of directReferrals) {
    let lineTurnover = referral.total_deposit || 0
    const downlineTurnover = await calculateGroupTurnover(supabase, referral.id)
    lineTurnover += downlineTurnover
    lineTurnovers.push(lineTurnover)
  }

  // Sort descending
  return lineTurnovers.sort((a, b) => b - a)
}
