import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { sendWithdrawalPinOTPEmail } from '@/lib/email'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase admin credentials are not configured')
  }

  return createSupabaseAdminClient(url, key)
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}


export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data } = await supabase
      .from('user_security_settings')
      .select('withdrawal_pin_set_at')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      pinSet: Boolean(data?.withdrawal_pin_set_at),
      withdrawalPinSetAt: data?.withdrawal_pin_set_at || null,
    })
  } catch (error) {
    console.error('Withdrawal PIN status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const action = body.action
    const admin = getSupabaseAdmin()
    const email = user.email.toLowerCase()

    if (action === 'send_otp') {
      const otpCode = generateOTP()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

      await admin
        .from('password_reset_otps')
        .upsert({
          email,
          otp: otpCode,
          otp_code: otpCode,
          purpose: 'withdrawal_pin',
          expires_at: expiresAt.toISOString(),
          used: false,
        }, { onConflict: 'email,purpose' })

      const emailResult = await sendWithdrawalPinOTPEmail(email, otpCode)
      if (!emailResult.success) {
        console.error('[WithdrawalPin] Email failed:', emailResult.error)
        return NextResponse.json({ error: 'Failed to send OTP email. Please try again.' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'OTP sent to your email.',
      })
    }

    if (action === 'reset_pin') {
      const otp = String(body.otp || '').trim()
      const newPin = String(body.newPin || '').trim()

      if (!/^\d{6}$/.test(otp)) {
        return NextResponse.json({ error: 'A valid 6-digit OTP is required' }, { status: 400 })
      }

      if (!/^\d{6}$/.test(newPin)) {
        return NextResponse.json({ error: 'Withdrawal PIN must be exactly 6 digits' }, { status: 400 })
      }

      const { data: otpRecord, error: otpError } = await admin
        .from('password_reset_otps')
        .select('*')
        .eq('email', email)
        .eq('otp_code', otp)
        .eq('purpose', 'withdrawal_pin')
        .eq('used', false)
        .maybeSingle()

      if (otpError || !otpRecord) {
        return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 })
      }

      if (new Date(otpRecord.expires_at) < new Date()) {
        return NextResponse.json({ error: 'OTP code has expired. Please request a new one.' }, { status: 400 })
      }

      const { error: pinError } = await admin.rpc('set_withdrawal_pin_hash', {
        p_user_id: user.id,
        p_pin: newPin,
      })

      if (pinError) {
        return NextResponse.json({ error: pinError.message || 'Failed to update withdrawal PIN' }, { status: 400 })
      }

      await admin
        .from('password_reset_otps')
        .update({ used: true })
        .eq('email', email)
        .eq('purpose', 'withdrawal_pin')

      return NextResponse.json({
        success: true,
        message: 'Withdrawal PIN updated successfully.',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Withdrawal PIN error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
