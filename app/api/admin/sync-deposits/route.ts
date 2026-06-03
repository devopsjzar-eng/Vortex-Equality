import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Admin: manually sync a pending deposit to credit wallet
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { transactionId, userId, amount } = await request.json()

    if (!transactionId || !userId || !amount) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Credit wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, initial_capital')
      .eq('user_id', userId)
      .eq('wallet_type', 'asset')
      .single()

    if (walletError || !wallet) {
      // Create wallet if missing
      await supabaseAdmin.from('wallets').insert({
        user_id: userId, 
        wallet_type: 'asset',
        balance: amount, 
        initial_capital: amount, 
        total_profit_earned: 0, 
        cap_reached: false
      })
    } else {
      await supabaseAdmin.from('wallets').update({
        balance: Number(wallet.balance) + amount,
        initial_capital: Number(wallet.initial_capital) + amount,
        updated_at: new Date().toISOString()
      }).eq('id', wallet.id)
    }

    // Update transaction status
    await supabaseAdmin.from('transactions').update({
      status: 'success', 
      updated_at: new Date().toISOString()
    }).eq('id', transactionId)

    // Update profile total_deposit + RESET BOOSTER if TOP UP
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('total_deposit, booster_percentage')
      .eq('id', userId)
      .single()

    const existingDeposit = Number(profile?.total_deposit || 0)
    const isTopUp = existingDeposit > 0
    const currentBooster = Number(profile?.booster_percentage || 0)

    // Log if TOP UP with booster
    if (isTopUp && currentBooster > 0) {
      console.log(`[sync-deposits] TOP UP detected for user ${userId}. Resetting booster from ${currentBooster}% to 0%`)
    }

    await supabaseAdmin.from('profiles').update({
      total_deposit: existingDeposit + amount,
      // RESET BOOSTER if TOP UP
      booster_percentage: isTopUp ? 0 : currentBooster,
      updated_at: new Date().toISOString()
    }).eq('id', userId)

    return NextResponse.json({ 
      success: true, 
      message: `Credited $${amount} to wallet${isTopUp ? ' (booster reset)' : ''}` 
    })
  } catch (error) {
    console.error('[sync-deposits]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Admin: get all pending deposits
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('id, user_id, amount, status, external_ref, created_at, profiles:user_id(full_name, email)')
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ pending: data })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
