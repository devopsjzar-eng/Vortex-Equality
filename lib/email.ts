import { Resend } from 'resend'

// Lazy initialization - only create client when needed
let resendClient: Resend | null = null

function getResend() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.warn('[Email] RESEND_API_KEY not configured - emails will not be sent')
      return null
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

const ADMIN_EMAIL = 'vortex2026saham@gmail.com'
const FROM_EMAIL = 'Vortex Equality <noreply@vortexequality.com>'

// Fallback if domain not verified yet
const FROM_EMAIL_FALLBACK = 'onboarding@resend.dev'

function getFromEmail() {
  // Use fallback if custom domain not verified
  return process.env.RESEND_DOMAIN_VERIFIED === 'true' ? FROM_EMAIL : FROM_EMAIL_FALLBACK
}

export async function sendOTPEmail(email: string, otp: string) {
  const resend = getResend()
  if (!resend) {
    console.warn('[Email] Resend not configured - skipping OTP email')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: email,
      subject: 'Vortex Equality - Kode Reset Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #D4AF37; margin: 0;">VORTEX EQUALITY</h1>
            <p style="color: #666; margin-top: 5px;">Secure Investment Platform</p>
          </div>
          
          <div style="background: #1a1a2e; padding: 30px; border-radius: 10px; text-align: center;">
            <h2 style="color: #fff; margin-top: 0;">Reset Password</h2>
            <p style="color: #ccc;">Gunakan kode OTP berikut untuk reset password Anda:</p>
            
            <div style="background: #D4AF37; color: #000; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 8px; display: inline-block; margin: 20px 0;">
              ${otp}
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 20px;">
              Kode ini akan kadaluarsa dalam 10 menit.<br>
              Jangan bagikan kode ini kepada siapapun.
            </p>
          </div>
          
          <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
            Jika Anda tidak meminta reset password, abaikan email ini.<br>
            &copy; 2024 Vortex Equality. All rights reserved.
          </p>
        </div>
      `
    })

    if (error) {
      console.error('[Email] OTP send error:', error)
      return { success: false, error: error.message }
    }

    console.log('[Email] OTP sent successfully to:', email)
    return { success: true, data }
  } catch (err) {
    console.error('[Email] OTP exception:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

export async function sendAdminDepositNotification(
  memberName: string,
  memberEmail: string,
  amount: number,
  method: string = 'Crypto'
) {
  const resend = getResend()
  if (!resend) {
    console.warn('[Email] Resend not configured - skipping deposit notification')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: ADMIN_EMAIL,
      subject: `[DEPOSIT] ${memberName} - $${amount}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1a1a2e; padding: 20px; border-radius: 10px;">
            <h2 style="color: #4CAF50; margin-top: 0;">New Deposit Received</h2>
            
            <table style="width: 100%; color: #fff;">
              <tr>
                <td style="padding: 10px 0; color: #999;">Member:</td>
                <td style="padding: 10px 0; font-weight: bold;">${memberName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #999;">Email:</td>
                <td style="padding: 10px 0;">${memberEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #999;">Amount:</td>
                <td style="padding: 10px 0; font-weight: bold; color: #4CAF50; font-size: 24px;">$${amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #999;">Method:</td>
                <td style="padding: 10px 0;">${method}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #999;">Time:</td>
                <td style="padding: 10px 0;">${new Date().toLocaleString('id-ID', { timeZone: 'Europe/Madrid' })}</td>
              </tr>
            </table>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
              <a href="https://vortexequality.com/vx-ctrl-9f2a/deposits" 
                 style="background: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                View in Admin Panel
              </a>
            </div>
          </div>
        </div>
      `
    })

    if (error) {
      console.error('[Email] Admin deposit notification error:', error)
      return { success: false, error: error.message }
    }

    console.log('[Email] Admin deposit notification sent')
    return { success: true, data }
  } catch (err) {
    console.error('[Email] Admin deposit exception:', err)
    return { success: false, error: 'Failed to send notification' }
  }
}

export async function sendAdminWithdrawalNotification(
  memberName: string,
  memberEmail: string,
  amount: number,
  fee: number,
  netAmount: number,
  walletType: string,
  walletAddress: string
) {
  const resend = getResend()
  if (!resend) {
    console.warn('[Email] Resend not configured - skipping withdrawal notification')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: ADMIN_EMAIL,
      subject: `[WITHDRAWAL REQUEST] ${memberName} - $${netAmount}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1a1a2e; padding: 20px; border-radius: 10px;">
            <h2 style="color: #FF9800; margin-top: 0;">Withdrawal Request - Action Required</h2>
            
            <table style="width: 100%; color: #fff;">
              <tr>
                <td style="padding: 10px 0; color: #999;">Member:</td>
                <td style="padding: 10px 0; font-weight: bold;">${memberName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #999;">Email:</td>
                <td style="padding: 10px 0;">${memberEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #999;">Wallet Type:</td>
                <td style="padding: 10px 0;">${walletType.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #999;">Gross Amount:</td>
                <td style="padding: 10px 0;">$${amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #999;">Fee:</td>
                <td style="padding: 10px 0; color: #f44336;">-$${fee.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #999;">Net Amount:</td>
                <td style="padding: 10px 0; font-weight: bold; color: #FF9800; font-size: 24px;">$${netAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #999;">Wallet Address:</td>
                <td style="padding: 10px 0; word-break: break-all; font-family: monospace; font-size: 12px;">${walletAddress}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #999;">Time:</td>
                <td style="padding: 10px 0;">${new Date().toLocaleString('id-ID', { timeZone: 'Europe/Madrid' })}</td>
              </tr>
            </table>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
              <a href="https://vortexequality.com/vx-ctrl-9f2a/withdrawals" 
                 style="background: #FF9800; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Process Withdrawal
              </a>
            </div>
          </div>
        </div>
      `
    })

    if (error) {
      console.error('[Email] Admin withdrawal notification error:', error)
      return { success: false, error: error.message }
    }

    console.log('[Email] Admin withdrawal notification sent')
    return { success: true, data }
  } catch (err) {
    console.error('[Email] Admin withdrawal exception:', err)
    return { success: false, error: 'Failed to send notification' }
  }
}
