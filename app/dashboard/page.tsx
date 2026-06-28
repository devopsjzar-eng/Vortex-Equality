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
  id: string | null
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

interface FinancialWallet {
  main_balance: number
  active_deposit: number
  network_bonus_balance: number
  unclaimed_profit: number
  total_claimed_profit: number
  total_withdrawn: number
  is_bep_reached: boolean
  is_maxed_out: boolean
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [assetBalance, setAssetBalance] = useState(0)
  const [bonusBalance, setBonusBalance] = useState(0)
  const [activeDeposit, setActiveDeposit] = useState(0)
  const [unclaimedProfit, setUnclaimedProfit] = useState(0)
  const [totalClaimedProfit, setTotalClaimedProfit] = useState(0)
  const [totalWithdrawn, setTotalWithdrawn] = useState(0)
  const [isBepReached, setIsBepReached] = useState(false)
  const [isMaxedOut, setIsMaxedOut] = useState(false)
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
        console.log('[Vortex] TEST MODE: Using override time:', testTimeParam)
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
    console.log('[Vortex] Initial profit time check:', jakartaNow.getHours(), '>=', 10, '=', initialProfitTime)
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

      let currentUnclaimedProfit = 0

      // Run financial reads in parallel. Legacy profile is still used for name/rank/referral code.
      const [profileRes, financialWalletRes, ledgerRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('financial_wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('ledger_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
      ])
      
      if (profileRes.data) setProfile(profileRes.data)
      if (financialWalletRes.data) {
        const wallet = financialWalletRes.data as FinancialWallet
        setAssetBalance(Number(wallet.main_balance || 0))
        setBonusBalance(Number(wallet.network_bonus_balance || 0))
        setActiveDeposit(Number(wallet.active_deposit || 0))
        currentUnclaimedProfit = Number(wallet.unclaimed_profit || 0)
        setUnclaimedProfit(currentUnclaimedProfit)
        setTotalClaimedProfit(Number(wallet.total_claimed_profit || 0))
        setTotalWithdrawn(Number(wallet.total_withdrawn || 0))
        setIsBepReached(Boolean(wallet.is_bep_reached))
        setIsMaxedOut(Boolean(wallet.is_maxed_out))
      }
      if (ledgerRes.data) {
        setTransactions(ledgerRes.data.map((entry: any) => ({
          id: entry.id,
          type: entry.entry_type,
          amount: Math.abs(Number(entry.amount || 0)),
          status: 'completed',
          created_at: entry.created_at,
          wallet_type: 'main',
          receipt_data: entry.metadata,
        })))
      }

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
          status: currentUnclaimedProfit > 0 ? 'available' : 'unavailable',
          amount: currentUnclaimedProfit,
          total_percentage: 0,
          id: null,
          created_at: ''
        })
      }

    } catch (error) {
      console.error('[Vortex] Dashboard fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleClaimProfit = async () => {
    if (claiming) {
      toast.info('Claim is already processing...')
      return
    }
    
    if (todayProfit?.status === 'claimed') {
      toast.info('You already claimed profit today.')
      return
    }
    
    if (!userId) {
      toast.error('User not found. Please log in again.')
      return
    }
    
    setClaiming(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      const res = await fetch('/api/profit/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimDate: new Date().toISOString().slice(0, 10) }),
        credentials: 'include',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      // Check if response is JSON
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[Vortex] API returned non-JSON response:', await res.text())
        toast.error('Server error. Please refresh the page and try again.')
        setClaiming(false)
        return
      }
      
      const data = await res.json()
      
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to claim profit. Please try again.')
        setClaiming(false)
        return
      }

      const claimedAmount = Number(data.wallet?.main_balance || 0) - assetBalance
      const displayedAmount = claimedAmount > 0 ? claimedAmount : todayProfit?.amount || unclaimedProfit
      
      toast.success(`Profit ${formatCurrency(displayedAmount)} claimed successfully!`, {
        description: 'Funds were moved to your Main Wallet.',
        duration: 5000
      })
      
      setTodayProfit({ status: 'claimed', amount: displayedAmount, total_percentage: todayProfit?.total_percentage || 0, id: data.wallet?.user_id })
      
      fetchData()
      
      const now = new Date()
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      
      setReceiptData({
        type: 'DAILY PROFIT',
        amount: displayedAmount,
        rate: `${todayProfit?.total_percentage || todayRate}%`,
        wallet: 'Main Wallet',
        date: `${dateStr}, ${timeStr}`,
        status: 'SUCCESS',
        receipt_number: 'VX-DP-' + Date.now().toString(36).toUpperCase(),
        note: 'Claimed from Unclaimed Profit'
      })
      setShowReceipt(true)
      
    } catch (error) {
      console.error('[Vortex] Claim error:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setClaiming(false)
    }
  }

  // ROI = how much the active deposit has grown above the initial deposit.
  // Matches live system: (current_balance - initial_deposit) / initial_deposit × 100
  const initialDeposit = Number(profile?.total_deposit || 0)
  const roiPercentage = initialDeposit > 0 && activeDeposit > initialDeposit
    ? ((activeDeposit - initialDeposit) / initialDeposit) * 100
    : 0
  const roiProgress = Math.min(Math.max(roiPercentage / 4, 0), 100) // Progress to 400%
  const isMaxROI = isMaxedOut || roiPercentage >= 400

  // Use isProfitTimeState from useEffect to avoid frequent visual changes.
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
        {/* Main Wallet */}
        <Card className="relative overflow-hidden border border-amber-500/20 bg-[#0d1117]/80 shadow-2xl backdrop-blur-xl min-w-0" style={{boxShadow: '0 0 40px rgba(212,175,55,0.08), 0 8px 32px rgba(0,0,0,0.5)'}}>
          {/* Gold glow effect */}
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-amber-500/10 blur-[80px]" />
          <div className="absolute -left-20 -bottom-20 h-32 w-32 rounded-full bg-yellow-400/5 blur-[60px]" />
          {/* Top gold shimmer line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

          <CardHeader className="relative px-5 pt-5 pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-600/10 ring-1 ring-amber-500/20">
                  <Wallet className="h-5 w-5 text-amber-400" />
                </div>
              <span className="text-sm font-medium text-slate-300">Main Wallet</span>
              </div>
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400 ring-1 ring-amber-500/20">
                Auto-Compound
              </span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="relative px-5 pb-5 pt-2 space-y-4">
            {/* Balance */}
            <div>
              <p className="text-3xl font-bold tracking-tight text-white">
                {formatCurrency(activeDeposit)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Initial Deposit: {formatCurrency(initialDeposit)}
              </p>
            </div>

            {/* ROI Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">ROI Progress</span>
                <span className={cn(
                  "font-semibold",
                  isMaxROI ? 'text-red-400' : isBepReached ? 'text-emerald-400' : 'text-amber-400'
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
                      : isBepReached
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-400'
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
              {!isMaxROI && isBepReached && (
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
                isBepReached ? 'text-emerald-400' : 'text-slate-300'
              )}>
                {isBepReached ? '5%' : '20%'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 ring-1 ring-white/[0.06]">
              <span className="text-xs text-slate-500">Total Withdrawn</span>
              <span className="text-sm font-semibold text-slate-300">{formatCurrency(totalWithdrawn)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Network Bonus Wallet */}
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
                <span className="text-sm font-medium text-slate-300">Network Bonus Wallet</span>
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

      {/* Daily Profit Claim Card */}
      <Card className={`relative overflow-hidden border-2 mt-4 ${
        todayProfit?.status === 'available'
          ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-yellow-500/8 to-amber-500/5'
          : todayProfit?.status === 'claimed'
          ? 'border-amber-500/20 bg-amber-500/5'
          : 'border-muted bg-muted/20'
      }`}>
        {todayProfit?.status === 'available' && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent animate-pulse" />
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-500/20 blur-2xl" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
          </>
        )}
        <CardContent className="relative p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className={`rounded-2xl p-4 ${
                todayProfit?.status === 'available'
                  ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-black shadow-lg shadow-amber-500/40'
                  : todayProfit?.status === 'claimed'
                  ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-black'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {todayProfit?.status === 'claimed' ? (
                  <CheckCircle2 className="h-8 w-8" />
                ) : (
                  <Sparkles className="h-8 w-8" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold">Daily Profit</h3>
                {todayProfit?.status === 'available' ? (
                  <>
                    <p className="text-3xl font-bold text-amber-400">
                      +{todayRate}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Today&apos;s Rate: {todayRate}% of your deposit
                    </p>
                  </>
                ) : todayProfit?.status === 'claimed' ? (
                  <>
                    <p className="text-xl font-semibold text-amber-400">Claimed Today!</p>
                    <p className="text-sm text-muted-foreground">
                      +{formatCurrency(todayProfit.amount)} ({todayProfit.total_percentage.toFixed(1)}%) added to Main Wallet
                    </p>
                  </>
                ) : !isProfitTime ? (
                  <>
                    <p className="text-lg font-semibold text-muted-foreground">Not Available Yet</p>
                    <div className="mt-1">
                      <CountdownTimer type="until-available" targetHour={10} />
                    </div>
                  </>
                ) : activeDeposit === 0 ? (
                  <>
                    <p className="text-lg font-semibold text-muted-foreground">No Profit Today</p>
                    <p className="text-sm text-muted-foreground">
                      Make a deposit to start earning daily profits!
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-blue-500">+{todayRate}% Available</p>
                    <p className="text-sm text-muted-foreground">
                      Click claim to receive your daily profit
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2 md:items-end">
              {/* MANUAL CLAIM BUTTON - Always show if profit time and has deposit and not claimed */}
              {isProfitTime && activeDeposit > 0 && todayProfit?.status !== 'claimed' && (
                <>
                  <Button 
                    size="lg" 
                    className="luxury-claim-button h-auto px-8 py-5 text-base font-semibold sm:text-lg"
                    onClick={handleClaimProfit}
                    disabled={claiming}
                  >
                    {claiming ? (
                      <span className="flex items-center gap-3">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                        <span>Claiming...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        <Gift className="h-6 w-6" />
                        <span>Claim Profit {todayRate}%</span>
                      </span>
                    )}
                  </Button>
                  <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground md:justify-end">
                    <CompactCountdown type="until-expires" targetHour={24} />
                    <span>left to claim</span>
                  </p>
                </>
              )}
              {todayProfit?.status === 'claimed' && (
                <Button 
                  variant="outline" 
                  size="lg"
                  className="rounded-lg border-primary px-8 py-5 font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  onClick={() => {
                  const now = new Date()
                  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  setReceiptData({
                    type: 'DAILY PROFIT',
                    amount: todayProfit.amount,
                    rate: todayProfit.total_percentage.toFixed(1) + '%',
                    wallet: 'Main Wallet',
                    date: `${dateStr}, ${timeStr}`,
                    status: 'SUCCESS',
                    receipt_number: typeof todayProfit.id === 'string' ? 'VX-DP-' + todayProfit.id.slice(0, 8).toUpperCase() : 'VX-DP-' + Date.now().toString(36).toUpperCase(),
                    note: 'Daily profit added to Main Wallet'
                  })
                  setShowReceipt(true)
                }}>
                  View Receipt
                </Button>
              )}
              {!isProfitTime && !todayProfit && (
                <div className="text-center md:text-right">
                  <p className="text-sm font-medium text-muted-foreground">Profit Hours:</p>
                  <p className="text-xs text-muted-foreground">10:00 AM - 11:59 PM</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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

