import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabaseAdmin = getSupabaseAdmin()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')

  if (!search) {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('type', 'admin_credit')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ results: data })
  }

  // Search by email or username
  const searchQuery = `%${search}%`
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name')
    .or(`email.ilike.${searchQuery},full_name.ilike.${searchQuery}`)
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ results: data })
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { userId, walletType, amount, reason, transferType = 'direct' } = await request.json()

    if (!userId || !walletType || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const creditAmount = parseFloat(amount)

    // STEP 1: Get or create wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('wallet_type', walletType)
      .single()

    if (walletError || !wallet) {
      const { error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({
          user_id: userId,
          wallet_type: walletType,
          balance: creditAmount,
          initial_capital: walletType === 'asset' ? creditAmount : 0,
          total_profit_earned: 0,
          cap_reached: false,
        })
      if (createError) {
        return NextResponse.json({ error: 'Failed to create wallet: ' + createError.message }, { status: 500 })
      }
    } else {
      const newBalance = parseFloat(wallet.balance) + creditAmount
      const newInitialCapital = walletType === 'asset'
        ? parseFloat(wallet.initial_capital || 0) + creditAmount
        : parseFloat(wallet.initial_capital || 0)

      const { error: updateError } = await supabaseAdmin
        .from('wallets')
        .update({
          balance: newBalance,
          initial_capital: newInitialCapital,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update wallet: ' + updateError.message }, { status: 500 })
      }
    }

    // STEP 2: Save transaction record as DEPOSIT (terlihat seperti deposit real untuk member)
    // Semua transfer admin disimpan sebagai type 'deposit' agar member tidak tahu perbedaannya
    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        wallet_type: walletType,
        type: 'deposit', // Selalu 'deposit' agar terlihat real untuk member
        amount: creditAmount,
        fee: 0,
        net_amount: creditAmount,
        status: 'success',
        admin_notes: '', // Kosong agar member tidak lihat ini dari admin
        external_ref: `DEP-${Date.now()}-${walletType.substring(0, 1).toUpperCase()}`, // Format seperti deposit: DEP-timestamp-A/B
      })

    if (txError) {
      console.error('[Credit] Transaction record error:', txError.message)
    }

    // STEP 3: Handle sponsor bonus if transferType is 'sponsor' or 'as_deposit'
    if ((transferType === 'sponsor' || transferType === 'as_deposit') && walletType === 'asset') {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('referred_by')
        .eq('id', userId)
        .single()

      if (profile && profile.referred_by) {
        // Calculate sponsor bonuses
        const level1Bonus = creditAmount * 0.08 // 8%
        const level2Bonus = creditAmount * 0.05 // 5%
        const level3Bonus = creditAmount * 0.02 // 2%

        // Get upline chain
        const { data: upline1 } = await supabaseAdmin
          .from('profiles')
          .select('id, referred_by')
          .eq('id', profile.referred_by)
          .single()

        // Level 1 bonus
        if (upline1) {
          const { data: upline1Wallet } = await supabaseAdmin
            .from('wallets')
            .select('*')
            .eq('user_id', upline1.id)
            .eq('wallet_type', 'bonus')
            .single()

          if (upline1Wallet) {
            await supabaseAdmin
              .from('wallets')
              .update({ balance: parseFloat(upline1Wallet.balance) + level1Bonus })
              .eq('id', upline1Wallet.id)
          }

          // Record bonus transaction
          await supabaseAdmin
            .from('transactions')
            .insert({
              user_id: upline1.id,
              wallet_type: 'bonus',
              type: 'sponsor_bonus',
              amount: level1Bonus,
              fee: 0,
              net_amount: level1Bonus,
              status: 'success',
              admin_notes: `Level 1 sponsor bonus from ${reason || 'admin credit'}`,
              external_ref: `SPONSOR-L1-${Date.now()}`,
            })

          // Level 2 bonus
          if (upline1.referred_by) {
            const { data: upline2 } = await supabaseAdmin
              .from('profiles')
              .select('id, referred_by')
              .eq('id', upline1.referred_by)
              .single()

            if (upline2) {
              const { data: upline2Wallet } = await supabaseAdmin
                .from('wallets')
                .select('*')
                .eq('user_id', upline2.id)
                .eq('wallet_type', 'bonus')
                .single()

              if (upline2Wallet) {
                await supabaseAdmin
                  .from('wallets')
                  .update({ balance: parseFloat(upline2Wallet.balance) + level2Bonus })
                  .eq('id', upline2Wallet.id)
              }

              await supabaseAdmin
                .from('transactions')
                .insert({
                  user_id: upline2.id,
                  wallet_type: 'bonus',
                  type: 'sponsor_bonus',
                  amount: level2Bonus,
                  fee: 0,
                  net_amount: level2Bonus,
                  status: 'success',
                  admin_notes: `Level 2 sponsor bonus from ${reason || 'admin credit'}`,
                  external_ref: `SPONSOR-L2-${Date.now()}`,
                })

              // Level 3 bonus
              if (upline2.referred_by) {
                const { data: upline3 } = await supabaseAdmin
                  .from('profiles')
                  .select('id')
                  .eq('id', upline2.referred_by)
                  .single()

                if (upline3) {
                  const { data: upline3Wallet } = await supabaseAdmin
                    .from('wallets')
                    .select('*')
                    .eq('user_id', upline3.id)
                    .eq('wallet_type', 'bonus')
                    .single()

                  if (upline3Wallet) {
                    await supabaseAdmin
                      .from('wallets')
                      .update({ balance: parseFloat(upline3Wallet.balance) + level3Bonus })
                      .eq('id', upline3Wallet.id)
                  }

                  await supabaseAdmin
                    .from('transactions')
                    .insert({
                      user_id: upline3.id,
                      wallet_type: 'bonus',
                      type: 'sponsor_bonus',
                      amount: level3Bonus,
                      fee: 0,
                      net_amount: level3Bonus,
                      status: 'success',
                      admin_notes: `Level 3 sponsor bonus from ${reason || 'admin credit'}`,
                      external_ref: `SPONSOR-L3-${Date.now()}`,
                    })
                }
              }
            }
          }
        }
      }
    }

    // STEP 4: Update profile total_deposit if asset wallet
    if (walletType === 'asset') {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('total_deposit')
        .eq('id', userId)
        .single()

      if (profile) {
        await supabaseAdmin
          .from('profiles')
          .update({ total_deposit: parseFloat(profile.total_deposit || 0) + creditAmount })
          .eq('id', userId)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Credit of $${creditAmount.toFixed(2)} applied successfully`,
      transferType,
      bonusCalculated: (transferType === 'sponsor' || transferType === 'as_deposit')
    })
  } catch (err) {
    console.error('[Credit] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process credit' },
      { status: 500 }
    )
  }
}
