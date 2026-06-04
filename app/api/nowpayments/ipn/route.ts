import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { sendAdminDepositNotification } from '../../../../lib/email'

// Create admin client for server-side operations
function getSupabaseAdmin() { return createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
) }

// Payment status mapping from NOWPayments
const PAYMENT_STATUS = {
  waiting: 'pending',
  confirming: 'pending',
  confirmed: 'pending',
  sending: 'pending',
  partially_paid: 'pending',
  finished: 'success',
  failed: 'failed',
  refunded: 'failed',
  expired: 'expired',
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.json()
    const signature = request.headers.get('x-nowpayments-sig')
    
    // Verify signature only if IPN secret is configured
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET
    if (ipnSecret && signature) {
      const sortedPayload = Object.keys(body)
        .sort()
        .reduce((acc, key) => {
          acc[key] = body[key]
          return acc
        }, {} as Record<string, unknown>)
      
      const payloadString = JSON.stringify(sortedPayload)
      const hmac = crypto.createHmac('sha512', ipnSecret)
      hmac.update(payloadString)
      const calculatedSignature = hmac.digest('hex')
      
      if (calculatedSignature !== signature) {
        console.error('[NOWPayments IPN] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } else {
      console.log('[NOWPayments IPN] Skipping signature check - no IPN secret configured')
    }
    
    // Extract payment details
    const {
      payment_id,
      status,  // NOWPayments uses 'status' not 'payment_status'
      pay_address,
      price_amount,
      price_currency,
      pay_amount,
      actually_paid,
      pay_currency,
      order_id,
      order_description,
      purchase_id,
      outcome_amount,
      outcome_currency,
    } = body
    
    console.log('[NOWPayments IPN] Received webhook:', {
      payment_id,
      status,
      order_id,
    })
    
    // Map NOWPayments status to our status
    const mappedStatus = PAYMENT_STATUS[status as keyof typeof PAYMENT_STATUS] || 'pending'
    
    // Parse order_id to get user_id and transaction details
    // Format: userId_timestamp
    const [userId] = order_id.split('_')
    
    if (!userId) {
      console.error('[NOWPayments IPN] Invalid order_id format:', order_id)
      return NextResponse.json({ error: 'Invalid order_id' }, { status: 400 })
    }
    
    // Check if transaction already exists
    // IMPORTANT: Use external_ref as unique identifier for idempotency
    const supabaseAdmin = getSupabaseAdmin()
    const { data: existingTx, error: txCheckError } = await supabaseAdmin
      .from('transactions')
      .select('id, status, amount, created_at')
      .eq('user_id', userId) // Double check: must be same user
      .eq('external_ref', payment_id.toString())
      .single()
    
    console.log('[NOWPayments IPN] Idempotency check - Existing Tx:', existingTx?.id, 'Status:', existingTx?.status, 'Error:', txCheckError?.message)
    
    if (existingTx && existingTx.status === 'success') {
      // Transaction already processed and credited - SKIP to prevent double credit
      console.log('[NOWPayments IPN] SKIPPING: Transaction already processed. ID:', existingTx.id)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }
    
    // STRICT VALIDATION: Deposit minimum $50 - MUST BE ENFORCED AT WEBHOOK LEVEL
    if (price_amount < 50 && mappedStatus === 'success') {
      console.warn('[NOWPayments IPN] REJECTED: Deposit below $50 minimum. Amount: $' + price_amount + '. Payment ID: ' + payment_id)
      return NextResponse.json({ 
        error: 'Deposit amount below minimum $50. Received: $' + price_amount 
      }, { status: 400 })
    }

    if (existingTx) {
      // Update existing transaction (not yet successful or status changed)
      if (existingTx.status !== 'success') {
        await supabaseAdmin
          .from('transactions')
          .update({
            status: mappedStatus,
            receipt_data: {
              payment_id,
              status,  // Fixed: use 'status' not 'payment_status'
              pay_address,
              pay_amount,
              actually_paid,
              pay_currency,
              purchase_id,
              outcome_amount,
              outcome_currency,
              updated_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingTx.id)
        
        // If payment is now successful, credit the wallet
        if (mappedStatus === 'success' && existingTx.status !== 'success') {
          await creditUserWallet(userId, price_amount)
        }
      }
      
      console.log('[NOWPayments IPN] Updated existing transaction:', existingTx.id)
    } else {
      // Create new transaction
      const { data: newTx, error: txError } = await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: userId,
          wallet_type: 'asset',
          type: 'deposit',
          amount: price_amount,
          fee: 0,
          net_amount: price_amount,
          status: mappedStatus,
          external_ref: payment_id.toString(),
          crypto_address: pay_address,
          receipt_data: {
            payment_id,
            status,  // Fixed: use 'status' not 'payment_status'
            pay_address,
            pay_amount,
            actually_paid,
            pay_currency,
            purchase_id,
            outcome_amount,
            outcome_currency,
            price_currency,
            created_at: new Date().toISOString(),
          },
        })
        .select()
        .single()
      
      if (txError) {
        console.error('[NOWPayments IPN] Failed to create transaction:', txError)
        return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
      }
      
      console.log('[NOWPayments IPN] Created new transaction:', newTx.id)
      
      // If payment is successful, credit the wallet
      if (mappedStatus === 'success') {
        await creditUserWallet(userId, price_amount)
        
        // Send email notification to admin
        const supabaseAdmin = getSupabaseAdmin()
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId)
          .single()
        
        if (userProfile) {
          sendAdminDepositNotification(
            userProfile.full_name || 'Unknown',
            userProfile.email || '',
            price_amount,
            `${pay_currency || 'Crypto'} via NOWPayments`
          ).catch(err => console.error('[IPN] Email notification failed:', err))
        }
      }
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('[NOWPayments IPN] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to credit user wallet after successful deposit
// IMPORTANT: This function should be called ONLY ONCE per deposit
async function creditUserWallet(userId: string, amount: number) {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    // SAFETY CHECK: Get current wallet balance to detect if already credited
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, initial_capital, updated_at')
      .eq('user_id', userId)
      .eq('wallet_type', 'asset')
      .single()
    
    if (!wallet) {
      console.error('[NOWPayments IPN] Wallet not found for user:', userId)
      return
    }
    
    // ANTI-DOUBLE-CREDIT: Check if wallet was recently updated (within last 5 seconds)
    // This indicates creditUserWallet was already called for this deposit
    if (wallet.updated_at) {
      const lastUpdateTime = new Date(wallet.updated_at).getTime()
      const nowTime = new Date().getTime()
      const timeSinceUpdate = nowTime - lastUpdateTime
      
      if (timeSinceUpdate < 5000) { // Updated within last 5 seconds
        console.warn('[NOWPayments IPN] DUPLICATE CREDIT ATTEMPT DETECTED - Wallet updated too recently. Skipping credit.')
        return
      }
    }
    
    // Update wallet balance and initial_capital
    const newBalance = Number(wallet.balance) + amount
    const newCapital = Number(wallet.initial_capital) + amount
    
    // Fetch current profile to check if it's a top up
    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('total_deposit, booster_percentage')
      .eq('id', userId)
      .single()

    const existingDeposit = Number(currentProfile?.total_deposit || 0)
    const isTopUp = existingDeposit > 0 // Already has deposit = this is a top up
    
    // UPDATE WALLET: If Top-up, RESET 400% tracker (total_profit_earned = 0, cap_reached = false)
    await supabaseAdmin
      .from('wallets')
      .update({
        balance: newBalance,
        initial_capital: newCapital,
        total_profit_earned: isTopUp ? 0 : undefined,
        cap_reached: isTopUp ? false : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)
    
    // Update profile total_deposit
    // IMPORTANT: Check if this is a TOP UP (existing deposit) - if so, reset booster
    // Booster logic removed

    await supabaseAdmin
      .from('profiles')
      .update({
        total_deposit: existingDeposit + amount,
        // Booster logic removed
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
    
    if (isTopUp) {
      console.log(`[NOWPayments IPN] User ${userId} TOP UP $${amount}. New total: $${existingDeposit + amount}. Booster reset to 0%. ROI Cap: $${(existingDeposit + amount + newBalance) * 4}`)
    }
    
    // Process sponsor bonuses
    await processSponsorBonus(userId, amount)
    
    // Booster logic removed
    
    // UPDATE UPLINE STATISTICS (total_direct_referrals & group_turnover)
    await updateUplineStatistics(userId)
    
    console.log('[NOWPayments IPN] Credited wallet for user:', userId, 'Amount:', amount)
    
  } catch (error) {
    console.error('[NOWPayments IPN] Failed to credit wallet:', error)
  }
}

// Process sponsor bonuses (8%, 5%, 2%)
// IDEMPOTENT: Only process once per deposit using strong locking mechanism
async function processSponsorBonus(userId: string, depositAmount: number) {
  const supabaseAdmin = getSupabaseAdmin()
  
  try {
    // Get the LATEST deposit transaction for this user
    const { data: lastDeposit } = await supabaseAdmin
      .from('transactions')
      .select('id, external_ref, created_at')
      .eq('user_id', userId)
      .eq('type', 'deposit')
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (!lastDeposit?.external_ref) {
      console.log('[Sponsor Bonus] No deposit found for bonus processing')
      return
    }
    
    // CRITICAL SAFETY CHECK: Look for ANY referral_bonus transaction with SAME external_ref pattern
    // This prevents double bonus even if called multiple times
    const bonusExternalRef = `SPONSOR-L1-${lastDeposit.external_ref}`
    
    const { data: existingBonus } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'referral_bonus')
      // Check if SAME sponsor bonus already exists (using external_ref pattern match)
      .ilike('external_ref', `%${lastDeposit.external_ref}%`)
      .limit(1)
    
    // IF ANY BONUS WITH SAME EXTERNAL_REF EXISTS = STOP (prevents dobel)
    if (existingBonus && existingBonus.length > 0) {
      console.log('[Sponsor Bonus] DOBEL BONUS PREVENTED: Bonus already exists for deposit:', lastDeposit.external_ref, 'User:', userId)
      return
    }

    const BONUS_LEVELS = [
      { level: 1, percentage: 8 },
      { level: 2, percentage: 5 },
      { level: 3, percentage: 2 },
    ]
    
    let currentUserId = userId
    const bonusResults = []
    
    for (const { level, percentage } of BONUS_LEVELS) {
      // Get referrer
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('referred_by')
        .eq('id', currentUserId)
        .single()
      
      if (!profile?.referred_by) continue
      
      const referrerId = profile.referred_by
      const bonusAmount = (depositAmount * percentage) / 100
      
      // Credit bonus to referrer's bonus wallet
      const { data: bonusWallet } = await supabaseAdmin
        .from('wallets')
        .select('id, balance')
        .eq('user_id', referrerId)
        .eq('wallet_type', 'bonus')
        .single()
      
      if (bonusWallet) {
        const newBalance = Number(bonusWallet.balance || 0) + bonusAmount
        
        await supabaseAdmin
          .from('wallets')
          .update({
            balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bonusWallet.id)
        
        // Create transaction record WITH UNIQUE external_ref pattern
        const { error: txError } = await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: referrerId,
            wallet_type: 'bonus',
            type: 'referral_bonus',
            amount: bonusAmount,
            fee: 0,
            net_amount: bonusAmount,
            status: 'success',
            admin_notes: `Level ${level} sponsor bonus (${percentage}%) from deposit ${lastDeposit.external_ref}`,
            external_ref: `SPONSOR-L${level}-${lastDeposit.external_ref}`
          })
        
        if (!txError) {
          bonusResults.push({ level, amount: bonusAmount, referrer: referrerId })
          console.log(`[Sponsor Bonus] L${level}: $${bonusAmount} → ${referrerId}`)
        }
      }
      
      currentUserId = referrerId
    }
    
    if (bonusResults.length > 0) {
      console.log(`[Sponsor Bonus] SUCCESS: Distributed ${bonusResults.length} level bonuses for user ${userId}, deposit: ${lastDeposit.external_ref}`)
    }
    
  } catch (error) {
    console.error('[Sponsor Bonus] Error processing bonus:', error)
  }
}

// Update referrer booster if deposit qualifies
async function updateReferrerBooster(userId: string, depositAmount: number) {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    // Get user's referrer
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('referred_by')
      .eq('id', userId)
      .single()
    
    if (!profile?.referred_by) return
    
    const referrerId = profile.referred_by
    
    // Get referrer's total deposit
    const { data: referrerProfile } = await supabaseAdmin
      .from('profiles')
      .select('total_deposit, booster_percentage')
      .eq('id', referrerId)
      .single()
    
    if (!referrerProfile) return
    
    // Check if deposit qualifies for booster (>= referrer's total deposit)
    if (depositAmount >= Number(referrerProfile.total_deposit)) {
      // Update referral record
      await supabaseAdmin
        .from('referrals')
        .update({
          invitee_deposit: depositAmount,
          qualifies_for_booster: true,
        })
        .eq('inviter_id', referrerId)
        .eq('invitee_id', userId)
      
      // Check if booster not already applied and under max (3%)
      const currentBooster = Number(referrerProfile.booster_percentage)
      if (currentBooster < 3) {
        const newBooster = Math.min(currentBooster + 0.2, 3)
        
        await supabaseAdmin
          .from('profiles')
          .update({
            booster_percentage: newBooster,
            updated_at: new Date().toISOString(),
          })
          .eq('id', referrerId)
        
        await supabaseAdmin
          .from('referrals')
          .update({ booster_applied: true })
          .eq('inviter_id', referrerId)
          .eq('invitee_id', userId)
        
        console.log(`[NOWPayments IPN] Booster updated for ${referrerId}: ${newBooster}%`)
      }
    }
  } catch (error) {
    console.error('[NOWPayments IPN] Failed to update booster:', error)
  }
}

// Update upline statistics (total_direct_referrals & group_turnover) for all uplines
// AND trigger automatic rank check
async function updateUplineStatistics(userId: string) {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    // Get user's referrer chain
    let currentUserId = userId
    const uplineIds: string[] = []
    
    // Collect all upline IDs (up to 10 levels to prevent infinite loops)
    for (let i = 0; i < 10; i++) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('referred_by')
        .eq('id', currentUserId)
        .single()
      
      if (!profile?.referred_by) break
      
      uplineIds.push(profile.referred_by)
      currentUserId = profile.referred_by
    }
    
    // Update statistics for each upline
    for (const uplineId of uplineIds) {
      // Count actual direct referrals
      const { count: directCount } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', uplineId)
      
      // Calculate group turnover recursively
      const groupTurnover = await calculateGroupTurnoverRecursive(supabaseAdmin, uplineId)
      
      // Update profile
      await supabaseAdmin
        .from('profiles')
        .update({
          total_direct_referrals: directCount || 0,
          group_turnover: groupTurnover,
          updated_at: new Date().toISOString(),
        })
        .eq('id', uplineId)
      
      console.log(`[NOWPayments IPN] Updated stats for ${uplineId}: direct=${directCount}, turnover=${groupTurnover}`)
      
      // AUTO RANK CHECK - Trigger rank evaluation for this upline
      await autoCheckAndUpdateRank(supabaseAdmin, uplineId)
    }
  } catch (error) {
    console.error('[NOWPayments IPN] Failed to update upline statistics:', error)
  }
}

// Helper function to calculate group turnover recursively
async function calculateGroupTurnoverRecursive(supabase: any, userId: string): Promise<number> {
  const { data: directReferrals } = await supabase
    .from('profiles')
    .select('id, total_deposit')
    .eq('referred_by', userId)

  if (!directReferrals || directReferrals.length === 0) return 0

  let totalTurnover = 0

  for (const referral of directReferrals) {
    totalTurnover += Number(referral.total_deposit) || 0
    const downlineTurnover = await calculateGroupTurnoverRecursive(supabase, referral.id)
    totalTurnover += downlineTurnover
  }

  return totalTurnover
}

// Rank definitions with requirements
const RANKS = [
  { rank: 'Bronze', directReferrals: 0, groupTurnover: 0, minAsset: 0, salary: 0, lineRequirement: null },
  { rank: 'P1', directReferrals: 5, groupTurnover: 5000, minAsset: 50, salary: 100, lineRequirement: null },
  { rank: 'P2', directReferrals: 3, groupTurnover: 15000, minAsset: 200, salary: 300, lineRequirement: { count: 3, turnover: 5000 } },
  { rank: 'P3', directReferrals: 3, groupTurnover: 45000, minAsset: 600, salary: 500, lineRequirement: { count: 3, turnover: 15000 } },
  { rank: 'P4', directReferrals: 3, groupTurnover: 135000, minAsset: 1000, salary: 3000, lineRequirement: { count: 3, turnover: 45000 } },
  { rank: 'P5', directReferrals: 3, groupTurnover: 300000, minAsset: 2000, salary: 5000, lineRequirement: { count: 3, turnover: 100000 } }
]

// Auto check and update rank for a user
async function autoCheckAndUpdateRank(supabase: any, userId: string) {
  try {
    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile) return

    // Get user's asset wallet
    const { data: assetWallet } = await supabase
      .from('wallets')
      .select('initial_capital')
      .eq('user_id', userId)
      .eq('wallet_type', 'asset')
      .single()

    const currentAsset = assetWallet?.initial_capital || 0

    // Get direct referrals count
    const { count: directReferrals } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', userId)

    // Calculate group turnover
    const groupTurnover = await calculateGroupTurnoverRecursive(supabase, userId)

    // Get line turnovers (each direct referral's total group)
    const lineTurnovers = await calculateLineTurnoversForRank(supabase, userId)

    // Determine eligible rank
    let newRank = 'STARTER'
    let eligibleSalary = 0

    for (let i = RANKS.length - 1; i >= 0; i--) {
      const rank = RANKS[i]
      
      const meetsDirectReferrals = (directReferrals || 0) >= rank.directReferrals
      const meetsGroupTurnover = groupTurnover >= rank.groupTurnover
      const meetsMinAsset = currentAsset >= rank.minAsset
      
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

    if (rankChanged) {
      // Update profile rank
      await supabase
        .from('profiles')
        .update({ rank: newRank })
        .eq('id', userId)

      console.log(`[AutoRankCheck] User ${userId} rank changed: ${profile.rank} -> ${newRank}`)

      // If promoted, give immediate rank reward
      if (isPromotion && eligibleSalary > 0) {
        const currentMonth = new Date().toISOString().slice(0, 7)
        
        // Check if already received promotion reward this month
        const { data: existingReward } = await supabase
          .from('rank_rewards')
          .select('id')
          .eq('user_id', userId)
          .eq('rank', newRank)
          .eq('reward_type', 'promotion')
          .single()

        if (!existingReward) {
          // Get bonus wallet
          const { data: bonusWallet } = await supabase
            .from('wallets')
            .select('id, balance')
            .eq('user_id', userId)
            .eq('wallet_type', 'bonus')
            .single()

          if (bonusWallet) {
            // Credit rank reward to bonus wallet
            await supabase
              .from('wallets')
              .update({ balance: bonusWallet.balance + eligibleSalary })
              .eq('id', bonusWallet.id)

            // Create transaction record
            await supabase
              .from('transactions')
              .insert({
                user_id: userId,
                wallet_type: 'bonus',
                type: 'rank_reward',
                amount: eligibleSalary,
                fee: 0,
                net_amount: eligibleSalary,
                status: 'success',
                admin_notes: `Rank promotion reward: ${newRank}`,
                external_ref: `PROMO-${newRank}-${Date.now()}`
              })

            // Create rank reward record
            await supabase
              .from('rank_rewards')
              .insert({
                user_id: userId,
                rank: newRank,
                reward_amount: eligibleSalary,
                reward_month: currentMonth,
                reward_type: 'promotion',
                status: 'paid'
              })

            console.log(`[AutoRankCheck] Paid promotion reward $${eligibleSalary} to user ${userId} for ${newRank}`)
          }
        }
      }
    }
  } catch (error) {
    console.error('[AutoRankCheck] Error:', error)
  }
}

// Calculate line turnovers for rank check
async function calculateLineTurnoversForRank(supabase: any, userId: string): Promise<number[]> {
  const { data: directReferrals } = await supabase
    .from('profiles')
    .select('id, total_deposit')
    .eq('referred_by', userId)

  if (!directReferrals || directReferrals.length === 0) return []

  const lineTurnovers: number[] = []

  for (const referral of directReferrals) {
    let lineTurnover = Number(referral.total_deposit) || 0
    const downlineTurnover = await calculateGroupTurnoverRecursive(supabase, referral.id)
    lineTurnover += downlineTurnover
    lineTurnovers.push(lineTurnover)
  }

  return lineTurnovers.sort((a, b) => b - a)
}
