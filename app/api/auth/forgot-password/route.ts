import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import bcrypt from 'bcryptjs'

// Lazy initialization to avoid build-time errors
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase credentials not configured')
  }
  return createClient(url, key)
}

function getResend() {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const resend = getResend()
    
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

      // Send email with OTP
      if (resend) {
        try {
          await resend.emails.send({
            from: 'Vortex Equality <noreply@vortex-equality.com>',
            to: email,
            subject: 'Password Reset OTP - Vortex Equality',
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Vortex Equality</h1>
                    <p style="color: #93c5fd; margin: 8px 0 0 0; font-size: 14px;">Premium Trading Investment Platform</p>
                  </div>
                  
                  <div style="background: white; padding: 40px 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 24px;">Password Reset Request</h2>
                    <p style="color: #64748b; margin: 0 0 24px 0; line-height: 1.6;">
                      Hello ${user.full_name || 'there'},<br><br>
                      You have requested to reset your password. Use the OTP code below to proceed:
                    </p>
                    
                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                      <p style="color: rgba(255,255,255,0.8); margin: 0 0 8px 0; font-size: 14px;">Your OTP Code</p>
                      <p style="color: white; margin: 0; font-size: 40px; font-weight: 700; letter-spacing: 8px; font-family: monospace;">${otpCode}</p>
                    </div>
                    
                    <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
                      <p style="color: #92400e; margin: 0; font-size: 14px;">
                        <strong>Important:</strong> This code will expire in 15 minutes. Do not share this code with anyone.
                      </p>
                    </div>
                    
                    <p style="color: #64748b; margin: 24px 0 0 0; font-size: 14px; line-height: 1.6;">
                      If you did not request this password reset, please ignore this email or contact support if you have concerns.
                    </p>
                  </div>
                  
                  <div style="text-align: center; padding: 24px;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      This is an automated email from Vortex Equality.<br>
                      Please do not reply to this email.
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `
          })
        } catch (emailError) {
          console.error('Failed to send email:', emailError)
        }
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
