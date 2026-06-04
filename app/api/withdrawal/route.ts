import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sendAdminWithdrawalNotification } from '../../../lib/email'
import { withdrawalRateLimit, rateLimitResponse } from '@/lib/rate-limit'

// Use service role for operations that need to bypass RLS
function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Recursive function to calculate group turnover
async function calculateGroupTurnoverRecursive(supabase: any, userId: string, depth: number = 0): Promise<number> {
  if (depth >= 10) return 0
  
  const { data: children } = await supabase
    .from('profiles')
    .select('id, total_deposit')
    .eq('referred_by', userId)
  
  if (!children || children.length === 0) return 0
  
  let totalTurnover = 0
  for (const child of children) {
    totalTurnover += Number(child.total_deposit || 0)
    totalTurnover += await calculateGroupTurnoverRecursive(supabase, child.id, depth + 1)
  }
  
  return totalTurnover
}

// Calculate line turnovers for rank check
async function calculateLineTurnovers(supabase: any, userId: string): Promise<number[]> {
  const { data: directReferrals } = await supabase
    .from('profiles')
    .select('id, total_deposit')
    .eq('referred_by', userId)

  if (!directReferrals || directReferrals.length === 0) return []

  const lineTurnovers: number[] = []
  for (const referral of directReferrals) {
    let lineTurnover = Number(referral.total_deposit) || 0
    lineTurnover += await calculateGroupTurnoverRecursive(supabase, referral.id)
    lineTurnovers.push(lineTurnover)
  }
  return lineTurnovers.sort((a, b) => b - a)
}

// Rank definitions
const RANKS = [
  { rank: 'STARTER', directReferrals: 0, groupTurnover: 0, minAsset: 0, salary: 0, lineRequirement: null },
  { rank: 'P1', directReferrals: 5, groupTurnover: 5000, minAsset: 50, salary: 100, lineRequirement: null },
  { rank: 'P2', directReferrals: 3, groupTurnover: 15000, minAsset: 200, salary: 300, lineRequirement: { count: 3, turnover: 5000 } },
  { rank: 'P3', directReferrals: 3, groupTurnover: 45000, minAsset: 600, salary: 500, lineRequirement: { count: 3, turnover: 15000 } },
  { rank: 'P4', directReferrals: 3, groupTurnover: 135000, minAsset: 1000, salary: 3000, lineRequirement: { count: 3, turnover: 45000 } },
  { rank: 'P5', directReferrals: 3, groupTurnover: 300000, minAsset: 2000, salary: 5000, lineRequirement: { count: 3, turnover: 100000 } }
]

// Auto check rank - can PROMOTE or DEMOTE
async function autoCheckAndUpdateRank(supabase: any, userId: string) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile) return

    const { data: assetWallet } = await supabase
      .from('wallets')
      .select('initial_capital')
      .eq('user_id', userId)
      .eq('wallet_type', 'asset')
      .single()

    const currentAsset = assetWallet?.initial_capital || 0

    const { count: directReferrals } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', userId)

    const groupTurnover = await calculateGroupTurnoverRecursive(supabase, userId)
    const lineTurnovers = await calculateLineTurnovers(supabase, userId)

    // Determine eligible rank (check from highest to lowest)
    let newRank = 'STARTER'
    for (let i = RANKS.length - 1; i >= 0; i--) {
      const rank = RANKS[i]
      
      const meetsDirectReferrals = (directReferrals || 0) >= rank.directReferrals
      const meetsGroupTurnover = groupTurnover >= rank.groupTurnover
      const meetsMinAsset = currentAsset >= rank.minAsset
      
      let meetsLineRequirement = true
      if (rank.lineRequirement) {
        const qualifyingLines = lineTurnovers.filter(t => t >= rank.lineRequirement!.turnover).length
        meetsLineRequirement = qualifyingLines >= rank.lineRequirement.count
      }

      if (meetsDirectReferrals && meetsGroupTurnover && meetsMinAsset && meetsLineRequirement) {
        newRank = rank.rank
        break
      }
    }

    const currentRank = profile.rank || 'STARTER'
    if (currentRank !== newRank) {
      await supabase
        .from('profiles')
        .update({ rank: newRank, updated_at: new Date().toISOString() })
        .eq('id', userId)

      console.log(`[RankCheck] User ${userId} rank changed: ${currentRank} -> ${newRank}`)
    }
  } catch (error) {
    console.error('[RankCheck] Error:', error)
  }
}

// Update upline statistics and trigger rank check
async function updateUplineStatisticsAndRank(supabase: any, userId: string) {
  try {
    let currentUserId = userId
    const uplineIds: string[] = []
    
    for (let i = 0; i < 10; i++) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('id', currentUserId)
        .single()
      
      if (!profile?.referred_by) break
      uplineIds.push(profile.referred_by)
      currentUserId = profile.referred_by
    }
    
    for (const uplineId of uplineIds) {
      const { count: directCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', uplineId)
      
      const groupTurnover = await calculateGroupTurnoverRecursive(supabase, uplineId)
      
      await supabase
        .from('profiles')
        .update({
          total_direct_referrals: directCount || 0,
          group_turnover: groupTurnover,
          updated_at: new Date().toISOString(),
        })
        .eq('id', uplineId)
      
      // AUTO RANK CHECK - Can promote or demote
      await autoCheckAndUpdateRank(supabase, uplineId)
    }
  } catch (error) {
    console.error('[Withdrawal] Failed to update upline statistics:', error)
  }
}

// POST - Create withdrawal request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = getSupabaseAdmin()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting - 5 attempts per minute per user
    const { success: rateLimitOk, reset } = await withdrawalRateLimit.limit(user.id)
    if (!rateLimitOk) {
      return rateLimitResponse(reset)
    }

    const body = await request.json()
    const { amount, walletType, cryptoAddress, cryptoNetwork = 'BEP20' } = body

    if (!amount || amount < 10) {
      return NextResponse.json({ 
        error: 'Minimum withdrawal amount is $10' 
      }, { status: 400 })
    }

    if (!cryptoAddress) {
      return NextResponse.json({ 
        error: 'Crypto address is required' 
      }, { status: 400 })
    }

    if (!['asset', 'bonus'].includes(walletType)) {
      return NextResponse.json({ 
        error: 'Invalid wallet type' 
      }, { status: 400 })
    }

    // Get user's wallet using admin client to bypass RLS
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .eq('wallet_type', walletType)
      .single()

    if (walletError || !wallet) {
      console.error('Wallet fetch error:', walletError)
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    if (wallet.balance < amount) {
      return NextResponse.json({ 
        error: 'Insufficient balance' 
      }, { status: 400 })
    }

    // Calculate withdrawal fee based on blueprint rules
    // Bonus Wallet: flat 5%
    // Asset Wallet: 20% (belum balik modal) atau 5% (sudah balik modal 100%)
    let feePercentage: number

    if (walletType === 'bonus') {
      // Bonus wallet: flat 5% only
      feePercentage = 5
    } else {
      // Asset wallet: Calculate fee based on current profit percentage
      // Get user's total deposit to calculate profit % - use admin client for guaranteed access
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('total_deposit')
        .eq('id', user.id)
        .single()
      
      // Fetch Modal Aktif dari wallet (ini direset saat top up, jadi lebih akurat)
      const activeCapital = Number(wallet.initial_capital || 0)
      
      // Hitung total semua withdrawal sukses/pending dari Asset Wallet
      const { data: pastWithdrawals } = await supabaseAdmin
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('wallet_type', 'asset')
        .eq('type', 'withdrawal')
        .in('status', ['success', 'pending'])
        
      const totalWithdrawn = pastWithdrawals?.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) || 0
      
      // Fee logic:
      // BEP 100% diukur dari: Apakah total uang yang sudah dia WD >= Modal aktif dia?
      if (activeCapital > 0 && totalWithdrawn >= activeCapital) {
        // Sudah BEP (Balik Modal) - fee turun jadi 5%
        feePercentage = 5
      } else {
        // Belum BEP - fee 20%
        feePercentage = 20
      }
    }

    const fee = (amount * feePercentage) / 100
    const netAmount = amount - fee

    // Deduct from wallet balance using admin client
    const { error: deductError } = await supabaseAdmin
      .from('wallets')
      .update({ 
        balance: wallet.balance - amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id)

    if (deductError) {
      console.error('Wallet deduct error:', deductError)
      return NextResponse.json({ error: 'Failed to deduct balance' }, { status: 500 })
    }

    // Create withdrawal transaction using admin client (pending approval)
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_type: walletType,
        type: 'withdrawal',
        amount: amount,
        fee: fee,
        net_amount: netAmount,
        status: 'pending',
        crypto_address: cryptoAddress,
        external_ref: `WD-${Date.now()}-${user.id.slice(0, 8)}`,
        receipt_data: { network: cryptoNetwork },
      })
      .select()
      .single()

    if (txError) {
      console.error('Transaction create error:', txError)
      // Refund balance if transaction creation fails
      await supabaseAdmin
        .from('wallets')
        .update({ balance: wallet.balance })
        .eq('id', wallet.id)
      
      return NextResponse.json({ error: 'Failed to create withdrawal request' }, { status: 500 })
    }

    // Send email notification to admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    if (profile) {
      // Send async - don't block response
      sendAdminWithdrawalNotification(
        profile.full_name || 'Unknown',
        profile.email || user.email || '',
        amount,
        fee,
        netAmount,
        walletType,
        cryptoAddress
      ).catch(err => console.error('[Withdrawal] Email notification failed:', err))
    }

    // NOTE: total_deposit dan rank check HANYA dilakukan saat withdrawal DISETUJUI (approve)
    // BUKAN saat request. Ini agar jika ditolak, tidak ada perubahan pada ROI Progress.

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount,
        fee,
        feePercentage,
        netAmount,
        status: 'pending',
        message: 'Withdrawal request submitted. Awaiting admin approval.'
      }
    })

  } catch (error) {
    console.error('Withdrawal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Get withdrawal history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: withdrawals } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'withdrawal')
      .order('created_at', { ascending: false })

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals || []
    })

  } catch (error) {
    console.error('Get withdrawals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
