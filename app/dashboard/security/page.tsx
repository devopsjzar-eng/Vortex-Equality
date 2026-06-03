'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { 
  Lock, 
  Shield, 
  Eye, 
  EyeOff, 
  Smartphone,
  Key,
  AlertTriangle,
  Check,
  History,
  Globe,
  Monitor,
  Mail,
  Loader2
} from 'lucide-react'

export default function SecurityPage() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [twoFactor, setTwoFactor] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [loginAlerts, setLoginAlerts] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || null)
      } else {
        // Demo mode
        setUserEmail('demo@vortex.com')
      }
    }
    getUser()
  }, [supabase])

  const handleSendOtp = async () => {
    if (!userEmail) {
      setMessage({ type: 'error', text: 'Unable to get user email' })
      return
    }

    setSendingOtp(true)
    setMessage(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, action: 'send_otp' })
      })
      const data = await res.json()

      if (data.success) {
        setOtpSent(true)
        setMessage({ type: 'success', text: 'OTP code sent to your email!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send OTP' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSendingOtp(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!otpSent || otp.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter the 6-digit OTP code sent to your email' })
      return
    }
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }
    if (passwords.new.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      // Verify OTP and reset password
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userEmail, 
          otp,
          newPassword: passwords.new,
          action: 'reset_password' 
        })
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Password updated successfully!' })
        setPasswords({ current: '', new: '', confirm: '' })
        setOtp('')
        setOtpSent(false)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update password' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  // Demo login sessions
  const loginSessions = [
    { 
      device: 'Chrome on Windows', 
      location: 'Jakarta, Indonesia', 
      ip: '103.xxx.xxx.xxx',
      time: 'Active now',
      current: true 
    },
    { 
      device: 'Safari on iPhone', 
      location: 'Jakarta, Indonesia', 
      ip: '103.xxx.xxx.xxx',
      time: '2 hours ago',
      current: false 
    },
    { 
      device: 'Firefox on MacOS', 
      location: 'Surabaya, Indonesia', 
      ip: '180.xxx.xxx.xxx',
      time: 'Yesterday',
      current: false 
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Security Settings</h1>
        <p className="text-muted-foreground">Manage your account security and authentication</p>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-lg p-4 ${
          message.type === 'success' 
            ? 'bg-blue-500/10 text-blue-600' 
            : 'bg-red-500/10 text-red-600'
        }`}>
          {message.type === 'success' ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Change Password */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription className="break-words">
              For security, we&apos;ll send an OTP code to your email
            </CardDescription>
            <p className="text-xs text-muted-foreground truncate">({userEmail || 'loading...'})</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Request OTP */}
            {!otpSent ? (
              <>
                <div className="rounded-lg bg-blue-500/10 p-3 sm:p-4 text-sm text-blue-700">
                  <div className="flex items-center gap-2 font-medium">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span>Email Verification Required</span>
                  </div>
                  <p className="mt-1 text-blue-600 text-xs sm:text-sm">
                    Click the button below to receive an OTP code for password change verification.
                  </p>
                </div>
                <Button 
                  onClick={handleSendOtp} 
                  disabled={sendingOtp}
                  className="w-full"
                >
                  {sendingOtp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="truncate">Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Send OTP to My Email</span>
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* OTP Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">OTP Code</label>
                  <Input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter OTP"
                    className="text-center text-lg tracking-widest font-mono"
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Check your email for the code.{' '}
                    <button 
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="text-blue-600 hover:underline"
                    >
                      Resend OTP
                    </button>
                  </p>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      placeholder="Confirm new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={handlePasswordChange} 
                  disabled={saving || otp.length !== 6 || !passwords.new || !passwords.confirm}
                  className="w-full"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>

                <Button 
                  variant="ghost"
                  onClick={() => {
                    setOtpSent(false)
                    setOtp('')
                    setPasswords({ current: '', new: '', confirm: '' })
                  }}
                  className="w-full text-muted-foreground"
                >
                  Cancel
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security Options */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Options
            </CardTitle>
            <CardDescription>Configure additional security features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Two-Factor Authentication */}
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2 flex-shrink-0">
                <Smartphone className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base">Two-Factor Authentication</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Switch 
                checked={twoFactor} 
                onCheckedChange={setTwoFactor}
                className="flex-shrink-0"
              />
            </div>

            {/* Email Notifications */}
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2 flex-shrink-0">
                <Lock className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base">Security Email Alerts</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Get notified of security events</p>
              </div>
              <Switch 
                checked={emailNotifications} 
                onCheckedChange={setEmailNotifications}
                className="flex-shrink-0"
              />
            </div>

            {/* Login Alerts */}
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-slate-1000/10 p-2 flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base">New Device Login Alerts</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Alert when logging from new device</p>
              </div>
              <Switch 
                checked={loginAlerts} 
                onCheckedChange={setLoginAlerts}
              />
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>Manage your active login sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loginSessions.map((session, index) => (
                <div 
                  key={index}
                  className="rounded-lg border border-border p-3 sm:p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-muted p-2 flex-shrink-0">
                      <Monitor className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm sm:text-base">{session.device}</p>
                        {session.current && (
                          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600">
                            Current
                          </span>
                        )}
                        {!session.current && (
                          <span className="text-xs text-muted-foreground">{session.time}</span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{session.location}</span>
                        </span>
                        <span className="truncate">IP: {session.ip}</span>
                      </div>
                    </div>
                    {!session.current && (
                      <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-500/10 hover:text-red-600 flex-shrink-0 text-xs px-2 h-7">
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-4 w-full text-red-600 hover:bg-red-500/10 hover:text-red-600 text-sm">
              Logout All Other Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
