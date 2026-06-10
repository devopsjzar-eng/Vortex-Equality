import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withdrawalRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success: rateLimitOk, reset } = await withdrawalRateLimit.limit(user.id)
    if (!rateLimitOk) {
      return rateLimitResponse(reset)
    }

    const body = await request.json()
    const amount = Number(body.amount)
    const cryptoAddress = String(body.cryptoAddress || '').trim()
    const cryptoNetwork = body.cryptoNetwork || 'BEP20'
    const walletType = body.walletType || 'main'
    const withdrawalPin = String(body.withdrawalPin || '').trim()

    if (!Number.isFinite(amount) || amount < 10) {
      return NextResponse.json({ error: 'Minimum withdrawal amount is $10' }, { status: 400 })
    }

    if (!cryptoAddress) {
      return NextResponse.json({ error: 'Crypto address is required' }, { status: 400 })
    }

    if (!/^\d{6}$/.test(withdrawalPin)) {
      return NextResponse.json({ error: 'A valid 6-digit withdrawal PIN is required' }, { status: 400 })
    }

    const { data: isPinValid, error: pinError } = await supabase.rpc('verify_withdrawal_pin', {
      p_user_id: user.id,
      p_pin: withdrawalPin,
    })

    if (pinError) {
      return NextResponse.json({ error: pinError.message || 'Failed to verify withdrawal PIN' }, { status: 400 })
    }

    if (!isPinValid) {
      return NextResponse.json({ error: 'Invalid withdrawal PIN' }, { status: 400 })
    }

    await supabase
      .from('user_crypto_wallets')
      .upsert(
        {
          user_id: user.id,
          wallet_address: cryptoAddress,
          coin: String(cryptoNetwork || 'USDT_TRC20').toUpperCase(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    const { data: withdrawal, error } = await supabase.rpc('request_withdrawal', {
      p_gross_amount: amount,
      p_wallet_address: cryptoAddress,
      p_metadata: {
        source: 'api',
        walletType,
        cryptoNetwork,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to create withdrawal' }, { status: 400 })
    }

    if (!withdrawal) {
      return NextResponse.json({ error: 'Failed to create withdrawal' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      withdrawal,
      transaction: {
        id: withdrawal.id,
        amount: Number(withdrawal.gross_amount),
        fee: Number(withdrawal.fee_amount),
        feePercentage: Number(withdrawal.fee_percentage),
        netAmount: Number(withdrawal.net_amount),
        status: withdrawal.status,
        message: 'Withdrawal request submitted for admin review.',
      },
    })
  } catch (error) {
    console.error('Withdrawal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: withdrawals, error } = await supabase
      .from('financial_withdrawals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals || [],
    })
  } catch (error) {
    console.error('Get withdrawals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
