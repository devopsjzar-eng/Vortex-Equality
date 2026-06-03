'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, Mail, KeyRound, Eye, EyeOff, CheckCircle2, Shield } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'otp' | 'reset' | 'success'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, action: 'send_otp' })
        })
        const data = await res.json()
        
        if (data.success) {
          setStep('otp')
        } else {
          setError(data.error || 'Failed to send OTP. Please try again.')
        }
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP code')
      return
    }
    
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, action: 'verify_otp' })
        })
        const data = await res.json()
        
        if (data.success) {
          setStep('reset')
        } else {
          setError(data.error || 'Invalid OTP code. Please try again.')
        }
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, newPassword, action: 'reset_password' })
        })
        const data = await res.json()
        
        if (data.success) {
          setStep('success')
        } else {
          setError(data.error || 'Failed to reset password. Please try again.')
        }
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  const handleResendOTP = async () => {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, action: 'send_otp' })
        })
        const data = await res.json()
        
        if (!data.success) {
          setError(data.error || 'Failed to resend OTP.')
        }
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1D1D1F] p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-[#2D2D2F] rounded-2xl shadow-2xl p-8 border border-slate-700/50">
          {/* Logo */}
          <div className="text-center mb-6">
            <Image 
              src="/logo.jpg" 
              alt="Vortex Equality" 
              width={56} 
              height={56}
              className="mx-auto rounded-xl shadow-lg mb-3"
            />
            <h1 className="text-xl font-bold text-white">Vortex Equality</h1>
          </div>

          {/* Step: Email Input */}
          {step === 'email' && (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                  <Mail className="w-7 h-7 text-[#0071E3]" />
                </div>
                <h2 className="text-xl font-bold text-white">Forgot Password?</h2>
                <p className="text-slate-400 text-sm mt-2">
                  Enter your email address and we&apos;ll send you an OTP code to reset your password.
                </p>
              </div>

              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isPending}
                    className="h-12 bg-[#1D1D1F] border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-[#0071E3] hover:bg-[#0077ED]"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    'Send OTP Code'
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Step: OTP Verification */}
          {step === 'otp' && (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                  <KeyRound className="w-7 h-7 text-[#0071E3]" />
                </div>
                <h2 className="text-xl font-bold text-white">Enter OTP Code</h2>
                <p className="text-slate-400 text-sm mt-2">
                  We&apos;ve sent a 6-digit code to<br />
                  <span className="font-medium text-[#0071E3]">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-slate-300">OTP Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    disabled={isPending}
                    className="h-12 bg-[#1D1D1F] border-slate-700 text-white text-center text-2xl tracking-widest font-mono placeholder:text-slate-500 focus:border-blue-500"
                    maxLength={6}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-[#0071E3] hover:bg-[#0077ED]"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify OTP'
                  )}
                </Button>

                <p className="text-center text-sm text-slate-400">
                  {"Didn't receive the code?"}{' '}
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isPending}
                    className="font-medium text-[#0071E3] hover:text-blue-400 hover:underline disabled:opacity-50"
                  >
                    Resend
                  </button>
                </p>
              </form>
            </>
          )}

          {/* Step: Reset Password */}
          {step === 'reset' && (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                  <Shield className="w-7 h-7 text-[#0071E3]" />
                </div>
                <h2 className="text-xl font-bold text-white">Create New Password</h2>
                <p className="text-slate-400 text-sm mt-2">
                  Your new password must be at least 8 characters long.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-slate-300">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={isPending}
                      className="h-12 bg-[#1D1D1F] border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 pr-12"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isPending}
                      className="h-12 bg-[#1D1D1F] border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 pr-12"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-[#0071E3] hover:bg-[#0077ED]"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#0071E3]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Password Reset Successful!</h2>
              <p className="text-slate-400 text-sm mb-6">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
              <Button 
                className="w-full h-12 bg-[#0071E3] hover:bg-[#0077ED]"
                onClick={() => router.push('/auth/login')}
              >
                Back to Sign In
              </Button>
            </div>
          )}

          {/* Back to Login (for email and otp steps) */}
          {(step === 'email' || step === 'otp') && (
            <div className="mt-6 text-center">
              <Link 
                href="/auth/login" 
                className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
