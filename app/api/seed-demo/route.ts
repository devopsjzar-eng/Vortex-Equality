import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This endpoint creates a demo user for testing
// Uses service role key to bypass RLS
export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    )
  }

  // Create admin client with service role key
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Check if demo user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const demoUser = existingUser?.users?.find(u => u.email === 'demo@vortex.com')

    let userId: string

    if (demoUser) {
      userId = demoUser.id
      // Update password to ensure it's correct
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: 'demo123456',
        email_confirm: true
      })
    } else {
      // Create demo user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'demo@vortex.com',
        password: 'demo123456',
        email_confirm: true,
        user_metadata: {
          full_name: 'Demo User',
          is_admin: false
        }
      })

      if (createError) {
        console.error('Error creating user:', createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      userId = newUser.user.id
    }

    // Check if profile exists (created by trigger)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile) {
      // Profile should be created by trigger, but if not, create manually
      return NextResponse.json({ 
        error: 'Profile not created. Trigger may have failed.',
        userId 
      }, { status: 500 })
    }

    // Update demo user wallet with sample balance
    await supabaseAdmin
      .from('wallets')
      .update({ 
        balance: 5000.00,
        initial_capital: 5000.00,
        total_profit_earned: 850.00
      })
      .eq('user_id', userId)
      .eq('wallet_type', 'asset')

    await supabaseAdmin
      .from('wallets')
      .update({ balance: 250.00 })
      .eq('user_id', userId)
      .eq('wallet_type', 'bonus')

    // Update profile with sample data
    await supabaseAdmin
      .from('profiles')
      .update({
        total_deposit: 5000.00,
        total_direct_referrals: 3,
        group_turnover: 15000.00,
        booster_percentage: 0.6,
        rank: 'P2'
      })
      .eq('id', userId)

    // Add sample transactions
    const transactions = [
      {
        user_id: userId,
        wallet_type: 'asset',
        type: 'deposit',
        amount: 5000.00,
        fee: 0,
        net_amount: 5000.00,
        status: 'success',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: userId,
        wallet_type: 'asset',
        type: 'profit_claim',
        amount: 82.50,
        fee: 0,
        net_amount: 82.50,
        status: 'success',
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: userId,
        wallet_type: 'asset',
        type: 'profit_claim',
        amount: 71.00,
        fee: 0,
        net_amount: 71.00,
        status: 'success',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: userId,
        wallet_type: 'bonus',
        type: 'referral_bonus',
        amount: 150.00,
        fee: 0,
        net_amount: 150.00,
        status: 'success',
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: userId,
        wallet_type: 'bonus',
        type: 'rank_reward',
        amount: 100.00,
        fee: 0,
        net_amount: 100.00,
        status: 'success',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    // Clear existing transactions for demo user
    await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('user_id', userId)

    // Insert new transactions
    await supabaseAdmin
      .from('transactions')
      .insert(transactions)

    return NextResponse.json({ 
      success: true, 
      message: 'Demo account ready!',
      email: 'demo@vortex.com',
      password: 'demo123456'
    })

  } catch (error: unknown) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
