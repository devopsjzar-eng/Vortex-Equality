import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

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

async function sendPinOtp(email: string, otpCode: string) {
  if (!process.env.RESEND_API_KEY) return

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'Vortex Equality <noreply@vortex-equality.com>',
    to: email,
    subject: 'Withdrawal PIN OTP - Vortex Equality',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color:#111827;">Withdrawal PIN Verification</h2>
        <p style="color:#4b5563;">Use this OTP to reset or change your 6-digit withdrawal PIN.</p>
        <div style="margin:24px 0; padding:20px; border-radius:12px; background:#111827; color:white; text-align:center; font-size:32px; letter-spacing:8px; font-weight:700;">
          ${otpCode}
        </div>
        <p style="color:#6b7280; font-size:14px;">This code expires in 15 minutes. Do not share it with anyone.</p>
      </div>
    `,
  })
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

      try {
        await sendPinOtp(email, otpCode)
      } catch (emailError) {
        console.error('Failed to send PIN OTP:', emailError)
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
