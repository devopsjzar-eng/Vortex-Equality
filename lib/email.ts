import nodemailer from 'nodemailer'

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com'
  const port = Number(process.env.SMTP_PORT || 465)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!user || !pass) {
    console.warn('[Email] SMTP_USER or SMTP_PASS not configured — emails will not be sent')
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

const FROM_ADDRESS = process.env.SMTP_FROM || 'Vortex Equality <1@vortexequality.com>'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'vortex2026saham@gmail.com'

async function sendMail(options: { to: string; subject: string; html: string }) {
  const transporter = createTransporter()
  if (!transporter) return { success: false, error: 'Email service not configured' }

  try {
    await transporter.sendMail({ from: FROM_ADDRESS, ...options })
    console.log('[Email] Sent to:', options.to)
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Email] Send failed:', message)
    return { success: false, error: message }
  }
}

export async function sendOTPEmail(email: string, otp: string) {
  return sendMail({
    to: email,
    subject: 'Password Reset OTP — Vortex Equality',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f4f4f5;">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
          <div style="background:linear-gradient(135deg,#1e3a5f 0%,#0f172a 100%);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:28px;font-weight:700;">VORTEX EQUALITY</h1>
            <p style="color:#93c5fd;margin:8px 0 0;font-size:14px;">Premium Investment Platform</p>
          </div>
          <div style="background:white;padding:40px 32px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,.1);">
            <h2 style="color:#1e293b;margin:0 0 16px;">Password Reset Request</h2>
            <p style="color:#64748b;margin:0 0 24px;line-height:1.6;">Use the OTP code below to reset your password. It expires in <strong>15 minutes</strong>.</p>
            <div style="background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
              <p style="color:rgba(255,255,255,.8);margin:0 0 8px;font-size:14px;">Your OTP Code</p>
              <p style="color:white;margin:0;font-size:40px;font-weight:700;letter-spacing:8px;font-family:monospace;">${otp}</p>
            </div>
            <div style="background:#fef3c7;border-radius:8px;padding:16px;margin:24px 0;">
              <p style="color:#92400e;margin:0;font-size:14px;"><strong>Important:</strong> Do not share this code with anyone.</p>
            </div>
            <p style="color:#64748b;font-size:14px;">If you did not request a password reset, ignore this email.</p>
          </div>
          <p style="color:#94a3b8;text-align:center;font-size:12px;padding:24px 0;">© 2025 Vortex Equality. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  })
}

export async function sendWithdrawalPinOTPEmail(email: string, otp: string) {
  return sendMail({
    to: email,
    subject: 'Withdrawal PIN OTP — Vortex Equality',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f4f4f5;">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
          <div style="background:linear-gradient(135deg,#1e3a5f 0%,#0f172a 100%);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:28px;font-weight:700;">VORTEX EQUALITY</h1>
            <p style="color:#93c5fd;margin:8px 0 0;font-size:14px;">Premium Investment Platform</p>
          </div>
          <div style="background:white;padding:40px 32px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,.1);">
            <h2 style="color:#1e293b;margin:0 0 16px;">Withdrawal PIN Verification</h2>
            <p style="color:#64748b;margin:0 0 24px;line-height:1.6;">Use this OTP to set or change your 6-digit withdrawal PIN. It expires in <strong>15 minutes</strong>.</p>
            <div style="background:linear-gradient(135deg,#d97706 0%,#92400e 100%);border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
              <p style="color:rgba(255,255,255,.8);margin:0 0 8px;font-size:14px;">Your OTP Code</p>
              <p style="color:white;margin:0;font-size:40px;font-weight:700;letter-spacing:8px;font-family:monospace;">${otp}</p>
            </div>
            <div style="background:#fef3c7;border-radius:8px;padding:16px;margin:24px 0;">
              <p style="color:#92400e;margin:0;font-size:14px;"><strong>Important:</strong> Do not share this code with anyone.</p>
            </div>
            <p style="color:#64748b;font-size:14px;">If you did not request this, contact support immediately.</p>
          </div>
          <p style="color:#94a3b8;text-align:center;font-size:12px;padding:24px 0;">© 2025 Vortex Equality. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  })
}

export async function sendAdminDepositNotification(
  memberName: string,
  memberEmail: string,
  amount: number,
  method = 'Crypto'
) {
  return sendMail({
    to: ADMIN_EMAIL,
    subject: `[DEPOSIT] ${memberName} — $${amount.toFixed(2)}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#1a1a2e;padding:20px;border-radius:10px;">
          <h2 style="color:#4CAF50;margin-top:0;">New Deposit Received</h2>
          <table style="width:100%;color:#fff;">
            <tr><td style="padding:8px 0;color:#999;">Member:</td><td style="padding:8px 0;font-weight:bold;">${memberName}</td></tr>
            <tr><td style="padding:8px 0;color:#999;">Email:</td><td style="padding:8px 0;">${memberEmail}</td></tr>
            <tr><td style="padding:8px 0;color:#999;">Amount:</td><td style="padding:8px 0;font-weight:bold;color:#4CAF50;font-size:22px;">$${amount.toFixed(2)}</td></tr>
            <tr><td style="padding:8px 0;color:#999;">Method:</td><td style="padding:8px 0;">${method}</td></tr>
            <tr><td style="padding:8px 0;color:#999;">Time:</td><td style="padding:8px 0;">${new Date().toLocaleString()}</td></tr>
          </table>
        </div>
      </div>
    `,
  })
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
  return sendMail({
    to: ADMIN_EMAIL,
    subject: `[WITHDRAWAL] ${memberName} — $${netAmount.toFixed(2)}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#1a1a2e;padding:20px;border-radius:10px;">
          <h2 style="color:#FF9800;margin-top:0;">Withdrawal Request — Action Required</h2>
          <table style="width:100%;color:#fff;">
            <tr><td style="padding:8px 0;color:#999;">Member:</td><td style="padding:8px 0;font-weight:bold;">${memberName}</td></tr>
            <tr><td style="padding:8px 0;color:#999;">Email:</td><td style="padding:8px 0;">${memberEmail}</td></tr>
            <tr><td style="padding:8px 0;color:#999;">Wallet Type:</td><td style="padding:8px 0;">${walletType.toUpperCase()}</td></tr>
            <tr><td style="padding:8px 0;color:#999;">Gross Amount:</td><td style="padding:8px 0;">$${amount.toFixed(2)}</td></tr>
            <tr><td style="padding:8px 0;color:#999;">Fee:</td><td style="padding:8px 0;color:#f44336;">-$${fee.toFixed(2)}</td></tr>
            <tr><td style="padding:8px 0;color:#999;">Net Amount:</td><td style="padding:8px 0;font-weight:bold;color:#FF9800;font-size:22px;">$${netAmount.toFixed(2)}</td></tr>
            <tr><td style="padding:8px 0;color:#999;">Wallet:</td><td style="padding:8px 0;font-family:monospace;font-size:12px;word-break:break-all;">${walletAddress}</td></tr>
            <tr><td style="padding:8px 0;color:#999;">Time:</td><td style="padding:8px 0;">${new Date().toLocaleString()}</td></tr>
          </table>
        </div>
      </div>
    `,
  })
}
