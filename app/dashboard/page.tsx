'use client'

// Vortex Equality Dashboard - Updated 26 May 2026
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { BroadcastBanner } from '@/components/broadcast-banner'
import { ReceiptModal } from '@/components/receipt-modal'
import { CountdownTimer, CompactCountdown } from '@/components/countdown-timer'
import { MarketInsightCard } from '@/components/market-insight-card'
import { FundManagementCard } from '@/components/dashboard/fund-management-card'
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Trophy, 
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  Gift,
  Star,
  ChevronRight,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Profile {
  id: string
  full_name: string
  email: string
  asset_wallet: number
  bonus_wallet: number
  total_deposit: number
  total_profit_earned: number
  rank: string
  referral_code: string
}

interface ProfitClaim {
  id: string
  amount: number
  total_percentage: number
  status: string
  created_at?: string
}

interface Transaction {
  id: string
  type: string
  amount: number
  status: string
  created_at: string
  wallet_type: string
  receipt_data?: any
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [assetBalance, setAssetBalance] = useState(0)
  const [assetWallet, setAssetWallet] = useState<any>(null)
  const [bonusBalance, setBonusBalance] = useState(0)
  const [todayProfit, setTodayProfit] = useState<ProfitClaim | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isProfitTimeState, setIsProfitTimeState] = useState(false)
  const [todayRate, setTodayRate] = useState<number>(1.0) // Rate profit hari ini (1%, 1.1%, 1.2%, atau 1.3%)
  const supabase = createClient()

  // Update time every second - tapi hanya untuk display, bukan untuk re-render logika
  useEffect(() => {
    // [DEV] Support test time override via URL param ?testTime=HH:MM
    let getTestTime = () => new Date()
    
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const testTimeParam = urlParams.get('testTime')
      if (testTimeParam) {
        const [hours, minutes] = testTimeParam.split(':').map(Number)
        console.log('[v0] TEST MODE: Using override time:', testTimeParam)
        getTestTime = () => {
          const d = new Date()
          d.setHours(hours, minutes, 0, 0)
          return d
        }
      }
    }
    
    // Set initial profit time state
    const now = getTestTime()
    const jakartaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    const initialProfitTime = jakartaNow.getHours() >= 10
    console.log('[v0] Initial profit time check:', jakartaNow.getHours(), '>=', 10, '=', initialProfitTime)
    setIsProfitTimeState(initialProfitTime)
    
    const timer = setInterval(() => {
      const newTime = getTestTime()
      setCurrentTime(newTime)
      // Update isProfitTime only when hour changes
      const jakartaTime = new Date(newTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
      const newIsProfitTime = jakartaTime.getHours() >= 10
      setIsProfitTimeState(prev => prev !== newIsProfitTime ? newIsProfitTime : prev)
    }, 1000)
    
    // Set default profit rate - no API call needed
    // Rate will be static 1.0 (100% distribution) unless you fetch dynamically elsewhere
    setTodayRate(1.0)
    
    return () => clearInterval(timer)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }
      
      setUserId(user.id)

      // Run 3 parallel queries instead of sequential
      const [profileRes, walletsRes, transactionsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
      ])
      
      if (profileRes.data) setProfile(profileRes.data)
      if (walletsRes.data) {
        const assetW = walletsRes.data.find(w => w.wallet_type === 'asset')
        setAssetWallet(assetW)
        setAssetBalance(assetW?.balance || 0)
        setBonusBalance(walletsRes.data.find(w => w.wallet_type === 'bonus')?.balance || 0)
      }
      if (transactionsRes.data) setTransactions(transactionsRes.data)

      // Fetch profit data - simplified
      // Get today's date in WIB
      const now = new Date()
      const jakartaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
      const todayDateStr = jakartaNow.toISOString().split('T')[0]
      
      // Get daily profit and user's claim in single query
      const { data: dailyProfitData } = await supabase
        .from('daily_profits')
        .select(`
          id,
          profit_date,
          global_profit_percentage,
          profit_claims (
            id,
            amount,
            total_percentage,
            status
          )
        `)
        .eq('profit_date', todayDateStr)
        .eq('profit_claims.user_id', user.id)
        .maybeSingle()
      
      if (dailyProfitData?.profit_claims && dailyProfitData.profit_claims.length > 0) {
        const claim = dailyProfitData.profit_claims[0]
        setTodayProfit({
          status: claim.status,
          amount: claim.amount,
          total_percentage: claim.total_percentage,
          id: claim.id,
          created_at: ''
        })
      } else {
        setTodayProfit({ 
          status: 'available', 
          amount: 0, 
          total_percentage: 0,
          id: null,
          created_at: ''
        })
      }

    } catch (error) {
      console.error('[v0] Dashboard fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleClaimProfit = async () => {
    // PENTING: Cek dulu apakah sudah claimed atau sedang claiming
    if (claiming) {
      toast.info('Processing claim...')
      return
    }
    
    if (todayProfit?.status === 'claimed') {
      toast.info('You have already claimed profit today.')
      return
    }
    
    if (!userId) {
      toast.error('User not found. Please log in again.')
      return
    }
    
    setClaiming(true)

    try {
      // DARURAT: Use quick-claim API
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const res = await fetch('/api/profit/quick-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId }),
        credentials: 'include',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      // Check if response is JSON
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[v0] API returned non-JSON response:', await res.text())
        toast.error('Server error. Please refresh the page and try again.')
        setClaiming(false)
        return
      }
      
      const data = await res.json()
      
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Gagal klaim profit. Silakan coba lagi.')
        setClaiming(false)
        return
      }
      
      // SUCCESS! Show celebration toast
      toast.success(`Profit $${data.amount.toFixed(2)} berhasil diklaim!`, {
        description: 'Dana sudah ditambahkan ke Asset Wallet',
        duration: 5000
      })
      
      // PENTING: Set claimed SEGERA dan TIDAK set claiming ke false
      // Ini mencegah tombol muncul lagi
      setTodayProfit({ status: 'claimed', amount: data.amount, total_percentage: data.rate, id: data.receipt_number })
      
      // Refresh data dari server
      fetchData()
      
      const now = new Date()
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      
      setReceiptData({
        type: 'DAILY PROFIT',
        amount: data.amount,
        rate: data.rate.toFixed(2) + '%',
        wallet: 'Asset Wallet',
        date: `${dateStr}, ${timeStr}`,
        status: 'SUCCESS',
        receipt_number: data.receipt_number || 'VX-DP-' + Date.now().toString(36).toUpperCase(),
        note: 'Auto-compound to Asset Wallet'
      })
      setShowReceipt(true)
      
    } catch (error) {
      console.error('[v0] Claim error:', error)
      toast.error('Terjadi kesalahan jaringan. Silakan coba lagi.')
    } finally {
      setClaiming(false)
    }
  }

  // Calculate ROI percentage using actual profit earned vs active capital
  // Modal Aktif = wallet.initial_capital
  const activeCapital = assetWallet?.initial_capital || 0
  const actualProfitEarned = assetWallet?.total_profit_earned || 0
  
  const roiPercentage = activeCapital > 0 
    ? (actualProfitEarned / activeCapital) * 100 
    : 0
  const roiProgress = Math.min(Math.max(roiPercentage / 4, 0), 100) // Progress to 400%
  const isMaxROI = roiPercentage >= 400

  // Use isProfitTimeState from useEffect (stable, tidak berkedip)
  const isProfitTime = isProfitTimeState
  
  // Calculate time for display only
  const jakartaDisplay = new Date(currentTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const hour = jakartaDisplay.getHours()
  const minute = jakartaDisplay.getMinutes()
  const timeUntilProfit = hour < 10 ? `${9 - hour}h ${59 - minute}m` : null
  const timeUntilExpiry = isProfitTime ? `${23 - hour}h ${59 - minute}m` : null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">Loading Dashboard</p>
            <p className="text-sm text-muted-foreground">Please wait...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Broadcast Banner */}
      <BroadcastBanner />

      {/* Welcome Header - TOP POSITION */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {profile?.full_name?.split(' ')[0] || 'Trader'}!
          </h1>
          <p className="text-sm text-muted-foreground">
            Your investment grows every day with Vortex Equality
          </p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-xs text-muted-foreground">Server Time</p>
          <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </p>
        </div>
      </div>

      {/* Portfolio & Market Insight Grid */}
      <div className="grid gap-4 lg:grid-cols-3 w-full overflow-hidden">
        {/* Compact Wallet Cards */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {/* Combined Wallet Display */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {/* Asset Wallet - Premium Glass Design */}
        <Card className="relative overflow-hidden border border-white/[0.08] bg-[#0d1117]/80 shadow-2xl backdrop-blur-xl min-w-0">
          {/* Subtle glow effect */}
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-500/10 blur-[80px]" />
          <div className="absolute -left-20 -bottom-20 h-32 w-32 rounded-full bg-blue-400/5 blur-[60px]" />
          
          <CardHeader className="relative px-5 pt-5 pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 ring-1 ring-white/10">
                  <Wallet className="h-5 w-5 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-slate-300">Asset Wallet</span>
              </div>
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400 ring-1 ring-blue-500/20">
                Auto-Compound
              </span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="relative px-5 pb-5 pt-2 space-y-4">
            {/* Balance */}
            <div>
              <p className="text-3xl font-bold tracking-tight text-white">
                {formatCurrency(assetBalance)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Active Capital: {formatCurrency(assetWallet?.initial_capital || 0)}
              </p>
            </div>

            {/* ROI Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">ROI Progress</span>
                <span className={cn(
                  "font-semibold",
                  isMaxROI ? 'text-red-400' : roiPercentage >= 100 ? 'text-emerald-400' : 'text-slate-300'
                )}>
                  {roiPercentage.toFixed(1)}% / 400%
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    isMaxROI 
                      ? 'bg-gradient-to-r from-red-500 to-red-400' 
                      : roiPercentage >= 100 
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : 'bg-gradient-to-r from-blue-500 to-blue-400'
                  )}
                  style={{ width: `${roiProgress}%` }}
                />
                <div className="absolute left-1/4 top-0 h-full w-px bg-white/20" title="100% ROI" />
              </div>
              {isMaxROI && (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  Max ROI reached. Re-invest to continue earning.
                </p>
              )}
              {!isMaxROI && roiPercentage >= 100 && (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Withdrawal fee reduced to 5%
                </p>
              )}
            </div>

            {/* Fee Info */}
            <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 ring-1 ring-white/[0.06]">
              <span className="text-xs text-slate-500">Withdrawal Fee</span>
              <span className={cn(
                "text-sm font-semibold",
                roiPercentage >= 100 ? 'text-emerald-400' : 'text-slate-300'
              )}>
                {roiPercentage >= 100 ? '5%' : '20%'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Bonus Wallet - Premium Glass Design */}
        <Card className="relative overflow-hidden border border-white/[0.08] bg-[#0d1117]/80 shadow-2xl backdrop-blur-xl min-w-0">
          {/* Subtle glow effect */}
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-[80px]" />
          <div className="absolute -left-20 -bottom-20 h-32 w-32 rounded-full bg-teal-400/5 blur-[60px]" />
          
          <CardHeader className="relative px-5 pt-5 pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/10 ring-1 ring-white/10">
                  <Gift className="h-5 w-5 text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-slate-300">Bonus Wallet</span>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/20">
                No Cap
              </span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="relative px-5 pb-5 pt-2 space-y-4">
            {/* Balance */}
            <div>
              <p className="text-3xl font-bold tracking-tight text-white">
                {formatCurrency(bonusBalance)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Sponsor Bonus + Rank Rewards
              </p>
            </div>

            {/* Bonus Sources */}
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 ring-1 ring-white/[0.06]">
                <span className="text-xs text-slate-500">Sponsor Bonus (3 Level)</span>
                <span className="text-sm font-semibold text-emerald-400">8% / 5% / 2%</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 ring-1 ring-white/[0.06]">
                <span className="text-xs text-slate-500">Rank Rewards (P1-P5)</span>
                <span className="text-sm font-semibold text-emerald-400">$100 - $5,000</span>
              </div>
            </div>

            {/* Fee Info */}
            <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 ring-1 ring-white/[0.06]">
              <span className="text-xs text-slate-500">Withdrawal Fee</span>
              <span className="text-sm font-semibold text-slate-300">5% (Flat)</span>
            </div>
          </CardContent>
        </Card>
          </div>
        </div>
      </div>

      {/* Fund Management Card - Below Wallet Cards */}
      <FundManagementCard />

      {/* THE VICTORY BUTTON - Daily Profit Claim Card (Apple Matte Style) */}
      <div className="mt-4 rounded-[24px] bg-[#1C1C1E] shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-[#2C2C2E]/60 overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Left Side: Info */}
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="bg-[#2C2C2E] rounded-[18px] p-3.5 border border-[#333336]">
              <Sparkles className="h-7 w-7 text-[#D4AF37]" /> {/* Matte Gold Icon */}
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="text-xs sm:text-sm font-semibold text-[#86868B] uppercase tracking-widest mb-1">Daily Profit</h3>
              
              {todayProfit?.status === 'claimed' ? (
                <>
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F5F7]">Claimed for today!</p>
                  <p className="text-[11px] sm:text-xs font-medium text-[#34C759] mt-1">
                    +{formatCurrency(todayProfit.amount)} ({todayProfit.total_percentage.toFixed(1)}%) added to Asset Wallet
                  </p>
                </>
              ) : !isProfitTime ? (
                <>
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight text-[#55555A]">Locked</p>
                  <p className="text-[11px] sm:text-xs font-medium text-[#86868B] mt-1">
                    Please return during profit hours
                  </p>
                </>
              ) : profile && profile.total_deposit === 0 ? (
                <>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight text-[#55555A]">No Active Asset</p>
                  <p className="text-[11px] sm:text-xs font-medium text-[#86868B] mt-1">
                    Deposit funds to activate daily profits.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-4xl sm:text-5xl font-bold tracking-tighter text-[#34C759]">
                    +{todayRate}%
                  </p>
                  <p className="text-[11px] sm:text-xs font-medium text-[#86868B] mt-1">
                    Ready to claim from your active capital
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Right Side: Action Button */}
          <div className="flex flex-col items-stretch gap-3 md:items-end w-full md:w-auto mt-2 md:mt-0">
            
            {/* CLAIM BUTTON */}
            {isProfitTime && profile && profile.total_deposit > 0 && todayProfit?.status !== 'claimed' && (
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <Button 
                  size="lg" 
                  className="bg-[#0071E3] hover:bg-[#0077ED] active:bg-[#005bb5] text-white font-bold text-sm sm:text-base px-10 py-7 h-auto rounded-[20px] shadow-sm active:scale-[0.95] transition-all duration-200 ease-out select-none touch-manipulation"
                  onClick={handleClaimProfit}
                  disabled={claiming}
                >
                  {claiming ? (
                    <span className="flex items-center justify-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Processing...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-3">
                      <Sparkles className="h-5 w-5" />
                      <span>CLAIM PROFIT {todayRate}%</span>
                    </span>
                  )}
                </Button>
                <p className="text-[10px] text-[#86868B] text-center md:text-right font-medium">
                  Available until 00:00 (Midnight)
                </p>
              </div>
            )}
            
            {/* VIEW RECEIPT BUTTON */}
            {todayProfit?.status === 'claimed' && (
              <Button 
                variant="outline" 
                size="lg"
                className="border-[#333336] bg-transparent text-[#F5F5F7] font-semibold px-8 py-6 rounded-[20px] hover:bg-[#2C2C2E] hover:text-white active:scale-[0.96] transition-all duration-200"
                onClick={() => {
                  const now = new Date()
                  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  setReceiptData({
                    type: 'DAILY PROFIT',
                    amount: todayProfit.amount,
                    rate: todayProfit.total_percentage.toFixed(1) + '%',
                    wallet: 'Asset Wallet',
                    date: `${dateStr}, ${timeStr}`,
                    status: 'SUCCESS',
                    receipt_number: typeof todayProfit.id === 'string' ? 'VX-DP-' + todayProfit.id.slice(0, 8).toUpperCase() : 'VX-DP-' + Date.now().toString(36).toUpperCase(),
                    note: 'Daily profit added to Asset Wallet'
                  })
                  setShowReceipt(true)
                }}
              >
                <CheckCircle2 className="mr-2 h-5 w-5 text-[#34C759]" />
                View Receipt
              </Button>
            )}
            
            {/* LOCKED BUTTON (Before 10 AM) */}
            {!isProfitTime && !todayProfit && (
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <Button 
                  size="lg" 
                  disabled
                  className="bg-[#2C2C2E] text-[#86868B] font-bold text-sm sm:text-base px-10 py-7 h-auto rounded-[20px] opacity-100 select-none cursor-not-allowed border border-[#333336]"
                >
                  <span className="flex items-center justify-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <span>OPENS AT 10:00 AM WIB</span>
                  </span>
                </Button>
              </div>
            )}
          </div>
          
        </div>
      </div>

      {/* Market Analysis Card */}
      <MarketInsightCard profitRate={todayProfit?.total_percentage || todayRate || 1.0} />

      {/* 4 Main Action Buttons - PROMINENT */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Link href="/dashboard/deposit" className="block">
          <Card className="group h-full cursor-pointer border-2 border-transparent bg-gradient-to-br from-blue-500/5 to-blue-600/10 transition-all duration-300 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1">
            <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
              <div className="rounded-2xl bg-blue-500/10 p-4 transition-all duration-300 group-hover:bg-blue-500 group-hover:scale-110">
                <ArrowUpCircle className="h-10 w-10 text-blue-500 transition-colors group-hover:text-white" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">Deposit</p>
                <p className="text-xs text-muted-foreground">Add Funds</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/withdraw" className="block">
          <Card className="group h-full cursor-pointer border-2 border-transparent bg-gradient-to-br from-blue-500/5 to-blue-600/10 transition-all duration-300 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1">
            <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
              <div className="rounded-2xl bg-blue-500/10 p-4 transition-all duration-300 group-hover:bg-blue-500 group-hover:scale-110">
                <ArrowDownCircle className="h-10 w-10 text-blue-500 transition-colors group-hover:text-white" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">Withdraw</p>
                <p className="text-xs text-muted-foreground">Cash Out</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/rewards" className="block">
          <Card className="group h-full cursor-pointer border-2 border-transparent bg-gradient-to-br from-slate-1000/5 to-slate-500/10 transition-all duration-300 hover:border-slate-1000 hover:shadow-xl hover:shadow-slate-1000/20 hover:-translate-y-1">
            <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
              <div className="rounded-2xl bg-slate-1000/10 p-4 transition-all duration-300 group-hover:bg-slate-1000 group-hover:scale-110">
                <Trophy className="h-10 w-10 text-slate-1000 transition-colors group-hover:text-white" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">Rewards</p>
                <p className="text-xs text-muted-foreground">Rank & Bonus</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/team" className="block">
          <Card className="group h-full cursor-pointer border-2 border-transparent bg-gradient-to-br from-purple-500/5 to-violet-600/10 transition-all duration-300 hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1">
            <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
              <div className="rounded-2xl bg-purple-500/10 p-4 transition-all duration-300 group-hover:bg-purple-500 group-hover:scale-110">
                <Users className="h-10 w-10 text-purple-500 transition-colors group-hover:text-white" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">Team</p>
                <p className="text-xs text-muted-foreground">Network Tree</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Current Rank */}
        <Card className="border-slate-1000/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Star className="h-4 w-4 text-slate-1000" />
              Current Rank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-blue-500 text-sm font-bold text-white shadow-lg">
                  {profile?.rank?.replace('P', '').replace(' SPARK', '') || 'S'}
                </div>
                <div>
                  <p className="font-bold">{profile?.rank || 'Starter'}</p>
                  <p className="text-xs text-muted-foreground">Leadership</p>
                </div>
              </div>
              <Link href="/dashboard/rewards">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Total Earned */}
        <Card className="border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-500">
              {formatCurrency(profile?.total_profit_earned || 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Lifetime profit + bonuses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <Link href="/dashboard/history">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View All
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground">Make your first deposit to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-lg border bg-card/50 p-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${
                      tx.type === 'deposit' ? 'bg-blue-500/10 text-blue-500' :
                      tx.type === 'withdrawal' ? 'bg-red-500/10 text-red-500' :
                      tx.type === 'profit_claim' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-purple-500/10 text-purple-500'
                    }`}>
                      {tx.type === 'deposit' && <ArrowUpCircle className="h-4 w-4" />}
                      {tx.type === 'withdrawal' && <ArrowDownCircle className="h-4 w-4" />}
                      {tx.type === 'profit_claim' && <TrendingUp className="h-4 w-4" />}
                      {tx.type === 'sponsor_bonus' && <Gift className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium capitalize">{tx.type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      tx.type === 'withdrawal' ? 'text-red-500' : 'text-blue-500'
                    }`}>
                      {tx.type === 'withdrawal' ? '-' : '+'}{formatCurrency(tx.amount)}
                    </p>
                    <p className={`text-xs font-medium ${
                      tx.status === 'completed' ? 'text-blue-500' :
                      tx.status === 'pending' ? 'text-slate-1000' :
                      'text-red-500'
                    }`}>
                      {tx.status.toUpperCase()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        data={receiptData}
      />
    </div>
  )
}
