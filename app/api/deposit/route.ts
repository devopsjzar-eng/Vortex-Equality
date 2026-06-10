import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { depositRateLimit, rateLimitResponse } from '@/lib/rate-limit'

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}

function getMinimumDepositUsd() {
  return Number(process.env.NEXT_PUBLIC_MIN_DEPOSIT_USD || process.env.MIN_DEPOSIT_USD || 50)
}

// POST - Create deposit. The active crypto checkout flow uses Plisio invoices.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting - 10 attempts per minute per user
    const { success: rateLimitOk, reset } = await depositRateLimit.limit(user.id)
    if (!rateLimitOk) {
      return rateLimitResponse(reset)
    }

    const body = await request.json()
    const { amount, cryptoType = 'USDT' } = body
    const minimumDeposit = getMinimumDepositUsd()

    // STRICT VALIDATION: Amount must be number and meet the configured minimum.
    if (!amount || isNaN(amount) || Number(amount) < minimumDeposit) {
      return NextResponse.json({ 
        error: `Minimum deposit amount is $${minimumDeposit}` 
      }, { status: 400 })
    }
    
    const depositAmount = Number(amount)
    
    // Additional safety: Cap deposit at reasonable max (prevent accidental huge transfers)
    if (depositAmount > 1000000) {
      return NextResponse.json({ 
        error: 'Deposit amount too large. Maximum is $1,000,000' 
      }, { status: 400 })
    }

    // Create pending deposit transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_type: 'asset',
        type: 'deposit',
        amount: depositAmount,
        fee: 0,
        net_amount: depositAmount,
        status: 'pending',
        external_ref: `DEP-${Date.now()}-${user.id.slice(0, 8)}`,
        admin_notes: `Deposit via ${cryptoType}`
      })
      .select()
      .single()

    if (txError) {
      return NextResponse.json({ error: 'Failed to create deposit' }, { status: 500 })
    }

    // TODO: Prefer /api/plisio/create-invoice for live Plisio payment details.
    // For now, return mock payment details
    const paymentDetails = {
      transactionId: transaction.id,
      amount: depositAmount,
      cryptoType: cryptoType,
      // This legacy route is kept for compatibility; Plisio generates the live address.
      paymentAddress: 'TBD - Generate a Plisio invoice from the deposit page',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    }

    return NextResponse.json({
      success: true,
      transaction: transaction,
      paymentDetails
    })

  } catch (error) {
    console.error('Deposit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Confirm deposit (called by webhook or admin)
export async function PUT(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { transactionId, externalRef } = body

    // Find pending transaction
    const { data: transaction } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('status', 'pending')
      .single()

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const finalExternalRef = externalRef || transaction.external_ref || transaction.id

    // Update transaction status
    await supabaseAdmin
      .from('transactions')
      .update({
        status: 'success',
        external_ref: finalExternalRef
      })
      .eq('id', transactionId)

    const { error: topUpError } = await supabaseAdmin.rpc('apply_user_top_up', {
      p_user_id: transaction.user_id,
      p_amount: Number(transaction.amount),
      p_source: 'manual-confirmation',
      p_external_id: finalExternalRef,
      p_metadata: {
        transactionId,
        confirmedBy: 'deposit-api',
      },
      p_referral_commission_percentage: 8,
    })

    if (topUpError) {
      return NextResponse.json({ error: topUpError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Deposit confirmed successfully'
    })

  } catch (error) {
    console.error('Confirm deposit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to distribute sponsor bonuses (IDEMPOTENT with database constraint)
async function distributeSponsorBonuses(
  supabase: any, 
  depositorId: string, 
  depositAmount: number,
  transactionId: string
) {
  // STRONG IDEMPOTENCY CHECK: Check if bonus already tracked in deposit_bonus_tracking table
  const { data: alreadyTracked } = await supabase
    .from('deposit_bonus_tracking')
    .select('id')
    .eq('deposit_transaction_id', transactionId)
    .single()

  if (alreadyTracked) {
    console.log(`[Sponsor Bonus] Bonus already distributed for transaction ${transactionId}. Skipping.`)
    return
  }

  const bonusRates = [
    { level: 1, rate: 8 },
    { level: 2, rate: 5 },
    { level: 3, rate: 2 }
  ]

  // Get depositor
  const { data: depositor } = await supabase
    .from('profiles')
    .select('referred_by, full_name')
    .eq('id', depositorId)
    .single()

  if (!depositor?.referred_by) {
    // Track this deposit even if no referrer (to prevent re-processing)
    await supabase
      .from('deposit_bonus_tracking')
      .insert({
        deposit_transaction_id: transactionId,
        depositor_id: depositorId,
        deposit_amount: depositAmount
      })
      .catch(() => {}) // Ignore if already exists (unique constraint)
    return
  }

  let currentReferrerId = depositor.referred_by

  for (const { level, rate } of bonusRates) {
    if (!currentReferrerId) break

    const { data: referrer } = await supabase
      .from('profiles')
      .select('id, referred_by, total_deposit')
      .eq('id', currentReferrerId)
      .single()

    if (!referrer) break

    // Only give bonus if referrer has active deposit
    if (referrer.total_deposit > 0) {
      const bonusAmount = (depositAmount * rate) / 100

      // Get bonus wallet
      const { data: bonusWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', referrer.id)
        .eq('wallet_type', 'bonus')
        .single()

      if (bonusWallet) {
        // Update bonus wallet
        await supabase
          .from('wallets')
          .update({ balance: bonusWallet.balance + bonusAmount })
          .eq('id', bonusWallet.id)

        // Create transaction
        await supabase
          .from('transactions')
          .insert({
            user_id: referrer.id,
            wallet_type: 'bonus',
            type: 'referral_bonus',
            amount: bonusAmount,
            fee: 0,
            net_amount: bonusAmount,
            status: 'success',
            admin_notes: `L${level} bonus (${rate}%) from ${depositor.full_name || 'member'}`,
            external_ref: `SPONSOR-L${level}-${Date.now()}`
          })
      }
    }

    currentReferrerId = referrer.referred_by
  }

  // IMPORTANT: Track this deposit in bonus tracking table
  // This uses UNIQUE constraint on deposit_transaction_id to prevent duplicates
  const { error: trackingError } = await supabase
    .from('deposit_bonus_tracking')
    .insert({
      deposit_transaction_id: transactionId,
      depositor_id: depositorId,
      deposit_amount: depositAmount
    })

  if (trackingError) {
    console.error(`[Sponsor Bonus] Failed to track deposit ${transactionId}:`, trackingError)
  } else {
    console.log(`[Sponsor Bonus] Successfully distributed and tracked for transaction ${transactionId}`)
  }
}

// Helper function to update booster percentage
async function updateReferrerBooster(
  supabase: any,
  referrerId: string,
  newMemberDeposit: number
) {
  const { data: referrer } = await supabase
    .from('profiles')
    .select('id, booster_percentage, booster_count')
    .eq('id', referrerId)
    .single()

  const { data: referrerWallet } = await supabase
    .from('wallets')
    .select('initial_capital')
    .eq('user_id', referrerId)
    .eq('wallet_type', 'asset')
    .single()

  if (!referrer || !referrerWallet) return

  // Check if new member deposit >= referrer's asset
  if (newMemberDeposit >= referrerWallet.initial_capital && referrer.booster_percentage < 3) {
    const newBoosterPercentage = Math.min(referrer.booster_percentage + 0.2, 3)
    
    await supabase
      .from('profiles')
      .update({
        booster_percentage: newBoosterPercentage,
        booster_count: referrer.booster_count + 1
      })
      .eq('id', referrerId)
  }
}

// Helper function to update upline ranks
async function updateUplineRanks(supabase: any, startUserId: string) {
  let currentUserId = startUserId
  const maxLevels = 5

  for (let i = 0; i < maxLevels; i++) {
    if (!currentUserId) break

    // Trigger rank check for this user
    // In production, this would call the rank/check API
    const { data: profile } = await supabase
      .from('profiles')
      .select('referred_by')
      .eq('id', currentUserId)
      .single()

    currentUserId = profile?.referred_by
  }
}
