import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { sendOTPEmail } from '@/lib/email'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase credentials not configured')
  }
  return createClient(url, key)
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { email, otp, newPassword, action } = body

    // Send OTP
    if (action === 'send_otp') {
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 })
      }

      // Check if user exists
      const { data: user, error: userError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email.toLowerCase())
        .single()

      if (userError || !user) {
        // Don't reveal if email exists or not for security
        return NextResponse.json({ 
          success: true,
          message: 'If an account exists with this email, an OTP will be sent.' 
        })
      }

      // Generate OTP
      const otpCode = generateOTP()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      // Store OTP in database
      await supabaseAdmin
        .from('password_reset_otps')
        .upsert({
          email: email.toLowerCase(),
          otp: otpCode,
          otp_code: otpCode,
          purpose: 'password_reset',
          expires_at: expiresAt.toISOString(),
          used: false
        }, { onConflict: 'email,purpose' })

      const emailResult = await sendOTPEmail(email, otpCode)
      if (!emailResult.success) {
        console.error('[ForgotPassword] Email failed:', emailResult.error)
        return NextResponse.json({ error: 'Failed to send OTP email. Please try again.' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        message: 'OTP sent to your email' 
      })
    }

    // Verify OTP
    if (action === 'verify_otp') {
      if (!email || !otp) {
        return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
      }

      const { data: otpRecord, error: otpError } = await supabaseAdmin
        .from('password_reset_otps')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('otp_code', otp)
        .eq('purpose', 'password_reset')
        .eq('used', false)
        .single()

      if (otpError || !otpRecord) {
        return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 })
      }

      // Check if OTP is expired
      if (new Date(otpRecord.expires_at) < new Date()) {
        return NextResponse.json({ error: 'OTP code has expired. Please request a new one.' }, { status: 400 })
      }

      return NextResponse.json({ 
        success: true,
        message: 'OTP verified successfully' 
      })
    }

    // Reset Password
    if (action === 'reset_password') {
      if (!email || !otp || !newPassword) {
        return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
      }

      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      }

      // Verify OTP again
      const { data: otpRecord, error: otpError } = await supabaseAdmin
        .from('password_reset_otps')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('otp_code', otp)
        .eq('purpose', 'password_reset')
        .eq('used', false)
        .single()

      if (otpError || !otpRecord) {
        return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
      }

      if (new Date(otpRecord.expires_at) < new Date()) {
        return NextResponse.json({ error: 'OTP has expired' }, { status: 400 })
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12)

      // Update password in profiles table
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ password_hash: hashedPassword })
        .eq('email', email.toLowerCase())

      if (updateError) {
        console.error('Password update error:', updateError)
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
      }

      // Mark OTP as used
      await supabaseAdmin
        .from('password_reset_otps')
        .update({ used: true })
        .eq('email', email.toLowerCase())
        .eq('purpose', 'password_reset')

      // Also update Supabase Auth if using it
      try {
        const { data: user } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .single()

        if (user) {
          await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: newPassword
          })
        }
      } catch (authError) {
        // Ignore auth errors if not using Supabase Auth
        console.log('Auth update skipped:', authError)
      }

      return NextResponse.json({ 
        success: true,
        message: 'Password reset successfully' 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
