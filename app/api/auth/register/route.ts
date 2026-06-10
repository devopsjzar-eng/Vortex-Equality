import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// Create Supabase Admin client (lazy initialization)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { email, password, fullName, username, referralCode, withdrawalPin } = await request.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const normalizedUsername = String(username || '').trim().toLowerCase()

    // Validate input
    if (!normalizedEmail || !password || !fullName || !normalizedUsername || !withdrawalPin) {
      return NextResponse.json(
        { error: 'Email, username, password, full name, and withdrawal PIN are required' },
        { status: 400 }
      )
    }

    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
      return NextResponse.json(
        { error: 'Username must be 3-24 characters using letters, numbers, or underscores only' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    if (!/^\d{6}$/.test(String(withdrawalPin))) {
      return NextResponse.json(
        { error: 'Withdrawal PIN must be exactly 6 digits' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered. Please login instead.' },
        { status: 400 }
      )
    }

    const { data: existingUsername } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', normalizedUsername)
      .maybeSingle()

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username is already taken. Please choose another username.' },
        { status: 400 }
      )
    }

    let referrerId: string | null = null

    // Validate referral code exists if provided
    if (referralCode) {
      const lockedSponsor = String(referralCode).trim()
      const { data: referrerByCode } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('referral_code', lockedSponsor)
        .maybeSingle()

      const { data: referrerByUsername } = referrerByCode
        ? { data: null }
        : await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('username', lockedSponsor.toLowerCase())
            .maybeSingle()

      const referrer = referrerByCode || referrerByUsername
      
      if (!referrer) {
        return NextResponse.json(
          { error: 'Invalid referral code' },
          { status: 400 }
        )
      }

      referrerId = referrer.id
    }

    // Create user with admin API - this bypasses email confirmation
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username: normalizedUsername,
        referred_by: referralCode,
        phone: '',
      },
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    const referralPrefix = normalizedUsername.replace(/[^a-z0-9]/g, '').slice(0, 10).toUpperCase() || 'VX'
    const referralSuffix = authData.user.id.replace(/-/g, '').slice(0, 6).toUpperCase()
    const generatedReferralCode = `${referralPrefix}${referralSuffix}`
    const passwordHash = await bcrypt.hash(password, 12)

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: normalizedEmail,
        username: normalizedUsername,
        full_name: String(fullName).trim(),
        referral_code: generatedReferralCode,
        referred_by: referrerId,
        rank: 'Bronze',
        password_hash: passwordHash,
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: profileError.message || 'Failed to create profile' },
        { status: 400 }
      )
    }

    await supabaseAdmin
      .from('wallets')
      .upsert([
        { user_id: authData.user.id, wallet_type: 'asset' },
        { user_id: authData.user.id, wallet_type: 'bonus' },
      ], { onConflict: 'user_id,wallet_type' })

    await supabaseAdmin
      .from('referral_edges')
      .upsert({
        user_id: authData.user.id,
        sponsor_id: referrerId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    await supabaseAdmin.rpc('ensure_financial_wallet', {
      p_user_id: authData.user.id,
    })

    const { error: pinError } = await supabaseAdmin.rpc('set_withdrawal_pin_hash', {
      p_user_id: authData.user.id,
      p_pin: String(withdrawalPin),
    })

    if (pinError) {
      console.error('Error setting withdrawal PIN:', pinError)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: pinError.message || 'Failed to set withdrawal PIN' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now login.',
      userId: authData.user.id,
      referralCode: generatedReferralCode,
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
