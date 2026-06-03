import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// TEST ENDPOINT - Simulate Now Payments webhook untuk test deposit otomatis

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()

    console.log('[v0] TEST WEBHOOK - Body received:', body)

    // Test case: Simulate finished payment from Now Payments
    const paymentId = body.payment_id || 'test-payment-123'
    const externalId = body.external_id || 'test-ext-456'

    // Get transaction from external_ref
    const { data: transaction } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('external_ref', externalId)
      .single()

    console.log('[v0] TEST - Found transaction:', transaction)

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found', external_id: externalId },
        { status: 404 }
      )
    }

    // Check current status
    if (transaction.status === 'success') {
      return NextResponse.json({
        message: 'Transaction already processed',
        transaction_id: transaction.id,
      })
    }

    // UPDATE STATUS TO SUCCESS
    const { error: updateError } = await supabaseAdmin
      .from('transactions')
      .update({
        status: 'success',
        payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id)

    console.log('[v0] TEST - Update status result:', updateError)

    // GET WALLET AND CREDIT BALANCE
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', transaction.user_id)
      .eq('wallet_type', 'asset')
      .single()

    console.log('[v0] TEST - Wallet before credit:', wallet)

    if (wallet) {
      const newBalance = (wallet.balance || 0) + transaction.amount

      const { error: walletError } = await supabaseAdmin
        .from('wallets')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id)

      console.log('[v0] TEST - Wallet update result:', walletError)
    }

    // GET PROFILE AND UPDATE TOTAL_DEPOSIT
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', transaction.user_id)
      .single()

    console.log('[v0] TEST - Profile:', profile)

    if (profile) {
      const newTotalDeposit = (profile.total_deposit || 0) + transaction.amount

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          total_deposit: newTotalDeposit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.user_id)

      console.log('[v0] TEST - Profile update result:', profileError)

      // NOW TRIGGER BONUS SPONSOR - Level 1, 2, 3
      if (profile.referred_by) {
        console.log('[v0] TEST - Processing sponsor bonus...')

        // LEVEL 1 BONUS (8%)
        const level1Bonus = transaction.amount * 0.08

        const { data: level1Sponsor } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', profile.referred_by)
          .single()

        if (level1Sponsor) {
          // Create bonus transaction
          await supabaseAdmin
            .from('transactions')
            .insert({
              user_id: level1Sponsor.id,
              wallet_type: 'bonus',
              type: 'referral_bonus',
              amount: level1Bonus,
              fee: 0,
              net_amount: level1Bonus,
              status: 'success',
              admin_notes: `Level 1 sponsor bonus (8%) from deposit $${transaction.amount.toFixed(2)}`,
              external_ref: `BONUS-L1-${Date.now()}`,
            })

          // Credit bonus wallet
          const { data: bonusWallet } = await supabaseAdmin
            .from('wallets')
            .select('*')
            .eq('user_id', level1Sponsor.id)
            .eq('wallet_type', 'bonus')
            .single()

          if (bonusWallet) {
            await supabaseAdmin
              .from('wallets')
              .update({
                balance: (bonusWallet.balance || 0) + level1Bonus,
              })
              .eq('id', bonusWallet.id)
          }

          console.log('[v0] TEST - Level 1 bonus ($' + level1Bonus.toFixed(2) + ') credited to:', level1Sponsor.id)
        }

        // LEVEL 2 BONUS (5%)
        if (level1Sponsor) {
          const { data: level2Sponsor } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', level1Sponsor.id)
            .single()

          const level2Bonus = transaction.amount * 0.05

          if (level2Sponsor?.id) {
            const { data: sponsor2 } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('id', level2Sponsor.id)
              .single()

            if (sponsor2) {
              await supabaseAdmin
                .from('transactions')
                .insert({
                  user_id: sponsor2.id,
                  wallet_type: 'bonus',
                  type: 'referral_bonus',
                  amount: level2Bonus,
                  fee: 0,
                  net_amount: level2Bonus,
                  status: 'success',
                  admin_notes: `Level 2 sponsor bonus (5%) from deposit $${transaction.amount.toFixed(2)}`,
                  external_ref: `BONUS-L2-${Date.now()}`,
                })

              const { data: bonusWallet2 } = await supabaseAdmin
                .from('wallets')
                .select('*')
                .eq('user_id', sponsor2.id)
                .eq('wallet_type', 'bonus')
                .single()

              if (bonusWallet2) {
                await supabaseAdmin
                  .from('wallets')
                  .update({
                    balance: (bonusWallet2.balance || 0) + level2Bonus,
                  })
                  .eq('id', bonusWallet2.id)
              }

              console.log('[v0] TEST - Level 2 bonus ($' + level2Bonus.toFixed(2) + ') credited')
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook test processed successfully',
      transaction_id: transaction.id,
      amount: transaction.amount,
      status: 'success',
      bonus_triggered: profile?.referred_by ? true : false,
    })
  } catch (error) {
    console.error('[v0] TEST WEBHOOK ERROR:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
