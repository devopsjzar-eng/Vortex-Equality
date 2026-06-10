import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function normalizeCoin(value: unknown) {
  const coin = String(value || 'USDT_TRC20').trim().toUpperCase()
  return coin || 'USDT_TRC20'
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

    const { data: wallet, error } = await supabase
      .from('user_crypto_wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, wallet })
  } catch (error) {
    console.error('Get crypto wallet error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const walletAddress = String(body.walletAddress || '').trim()
    const coin = normalizeCoin(body.coin)

    if (!walletAddress || walletAddress.length < 20) {
      return NextResponse.json({ error: 'Please enter a valid crypto wallet address' }, { status: 400 })
    }

    const { data: wallet, error } = await supabase
      .from('user_crypto_wallets')
      .upsert(
        {
          user_id: user.id,
          wallet_address: walletAddress,
          coin,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, wallet })
  } catch (error) {
    console.error('Save crypto wallet error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
