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
        {/* ASSET WALLET - APPLE MATTE LUXURY DESIGN */}
        <div className="relative overflow-hidden rounded-[24px] bg-[#1C1C1E] border border-[#2C2C2E] shadow-2xl">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Wallet className="h-32 w-32 text-white" />
          </div>
          
          <div className="relative z-10 p-6 sm:p-8 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-[#2C2C2E] rounded-full p-2">
                  <Wallet className="h-4 w-4 text-[#F5F5F7]" />
                </div>
                <h3 className="font-medium text-[#A1A1A6] tracking-wide text-sm">Asset Wallet</h3>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2C2C2E]/50 border border-[#333336]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0071E3] animate-pulse"></div>
                <span className="text-[9px] uppercase tracking-widest text-[#86868B] font-semibold">Auto-Compound</span>
              </div>
            </div>
            
            <div className="mb-8">
              <p className="text-4xl sm:text-5xl font-bold tracking-tighter text-[#F5F5F7]">
                {formatCurrency(assetBalance)}
              </p>
              <p className="mt-2 text-xs font-medium text-[#86868B]">
                Active Capital: <span className="text-[#A1A1A6]">{formatCurrency(assetWallet?.initial_capital || 0)}</span>
              </p>
            </div>

            {/* Premium ROI Progress */}
            <div className="mt-auto space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#86868B]">ROI Progress</span>
                <span className={cn(
                  "text-xs font-bold font-mono tracking-tight",
                  isMaxROI ? 'text-[#FF3B30]' : 'text-[#F5F5F7]'
                )}>
                  {roiPercentage.toFixed(1)}% <span className="text-[#55555A]">/ 400%</span>
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#2C2C2E] overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out",
                    isMaxROI ? "bg-[#FF3B30]" : "bg-gradient-to-r from-[#0071E3] to-[#5E5CE6]"
                  )}
                  style={{ width: `${roiProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#2C2C2E]/60">
                <span className="text-[11px] font-medium text-[#86868B]">Withdrawal Fee</span>
                <span className={cn(
                  "text-xs font-bold",
                  roiPercentage >= 100 ? "text-[#34C759]" : "text-[#F5F5F7]"
                )}>
                  {roiPercentage >= 100 ? '5%' : '20%'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BONUS WALLET - APPLE MATTE LUXURY DESIGN */}
        <div className="relative overflow-hidden rounded-[24px] bg-[#1C1C1E] border border-[#2C2C2E] shadow-2xl">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Gift className="h-32 w-32 text-white" />
          </div>
          
          <div className="relative z-10 p-6 sm:p-8 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-[#2C2C2E] rounded-full p-2">
                  <Gift className="h-4 w-4 text-[#F5F5F7]" />
                </div>
                <h3 className="font-medium text-[#A1A1A6] tracking-wide text-sm">Bonus Wallet</h3>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2C2C2E]/50 border border-[#333336]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#34C759]"></div>
                <span className="text-[9px] uppercase tracking-widest text-[#86868B] font-semibold">No Limit</span>
              </div>
            </div>
            
            <div className="mb-8">
              <p className="text-4xl sm:text-5xl font-bold tracking-tighter text-[#F5F5F7]">
                {formatCurrency(bonusBalance)}
              </p>
              <p className="mt-2 text-xs font-medium text-[#86868B]">
                Source: <span className="text-[#A1A1A6]">Sponsor + Rank Rewards</span>
              </p>
            </div>

            <div className="mt-auto pt-4 border-t border-[#2C2C2E]/60 flex flex-col justify-end">
              <div className="flex items-center justify-between mt-4">
                <span className="text-[11px] font-medium text-[#86868B]">Withdrawal Fee</span>
                <span className="text-xs font-bold text-[#34C759]">5% Flat</span>
              </div>
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>

      {/* Fund Management Card - Below Wallet Cards */}
      <FundManagementCard />

      {/* DAILY PROFIT CLAIM CARD - APPLE MATTE LUXURY STYLE */}
      <div className="relative overflow-hidden rounded-[24px] bg-[#1C1C1E] border border-[#2C2C2E] shadow-2xl mt-4">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="bg-[#2C2C2E] rounded-2xl p-3 sm:p-4 border border-[#333336]">
              <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-[#0071E3]" />
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="text-sm sm:text-base font-semibold text-[#A1A1A6] uppercase tracking-widest mb-1">Daily Profit</h3>
              
              {todayProfit?.status === 'claimed' ? (
                <>
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight text-[#34C759]">Claimed for today!</p>
                  <p className="text-[11px] sm:text-xs font-medium text-[#86868B] mt-1">
                    +{formatCurrency(todayProfit.amount)} ({todayProfit.total_percentage.toFixed(1)}%) added to Asset Wallet
                  </p>
                </>
              ) : !isProfitTime ? (
                <>
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight text-[#55555A]">Not Available Yet</p>
                  <p className="text-[11px] sm:text-xs font-bold text-[#FF9F0A] mt-1 tracking-wide">
                    CLAIM OPENS AT 10:00 AM (WIB)
                  </p>
                </>
              ) : profile && profile.total_deposit === 0 ? (
                <>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight text-[#55555A]">No Profit Today</p>
                  <p className="text-[11px] sm:text-xs font-medium text-[#86868B] mt-1">
                    You need an active deposit to earn daily profit.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-4xl sm:text-5xl font-bold tracking-tighter text-[#F5F5F7]">
                    +{todayRate}%
                  </p>
                  <p className="text-[11px] sm:text-xs font-medium text-[#86868B] mt-1">
                    Today&apos;s Rate: <span className="text-[#A1A1A6]">{todayRate}% of your active capital</span>
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 md:items-end w-full md:w-auto mt-2 md:mt-0">
            {/* MANUAL CLAIM BUTTON */}
            {isProfitTime && profile && profile.total_deposit > 0 && todayProfit?.status !== 'claimed' && (
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <Button 
                  size="lg" 
                  className="bg-[#0071E3] hover:bg-[#0077ED] active:bg-[#0062C3] text-white font-bold text-sm sm:text-base px-8 py-6 h-auto rounded-[16px] shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all duration-200"
                  onClick={handleClaimProfit}
                  disabled={claiming}
                >
                  {claiming ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Processing claim...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Gift className="h-5 w-5" />
                      <span>CLAIM PROFIT {todayRate}%</span>
                    </span>
                  )}
                </Button>
                <p className="text-[10px] text-[#86868B] text-center md:text-right uppercase tracking-wider font-medium">
                  Available until 00:00 (Midnight)
                </p>
              </div>
            )}
            
            {todayProfit?.status === 'claimed' && (
              <Button 
                variant="outline" 
                size="lg"
                className="border-[#333336] bg-transparent text-[#F5F5F7] font-semibold px-8 py-5 rounded-[16px] hover:bg-[#2C2C2E] hover:text-white active:scale-[0.98] transition-all duration-200"
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
                View Receipt
              </Button>
            )}
            
            {!isProfitTime && !todayProfit && (
              <div className="text-center md:text-right bg-[#2C2C2E] px-4 py-2.5 rounded-xl border border-[#333336]">
                <p className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">Profit Hours</p>
                <p className="text-xs font-bold text-[#F5F5F7] mt-0.5">10:00 AM - 11:59 PM</p>
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
