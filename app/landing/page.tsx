'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ArrowRight, 
  Shield, 
  TrendingUp, 
  Users, 
  Wallet,
  ChevronDown,
  Star,
  CheckCircle2,
  Zap,
  Globe,
  Clock,
  Award,
  BarChart3,
  Lock,
  Sparkles,
  Download,
  Smartphone
} from 'lucide-react'

// Market Ticker Component (inline for landing)
const marketData = [
  { symbol: 'BTC', name: 'Bitcoin', price: 67845.20, change: 2.45 },
  { symbol: 'ETH', name: 'Ethereum', price: 3456.78, change: 1.82 },
  { symbol: 'SOL', name: 'Solana', price: 178.34, change: 4.21 },
  { symbol: 'XAU', name: 'Gold', price: 2345.60, change: 0.78 },
]

// PWA Install Hook
function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setIsInstallable(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return false
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promptEvent = deferredPrompt as any
    promptEvent.prompt()
    
    const { outcome } = await promptEvent.userChoice
    setDeferredPrompt(null)
    
    if (outcome === 'accepted') {
      setIsInstallable(false)
      return true
    }
    return false
  }

  return { isInstallable, isInstalled, install }
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const { isInstallable, isInstalled, install } = useInstallPrompt()
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const features = [
    {
      icon: TrendingUp,
      title: 'Daily Profit 1-2%',
      description: 'Earn consistent daily returns through our professional trading strategies',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Shield,
      title: 'Secure & Transparent',
      description: 'Your funds are protected with industry-leading security measures',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Users,
      title: '3-Level Referral',
      description: 'Earn 8%, 5%, and 2% bonus from your network deposits',
      color: 'from-purple-500 to-violet-600'
    },
    {
      icon: Wallet,
      title: 'Dual Wallet System',
      description: 'Separate Asset & Bonus wallets for better fund management',
      color: 'from-slate-1000 to-blue-600'
    }
  ]

  const stats = [
    { value: '$12.5M+', label: 'Total Volume' },
    { value: '25,000+', label: 'Active Members' },
    { value: '99.9%', label: 'Uptime' },
    { value: '24/7', label: 'Support' }
  ]

  const testimonials = [
    {
      name: 'Michael R.',
      location: 'Singapore',
      text: 'Started with $500 and reached 400% ROI in 8 months. The daily profit is consistent!',
      avatar: 'M'
    },
    {
      name: 'Sarah L.',
      location: 'Malaysia',
      text: 'The referral system helped me build passive income. Already at P2 rank!',
      avatar: 'S'
    },
    {
      name: 'David K.',
      location: 'Indonesia',
      text: 'Withdrawal process is fast and smooth. Very professional platform.',
      avatar: 'D'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mini Ticker */}
      <div className="border-b border-slate-800 bg-slate-900/50 py-2">
        <div className="container mx-auto flex items-center justify-center gap-8 overflow-hidden text-sm">
          {marketData.map((item) => (
            <div key={item.symbol} className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">{item.symbol}</span>
              <span className="text-slate-400">${item.price.toLocaleString('en-US')}</span>
              <span className={item.change >= 0 ? 'text-blue-500' : 'text-red-500'}>
                {item.change >= 0 ? '+' : ''}{item.change}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
<Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.jpg"
                alt="Vortex Equality"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <span className="text-xl font-bold text-white">Vortex Equality</span>
            </Link>
          
          <div className="flex items-center gap-4">
            {/* Install App Button */}
            {isInstallable && !isInstalled && (
              <Button 
                onClick={install} 
                variant="outline" 
                size="sm"
                className="hidden sm:flex items-center gap-2 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              >
                <Download className="h-4 w-4" />
                Install App
              </Button>
            )}
            <Link href="/auth/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="bg-gradient-to-r from-slate-1000 to-blue-600 hover:from-slate-500 hover:to-blue-700">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-1000/5 via-transparent to-transparent" />
        <div className="absolute -left-40 top-20 h-80 w-80 rounded-full bg-slate-1000/10 blur-3xl" />
        <div className="absolute -right-40 bottom-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        
        <div className="container relative mx-auto px-4 text-center">
          <div className="mx-auto max-w-4xl">
            {/* Logo */}
            <div className="mb-8 flex justify-center">
              <Image
                src="/logo.jpg"
                alt="Vortex Equality"
                width={120}
                height={120}
                className="rounded-3xl shadow-2xl shadow-blue-500/20"
                priority
              />
            </div>
            
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-1000/30 bg-slate-1000/10 px-4 py-2 text-sm text-slate-400">
              <Sparkles className="h-4 w-4" />
              Professional Trading Platform
            </div>
            
            {/* Headline */}
            <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
              Grow Your Wealth with{' '}
              <span className="bg-gradient-to-r from-slate-400 via-slate-400 to-slate-400 bg-clip-text text-transparent">
                Daily Profits
              </span>
            </h1>
            
            <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-400 md:text-xl">
              Join thousands of investors earning 1-2% daily through our automated trading system. 
              Start with just $50 and watch your investment grow.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/sign-up">
                <Button size="lg" className="h-14 gap-2 bg-gradient-to-r from-slate-1000 to-blue-600 px-8 text-lg hover:from-slate-500 hover:to-blue-700">
                  Start Earning Now
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="#calculator">
                <Button size="lg" variant="outline" className="h-14 gap-2 border-slate-700 px-8 text-lg text-slate-300 hover:bg-slate-800">
                  Calculate Profit
                  <BarChart3 className="h-5 w-5" />
                </Button>
              </Link>
            </div>
            
            {/* Trust Badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-500" />
                <span>Encrypted Transactions</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-purple-500" />
                <span>Global Access</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-8 w-8 text-slate-600" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-slate-800 bg-slate-900/50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl font-bold text-white md:text-4xl">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              Why Choose Vortex Equality?
            </h2>
            <p className="mx-auto max-w-2xl text-slate-400">
              Our platform combines cutting-edge technology with proven trading strategies
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card key={index} className="group border-slate-800 bg-slate-900/50 transition-all hover:border-slate-700 hover:bg-slate-900">
                <CardContent className="p-6">
                  <div className={`mb-4 inline-flex rounded-2xl bg-gradient-to-br ${feature.color} p-3 text-white`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-900/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto max-w-2xl text-slate-400">
              Start earning in just 3 simple steps
            </p>
          </div>
          
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            {[
              { step: '1', title: 'Register', desc: 'Create your free account in under 2 minutes', icon: Users },
              { step: '2', title: 'Deposit', desc: 'Fund your account with minimum $50', icon: Wallet },
              { step: '3', title: 'Earn Daily', desc: 'Claim your profit every day between 10AM-12PM', icon: TrendingUp }
            ].map((item, index) => (
              <div key={index} className="relative text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-1000 to-blue-600 text-2xl font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
                
                {/* Connector Line */}
                {index < 2 && (
                  <div className="absolute left-[60%] top-8 hidden h-0.5 w-[80%] bg-gradient-to-r from-slate-1000/50 to-transparent md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Profit Calculator */}
      <section id="calculator" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 text-center">
              <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
                Profit Calculator
              </h2>
              <p className="text-slate-400">
                See how much you could earn with Vortex Equality
              </p>
            </div>
            
            <ProfitCalculator />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-slate-900/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              What Our Members Say
            </h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((item, index) => (
              <Card key={index} className="border-slate-800 bg-slate-900/50">
                <CardContent className="p-6">
                  <div className="mb-4 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-slate-1000 text-slate-1000" />
                    ))}
                  </div>
                  <p className="mb-4 text-slate-300">&quot;{item.text}&quot;</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-1000 to-blue-600 font-bold text-white">
                      {item.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-sm text-slate-500">{item.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-500 via-blue-600 to-slate-500 p-12 text-center">
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
            <div className="relative">
              <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
                Ready to Start Earning?
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-slate-200">
                Join Vortex Equality today and start your journey to financial freedom. 
                No hidden fees, no complicated processes.
              </p>
              <Link href="/auth/sign-up">
                <Button size="lg" className="h-14 gap-2 bg-white px-8 text-lg text-slate-500 hover:bg-slate-100">
                  Create Free Account
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.jpg"
                alt="Vortex Equality"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <span className="font-semibold text-white">Vortex Equality</span>
            </div>
            
            {/* WhatsApp Contact */}
            <a 
              href="https://wa.me/34912345678?text=Hi,%20I%20want%20to%20know%20more%20about%20Vortex%20Equality"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/20"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Contact via WhatsApp
            </a>
            
            <div className="flex flex-col items-center gap-2 md:items-end">
              <p className="text-sm text-slate-500">
                2024 Vortex Equality. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm text-slate-500">
                <Link href="#" className="hover:text-white">Terms</Link>
                <Link href="#" className="hover:text-white">Privacy</Link>
                <Link href="#" className="hover:text-white">Contact</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Profit Calculator Component
function ProfitCalculator() {
  const [deposit, setDeposit] = useState(500)
  const [days, setDays] = useState(30)
  const dailyRate = 0.015 // 1.5% average

  const calculateProfit = () => {
    let balance = deposit
    for (let i = 0; i < days; i++) {
      balance += balance * dailyRate
    }
    return balance
  }

  const profit = calculateProfit() - deposit
  const totalBalance = calculateProfit()
  const percentageGain = ((profit / deposit) * 100).toFixed(1)

  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Deposit Slider */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm text-slate-400">Initial Deposit</label>
              <span className="text-2xl font-bold text-white">${deposit.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="50"
              max="10000"
              step="50"
              value={deposit}
              onChange={(e) => setDeposit(Number(e.target.value))}
              className="w-full accent-slate-1000"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>$50</span>
              <span>$10,000</span>
            </div>
          </div>

          {/* Days Slider */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm text-slate-400">Investment Period</label>
              <span className="text-2xl font-bold text-white">{days} days</span>
            </div>
            <input
              type="range"
              min="7"
              max="365"
              step="1"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full accent-slate-1000"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>7 days</span>
              <span>365 days</span>
            </div>
          </div>

          {/* Results */}
          <div className="rounded-2xl bg-slate-800/50 p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <p className="text-sm text-slate-400">Total Balance</p>
                <p className="text-2xl font-bold text-white">${totalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400">Total Profit</p>
                <p className="text-2xl font-bold text-blue-500">+${profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400">ROI</p>
                <p className="text-2xl font-bold text-slate-1000">+{percentageGain}%</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500">
            * Calculation based on average daily profit of 1.5%. Actual returns may vary.
          </p>

          <Link href="/auth/sign-up" className="block">
            <Button className="h-12 w-full bg-gradient-to-r from-slate-1000 to-blue-600 text-lg hover:from-slate-500 hover:to-blue-700">
              Start Investing Now
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
