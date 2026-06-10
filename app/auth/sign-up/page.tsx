'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, Eye, EyeOff, Lock, Shield, KeyRound } from 'lucide-react'

export const dynamic = 'force-dynamic'

const REFERRAL_STORAGE_KEY = 'vortex_locked_referral'

function SignUpFormContent() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [withdrawalPin, setWithdrawalPin] = useState('')
  const [confirmWithdrawalPin, setConfirmWithdrawalPin] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showWithdrawalPin, setShowWithdrawalPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lockedReferral, setLockedReferral] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const urlReferralCode = searchParams.get('ref')
  const supabase = createClient()

  useEffect(() => {
    const storedReferral = localStorage.getItem(REFERRAL_STORAGE_KEY)
    if (storedReferral) {
      setLockedReferral(storedReferral)
    } else if (urlReferralCode) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, urlReferralCode)
      setLockedReferral(urlReferralCode)
    }
  }, [urlReferralCode])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (!/^[a-z0-9_]{3,24}$/.test(username.trim().toLowerCase())) {
      setError('Username must be 3-24 characters using letters, numbers, or underscores only')
      setLoading(false)
      return
    }

    if (!/^\d{6}$/.test(withdrawalPin)) {
      setError('Withdrawal PIN must be exactly 6 digits')
      setLoading(false)
      return
    }

    if (withdrawalPin !== confirmWithdrawalPin) {
      setError('Withdrawal PINs do not match')
      setLoading(false)
      return
    }

    try {
      // Use our custom API that bypasses email confirmation
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username,
          password,
          fullName,
          referralCode: lockedReferral,
          withdrawalPin,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Registration failed')
        setLoading(false)
        return
      }

      // Registration successful - now login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Account created! Please login with your credentials.')
        setLoading(false)
        return
      }

      // Clear referral from localStorage
      localStorage.removeItem(REFERRAL_STORAGE_KEY)
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full items-center justify-center bg-[#1D1D1F] p-6 sm:p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <Image src="/logo.jpg" alt="Vortex Equality" width={64} height={64} className="mx-auto mb-4 rounded-xl shadow-lg" />
            <h1 className="text-2xl font-bold text-white">Vortex Equality</h1>
          </div>
          
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-white">Create Account</h2>
            <p className="mt-2 text-slate-400">Join Vortex Equality and start your investment journey</p>
          </div>

          {lockedReferral && (
            <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                  <Lock className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-300">Referral Code Locked</p>
                  <p className="font-mono text-sm font-bold text-blue-400">{lockedReferral}</p>
                </div>
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-300">Full Name</Label>
              <Input id="fullName" type="text" placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={loading} className="h-12 border-slate-700 bg-[#2D2D2F] text-white placeholder:text-slate-500 focus:border-blue-500 focus:bg-[#2D2D2F]" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email Address</Label>
              <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} className="h-12 border-slate-700 bg-[#2D2D2F] text-white placeholder:text-slate-500 focus:border-blue-500 focus:bg-[#2D2D2F]" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a unique username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24))}
                required
                disabled={loading}
                className="h-12 border-slate-700 bg-[#2D2D2F] text-white placeholder:text-slate-500 focus:border-blue-500 focus:bg-[#2D2D2F]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sponsor" className="text-slate-300">Sponsor Username</Label>
              <Input
                id="sponsor"
                type="text"
                value={lockedReferral || 'Direct registration'}
                readOnly
                disabled
                className="h-12 border-slate-700 bg-[#202022] text-slate-300"
              />
              <p className="text-xs text-slate-500">Sponsor is locked from the invitation link and cannot be edited.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Create a password (min. 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} className="h-12 border-slate-700 bg-[#2D2D2F] pr-10 text-white placeholder:text-slate-500 focus:border-blue-500 focus:bg-[#2D2D2F]" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
              <div className="relative">
                <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} className="h-12 border-slate-700 bg-[#2D2D2F] pr-10 text-white placeholder:text-slate-500 focus:border-blue-500 focus:bg-[#2D2D2F]" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdrawalPin" className="text-slate-300">6-Digit Withdrawal PIN</Label>
              <div className="relative">
                <Input
                  id="withdrawalPin"
                  type={showWithdrawalPin ? 'text' : 'password'}
                  inputMode="numeric"
                  placeholder="Create 6-digit PIN"
                  value={withdrawalPin}
                  onChange={(e) => setWithdrawalPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  disabled={loading}
                  className="h-12 border-slate-700 bg-[#2D2D2F] pr-10 text-center font-mono text-xl tracking-[0.4em] text-white placeholder:text-sm placeholder:tracking-normal placeholder:text-slate-500 focus:border-blue-500 focus:bg-[#2D2D2F]"
                  maxLength={6}
                />
                <button type="button" onClick={() => setShowWithdrawalPin(!showWithdrawalPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showWithdrawalPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmWithdrawalPin" className="text-slate-300">Confirm Withdrawal PIN</Label>
              <div className="relative">
                <Input
                  id="confirmWithdrawalPin"
                  type="password"
                  inputMode="numeric"
                  placeholder="Confirm 6-digit PIN"
                  value={confirmWithdrawalPin}
                  onChange={(e) => setConfirmWithdrawalPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  disabled={loading}
                  className="h-12 border-slate-700 bg-[#2D2D2F] text-center font-mono text-xl tracking-[0.4em] text-white placeholder:text-sm placeholder:tracking-normal placeholder:text-slate-500 focus:border-blue-500 focus:bg-[#2D2D2F]"
                  maxLength={6}
                />
              </div>
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <KeyRound className="h-3.5 w-3.5" />
                This PIN is required for every withdrawal.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button type="submit" className="h-12 w-full bg-[#0071E3] font-semibold text-white hover:bg-[#0077ED]" disabled={loading}>
              {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>) : ('Create Account')}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <a href="/auth/login" className="font-semibold text-[#0071E3] hover:text-blue-400">Sign In</a>
          </p>
        </div>
      </div>
      
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 lg:flex lg:w-1/2">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute right-20 top-20 h-72 w-72 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute bottom-20 left-20 h-96 w-96 rounded-full bg-blue-500 blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-8">
            <Image src="/logo-dark.jpg" alt="Vortex Equality" width={80} height={80} className="rounded-2xl shadow-2xl" />
          </div>
          
          <h1 className="mb-4 text-4xl font-bold text-white xl:text-5xl">Start Your Journey</h1>
          <p className="mb-12 text-xl text-blue-200">Join thousands of successful investors on Vortex Equality</p>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                <CheckCircle className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Free Registration</h3>
                <p className="text-sm text-blue-300">No hidden fees to create your account</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                <CheckCircle className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Start with $50</h3>
                <p className="text-sm text-blue-300">Begin investing from as low as $50</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                <CheckCircle className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Daily 1-2% Profit</h3>
                <p className="text-sm text-blue-300">Claim your profit sharing every day</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1D1D1F]">
      <Loader2 className="h-8 w-8 animate-spin text-[#0071E3]" />
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignUpFormContent />
    </Suspense>
  )
}
