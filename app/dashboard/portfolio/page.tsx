'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Wallet, Transaction } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Loader2, 
  Wallet as WalletIcon, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  PiggyBank,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

export default function PortfolioPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalProfit: 0,
    totalBonus: 0
  })
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (profileData) setProfile(profileData)

      const { data: walletsData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
      if (walletsData) setWallets(walletsData)

      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'success')
      
      if (txData) {
        setTransactions(txData)
        const deposits = txData.filter(t => t.type === 'deposit').reduce((sum, t) => sum + Number(t.amount), 0)
        const withdrawals = txData.filter(t => t.type === 'withdraw').reduce((sum, t) => sum + Number(t.amount), 0)
        const profits = txData.filter(t => t.type === 'profit').reduce((sum, t) => sum + Number(t.amount), 0)
        const bonus = txData.filter(t => ['referral_bonus', 'rank_reward'].includes(t.type)).reduce((sum, t) => sum + Number(t.amount), 0)
        setStats({ totalDeposits: deposits, totalWithdrawals: withdrawals, totalProfit: profits, totalBonus: bonus })
      }

      setLoading(false)
    }
    fetchData()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const assetWallet = wallets.find(w => w.wallet_type === 'asset')
  const bonusWallet = wallets.find(w => w.wallet_type === 'bonus')
  const totalAssets = (Number(assetWallet?.balance || 0) + Number(bonusWallet?.balance || 0))
  const profitProgress = assetWallet ? (Number(assetWallet.total_profit) / (Number(assetWallet.total_deposit) * 4) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white lg:text-3xl">My Portfolio</h1>
        <p className="mt-1 text-slate-400">Complete overview of your investment portfolio</p>
      </div>

      {/* Total Portfolio Value */}
      <Card className="border-slate-800 bg-gradient-to-r from-slate-900 via-primary/10 to-slate-900">
        <CardContent className="p-6 lg:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Portfolio Value</p>
              <p className="mt-1 text-4xl font-bold text-white lg:text-5xl">
                ${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-2 flex items-center gap-2 text-blue-400">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Active Portfolio</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">${Number(assetWallet?.balance || 0).toLocaleString()}</p>
                <p className="text-xs text-slate-500">Sovereign Capital</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">${Number(bonusWallet?.balance || 0).toLocaleString()}</p>
                <p className="text-xs text-slate-500">Bonus Wallet</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <ArrowDownRight className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-xs text-slate-500">All time</span>
            </div>
            <p className="mt-4 text-2xl font-bold text-white">${stats.totalDeposits.toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate-400">Total Deposits</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-red-500/20 p-2">
                <ArrowUpRight className="h-5 w-5 text-red-400" />
              </div>
              <span className="text-xs text-slate-500">All time</span>
            </div>
            <p className="mt-4 text-2xl font-bold text-white">${stats.totalWithdrawals.toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate-400">Total Withdrawals</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-xs text-slate-500">ROI</span>
            </div>
            <p className="mt-4 text-2xl font-bold text-white">${stats.totalProfit.toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate-400">Trading Profits</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <Award className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-xs text-slate-500">Network</span>
            </div>
            <p className="mt-4 text-2xl font-bold text-white">${stats.totalBonus.toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate-400">Total Bonuses</p>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Asset Wallet Card */}
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-primary to-blue-600 p-3">
                <WalletIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-white">Sovereign Capital</CardTitle>
                <CardDescription>Passive income wallet (ROI)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-3xl font-bold text-white">
                ${Number(assetWallet?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-slate-500">Available Balance</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Deposit</span>
                <span className="font-medium text-white">${Number(assetWallet?.total_deposit || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Profit Earned</span>
                <span className="font-medium text-blue-400">+${Number(assetWallet?.total_profit || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Withdrawn</span>
                <span className="font-medium text-red-400">-${Number(assetWallet?.total_withdrawn || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* 400% Progress */}
            <div className="rounded-xl bg-slate-800 p-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-slate-400">Profit Cap Progress</span>
                <span className="font-medium text-primary">{Math.min(profitProgress, 100).toFixed(1)}% / 400%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-700">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-500"
                  style={{ width: `${Math.min(profitProgress / 4, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Re-invest required when 400% profit cap is reached
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bonus Wallet Card */}
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-3">
                <PiggyBank className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-white">Bonus Wallet</CardTitle>
                <CardDescription>Active income wallet (No cap)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-3xl font-bold text-white">
                ${Number(bonusWallet?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-slate-500">Available Balance</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Sponsor Bonuses</span>
                <span className="font-medium text-white">${stats.totalBonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Rank Rewards</span>
                <span className="font-medium text-blue-400">$0.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Withdrawn</span>
                <span className="font-medium text-red-400">-${Number(bonusWallet?.total_withdrawn || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Unlimited Badge */}
            <div className="rounded-xl bg-gradient-to-r from-blue-500/20 to-blue-500/20 p-4">
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="font-semibold text-white">Unlimited Earnings</p>
                  <p className="text-sm text-slate-400">No cap on bonus wallet withdrawals</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Rank */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">Current Leadership Rank</CardTitle>
          <CardDescription>Your position in the Vortex Equality leadership program</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600">
              <Award className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{profile?.rank || 'P1'}</p>
              <p className="text-slate-400">
                {profile?.rank === 'P1' && 'Spark - Entry Level'}
                {profile?.rank === 'P2' && 'Rising Star'}
                {profile?.rank === 'P3' && 'Elite Trader'}
                {profile?.rank === 'P4' && 'Master Investor'}
                {profile?.rank === 'P5' && 'Legendary Pioneer'}
              </p>
              <p className="mt-1 text-sm text-primary">
                Monthly Salary: ${profile?.rank === 'P1' ? '100' : profile?.rank === 'P2' ? '300' : profile?.rank === 'P3' ? '500' : profile?.rank === 'P4' ? '3,000' : '5,000'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
