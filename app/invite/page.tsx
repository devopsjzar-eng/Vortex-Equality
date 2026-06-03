'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  CheckCircle, 
  TrendingUp, 
  Users, 
  Shield, 
  ArrowRight,
  Gift,
  Lock,
  Wallet,
  Loader2
} from 'lucide-react'

// Force dynamic rendering to avoid static prerender error
export const dynamic = 'force-dynamic'

const REFERRAL_STORAGE_KEY = 'vortex_locked_referral'

function InviteContent() {
  const searchParams = useSearchParams()
  const referralCode = searchParams.get('ref')
  const [isLocked, setIsLocked] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (referralCode) {
      const existingRef = localStorage.getItem(REFERRAL_STORAGE_KEY)
      
      if (!existingRef) {
        localStorage.setItem(REFERRAL_STORAGE_KEY, referralCode)
        setIsLocked(true)
      } else if (existingRef === referralCode) {
        setIsLocked(true)
      }
    }
  }, [referralCode])

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 rounded-full border-4 border-blue-400/30 border-t-blue-400 animate-spin" />
          <p className="text-lg font-semibold text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-1/4 top-20 h-96 w-96 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute bottom-20 right-1/4 h-96 w-96 rounded-full bg-blue-500 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center">
          <div className="mb-8 flex justify-center">
            <Image 
              src="/logo-dark.jpg" 
              alt="Vortex Equality" 
              width={100} 
              height={100}
              className="rounded-2xl shadow-2xl"
            />
          </div>

          {referralCode && (
            <div className="mx-auto mb-8 max-w-md">
              <Card className="border-blue-500/30 bg-blue-500/10">
                <CardContent className="flex items-center justify-center gap-3 p-4">
                  <Lock className="h-6 w-6 text-blue-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-blue-300">Referral Code Locked</p>
                    <p className="font-mono text-lg font-bold text-blue-400">{referralCode}</p>
                  </div>
                  <Shield className="h-6 w-6 text-blue-400" />
                </CardContent>
              </Card>
            </div>
          )}

          <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-slate-400 to-slate-500 bg-clip-text text-transparent">
              Vortex Equality
            </span>
          </h1>
          
          <p className="mx-auto mb-8 max-w-2xl text-lg text-blue-200 md:text-xl">
            Professional Trading Platform with Daily 1-2% Profit Sharing.
            Start with just $50 and grow your wealth with our proven trading system.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href={`/auth/sign-up${referralCode ? `?ref=${referralCode}` : ''}`}>
              <Button size="lg" className="h-14 gap-2 bg-gradient-to-r from-slate-1000 to-slate-500 px-8 text-lg font-semibold text-white hover:from-slate-500 hover:to-slate-600">
                <Gift className="h-5 w-5" />
                Join Now - Free Registration
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="h-14 border-white/30 px-8 text-lg text-white hover:bg-white/10">
                Already a Member? Sign In
              </Button>
            </Link>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-slate-400">1-2%</p>
                <p className="text-sm text-slate-400">Daily Profit</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-blue-400">$50</p>
                <p className="text-sm text-slate-400">Minimum Deposit</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-blue-400">15%</p>
                <p className="text-sm text-slate-400">Referral Bonus</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-purple-400">400%</p>
                <p className="text-sm text-slate-400">Max ROI</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold text-white">
          Why Choose Vortex Equality?
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-1000/20">
                <TrendingUp className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Daily Profit Sharing</h3>
              <p className="text-sm text-slate-400">
                Earn 0.5-1% daily from our professional trading activities.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">3-Level Referral Bonus</h3>
              <p className="text-sm text-slate-400">
                Earn 8% + 5% + 2% from your referral network.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                <Wallet className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Dual Wallet System</h3>
              <p className="text-sm text-slate-400">
                Asset Wallet for profits. Bonus Wallet for referrals.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20">
                <Gift className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Leadership Rewards</h3>
              <p className="text-sm text-slate-400">
                Achieve ranks from P1 to P5 and earn salary rewards.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                <Shield className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Secure Platform</h3>
              <p className="text-sm text-slate-400">
                Bank-grade security with encrypted transactions.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                <CheckCircle className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Easy Withdrawals</h3>
              <p className="text-sm text-slate-400">
                Withdraw anytime with low fees (5% after 100% ROI).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Final CTA */}
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="mb-6 text-3xl font-bold text-white">
          Ready to Start Your Investment Journey?
        </h2>
        <p className="mb-8 text-lg text-blue-200">
          Join thousands of successful investors. Registration is free.
        </p>
        <Link href={`/auth/sign-up${referralCode ? `?ref=${referralCode}` : ''}`}>
          <Button size="lg" className="h-14 gap-2 bg-gradient-to-r from-slate-1000 to-slate-500 px-12 text-lg font-semibold text-white hover:from-slate-500 hover:to-slate-600">
            Create Free Account
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-sm text-slate-500">
            © 2024 Vortex Equality. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-12 w-12 rounded-full border-4 border-slate-400/30 border-t-slate-400 animate-spin" />
        <p className="text-lg font-semibold text-white">Loading Invitation...</p>
      </div>
    </div>
  )
}

export default function ReferralLandingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InviteContent />
    </Suspense>
  )
}
