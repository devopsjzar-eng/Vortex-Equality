'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft,
  TrendingUp, 
  TrendingDown, 
  Activity, 
  RefreshCw,
  Shield,
  Users,
  Target,
  Eye,
  DollarSign,
  BarChart3,
  PieChart,
  Briefcase,
  Globe,
  Zap,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ============================================
// TYPES
// ============================================
interface MarketData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  sparkline: number[]
  allocation: number
  value: number
  category: 'crypto' | 'forex' | 'commodity' | 'index'
}

interface TradingActivity {
  id: string
  action: string
  asset: string
  amount: string
  profit: number
  profitPercent: number
  timestamp: Date
  status: 'profit' | 'loss' | 'neutral'
}

// ============================================
// CONSTANTS - FUND DATA
// ============================================
const TOTAL_AUM = 67845230 // Total Assets Under Management
const MONTHLY_RETURN = 2.45
const YTD_RETURN = 28.6
const WIN_RATE = 87.3

const ASSET_ALLOCATION = [
  { name: 'Cryptocurrency', percentage: 40, color: '#3b82f6', value: TOTAL_AUM * 0.40 },
  { name: 'Forex Trading', percentage: 25, color: '#8b5cf6', value: TOTAL_AUM * 0.25 },
  { name: 'Gold & Commodities', percentage: 20, color: '#f59e0b', value: TOTAL_AUM * 0.20 },
  { name: 'Stocks & Indices', percentage: 10, color: '#10b981', value: TOTAL_AUM * 0.10 },
  { name: 'Reserve Fund', percentage: 5, color: '#6b7280', value: TOTAL_AUM * 0.05 },
]

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`
  }
  return `$${value.toFixed(2)}`
}

function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function generateMarketData(): MarketData[] {
  const now = new Date()
  const baseData = [
    { symbol: 'BTC/USD', name: 'Bitcoin', basePrice: 67845, volatility: 0.02, allocation: 25, category: 'crypto' as const },
    { symbol: 'ETH/USD', name: 'Ethereum', basePrice: 3456, volatility: 0.025, allocation: 15, category: 'crypto' as const },
    { symbol: 'XAU/USD', name: 'Gold', basePrice: 2345, volatility: 0.008, allocation: 20, category: 'commodity' as const },
    { symbol: 'EUR/USD', name: 'Euro', basePrice: 1.0856, volatility: 0.005, allocation: 15, category: 'forex' as const },
    { symbol: 'GBP/USD', name: 'British Pound', basePrice: 1.2734, volatility: 0.006, allocation: 10, category: 'forex' as const },
    { symbol: 'SPY', name: 'S&P 500 ETF', basePrice: 528.75, volatility: 0.01, allocation: 10, category: 'index' as const },
    { symbol: 'USDT', name: 'Reserve Fund', basePrice: 1.00, volatility: 0, allocation: 5, category: 'crypto' as const },
  ]

  return baseData.map((item) => {
    const randomFactor = (Math.random() - 0.48) * item.volatility
    const change = item.basePrice * randomFactor
    const price = item.basePrice + change
    const changePercent = (change / item.basePrice) * 100

    const sparkline: number[] = []
    let tempPrice = item.basePrice * 0.995
    for (let i = 0; i < 24; i++) {
      tempPrice += (Math.random() - 0.48) * item.basePrice * 0.003
      sparkline.push(tempPrice)
    }
    sparkline.push(price)

    return {
      symbol: item.symbol,
      name: item.name,
      price: Number(price.toFixed(item.category === 'forex' ? 4 : 2)),
      change: Number(change.toFixed(item.category === 'forex' ? 4 : 2)),
      changePercent: Number(changePercent.toFixed(2)),
      sparkline,
      allocation: item.allocation,
      value: TOTAL_AUM * (item.allocation / 100),
      category: item.category,
    }
  })
}

function generateTradingActivity(): TradingActivity[] {
  const activities = [
    { action: 'BTC position increased', asset: 'Bitcoin', amount: '+$500K', profit: 3720, profitPercent: 0.74, status: 'profit' as const },
    { action: 'Gold position profit secured', asset: 'Gold', amount: '$2.5M', profit: 28125, profitPercent: 1.2, status: 'profit' as const },
    { action: 'EUR/USD trade closed', asset: 'Forex', amount: '$1.2M', profit: 10200, profitPercent: 0.85, status: 'profit' as const },
    { action: 'ETH position rebalanced', asset: 'Ethereum', amount: '$800K', profit: 0, profitPercent: 0, status: 'neutral' as const },
    { action: 'S&P 500 new position opened', asset: 'Index', amount: '$600K', profit: 0, profitPercent: 0, status: 'neutral' as const },
    { action: 'GBP/USD minor adjustment', asset: 'Forex', amount: '$400K', profit: -1200, profitPercent: -0.3, status: 'loss' as const },
  ]

  const now = new Date()
  return activities.map((activity, index) => ({
    ...activity,
    id: `activity-${index}`,
    timestamp: new Date(now.getTime() - index * 3600000 * (2 + Math.random() * 4)),
  }))
}

// ============================================
// COMPONENTS
// ============================================

// Sparkline Chart
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = 100 - ((value - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-gradient-${positive ? 'up' : 'down'}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={positive ? '#3b82f6' : '#ef4444'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? '#3b82f6' : '#ef4444'} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polygon
        fill={`url(#spark-gradient-${positive ? 'up' : 'down'})`}
        points={`0,100 ${points} 100,100`}
      />
      <polyline
        fill="none"
        stroke={positive ? '#3b82f6' : '#ef4444'}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Donut Chart for Asset Allocation
function DonutChart({ data }: { data: typeof ASSET_ALLOCATION }) {
  const total = data.reduce((sum, item) => sum + item.percentage, 0)
  let currentAngle = -90

  return (
    <div className="relative">
      <svg viewBox="0 0 100 100" className="h-48 w-48 md:h-56 md:w-56">
        {data.map((item, index) => {
          const angle = (item.percentage / total) * 360
          const startAngle = currentAngle
          const endAngle = currentAngle + angle
          currentAngle = endAngle

          const startRad = (startAngle * Math.PI) / 180
          const endRad = (endAngle * Math.PI) / 180

          const x1 = 50 + 40 * Math.cos(startRad)
          const y1 = 50 + 40 * Math.sin(startRad)
          const x2 = 50 + 40 * Math.cos(endRad)
          const y2 = 50 + 40 * Math.sin(endRad)

          const largeArc = angle > 180 ? 1 : 0

          return (
            <path
              key={index}
              d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={item.color}
              className="transition-all duration-300 hover:opacity-80"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
            />
          )
        })}
        <circle cx="50" cy="50" r="25" fill="#0d1117" />
        <text x="50" y="47" textAnchor="middle" className="fill-white text-[6px] font-bold">
          AUM
        </text>
        <text x="50" y="56" textAnchor="middle" className="fill-slate-400 text-[4px]">
          $67.8M
        </text>
      </svg>
    </div>
  )
}

// Performance Chart (Area Chart)
function PerformanceChart() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  const values = [52.5, 55.8, 58.2, 61.5, 64.8, 67.8]
  
  const min = Math.min(...values) * 0.95
  const max = Math.max(...values) * 1.02
  const range = max - min

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100
      const y = 100 - ((value - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="relative h-48 w-full">
      <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="perf-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        ))}
        
        {/* Area fill */}
        <polygon
          fill="url(#perf-gradient)"
          points={`0,100 ${points} 100,100`}
        />
        
        {/* Line */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          points={points}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {values.map((value, index) => {
          const x = (index / (values.length - 1)) * 100
          const y = 100 - ((value - min) / range) * 100
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              fill="#3b82f6"
              stroke="#0d1117"
              strokeWidth="1"
            />
          )
        })}
      </svg>
      
      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 text-[10px] text-slate-500">
        {months.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function FundManagementPage() {
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [activities, setActivities] = useState<TradingActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [selectedPeriod, setSelectedPeriod] = useState<'7D' | '30D' | '90D' | '1Y'>('30D')

  const refreshData = useCallback(() => {
    setMarketData(generateMarketData())
    setActivities(generateTradingActivity())
    setLastUpdate(new Date())
  }, [])

  useEffect(() => {
    refreshData()
    setIsLoading(false)
    const interval = setInterval(refreshData, 5000)
    return () => clearInterval(interval)
  }, [refreshData])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-8">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0d1117]/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2 text-slate-400 hover:text-white">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white md:text-2xl">Vortex Equality Fund</h1>
                <p className="text-xs text-slate-400">Professional Asset Management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                LIVE
              </span>
              <span className="hidden text-xs text-slate-500 md:block">
                {lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshData}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Card className="border-white/5 bg-[#0d1117]/80 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Total AUM</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white md:text-3xl">$67.8M</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                +1.2% today
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-[#0d1117]/80 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Monthly Return</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-400 md:text-3xl">+{MONTHLY_RETURN}%</p>
              <p className="mt-1 text-xs text-slate-500">This month</p>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-[#0d1117]/80 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs">YTD Return</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-400 md:text-3xl">+{YTD_RETURN}%</p>
              <p className="mt-1 text-xs text-slate-500">Year to date</p>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-[#0d1117]/80 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Target className="h-4 w-4" />
                <span className="text-xs">Win Rate</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-400 md:text-3xl">{WIN_RATE}%</p>
              <p className="mt-1 text-xs text-slate-500">Success rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Asset Allocation */}
          <Card className="border-white/5 bg-[#0d1117]/80 backdrop-blur-xl lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <PieChart className="h-4 w-4 text-blue-400" />
                Asset Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <DonutChart data={ASSET_ALLOCATION} />
              </div>
              <div className="space-y-2">
                {ASSET_ALLOCATION.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-slate-400">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-white">{item.percentage}%</span>
                      <p className="text-[10px] text-slate-500">{formatCurrency(item.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Performance & Holdings */}
          <div className="space-y-6 lg:col-span-2">
            {/* Performance Chart */}
            <Card className="border-white/5 bg-[#0d1117]/80 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <BarChart3 className="h-4 w-4 text-blue-400" />
                    Fund Performance
                  </CardTitle>
                  <div className="flex gap-1">
                    {(['7D', '30D', '90D', '1Y'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setSelectedPeriod(period)}
                        className={cn(
                          'rounded px-2 py-1 text-xs font-medium transition-all',
                          selectedPeriod === period
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'text-slate-500 hover:text-slate-300'
                        )}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <PerformanceChart />
              </CardContent>
            </Card>

            {/* Live Market Prices */}
            <Card className="border-white/5 bg-[#0d1117]/80 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    Live Market Prices
                  </CardTitle>
                  <span className="text-[10px] text-slate-500">Auto-refresh 5s</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {marketData.slice(0, 6).map((item) => (
                    <div
                      key={item.symbol}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all hover:border-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">{item.symbol}</span>
                        <span className={cn(
                          'flex items-center gap-0.5 text-[10px] font-medium',
                          item.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                        )}>
                          {item.changePercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent}%
                        </span>
                      </div>
                      <p className="mt-1 text-lg font-bold text-white">
                        ${item.price.toLocaleString('en-US', { minimumFractionDigits: item.category === 'forex' ? 4 : 2 })}
                      </p>
                      <div className="mt-2 h-8 rounded bg-white/[0.02]">
                        <Sparkline data={item.sparkline} positive={item.changePercent >= 0} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Portfolio Holdings Table */}
        <Card className="border-white/5 bg-[#0d1117]/80 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Briefcase className="h-4 w-4 text-blue-400" />
              Portfolio Holdings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs text-slate-500">
                    <th className="pb-3 font-medium">Asset</th>
                    <th className="pb-3 font-medium">Allocation</th>
                    <th className="pb-3 font-medium text-right">Value</th>
                    <th className="pb-3 font-medium text-right">Current Price</th>
                    <th className="pb-3 font-medium text-right">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {marketData.map((item) => (
                    <tr key={item.symbol} className="text-sm">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold',
                            item.category === 'crypto' ? 'bg-blue-500/20 text-blue-400' :
                            item.category === 'forex' ? 'bg-purple-500/20 text-purple-400' :
                            item.category === 'commodity' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          )}>
                            {item.symbol.substring(0, 3)}
                          </div>
                          <div>
                            <p className="font-medium text-white">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${item.allocation}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">{item.allocation}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-medium text-white">
                        {formatCurrency(item.value)}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-300">
                        ${item.price.toLocaleString('en-US', { minimumFractionDigits: item.category === 'forex' ? 4 : 2 })}
                      </td>
                      <td className="py-3 text-right">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          item.changePercent >= 0
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        )}>
                          {item.changePercent >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Trading Activity & Strategy */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Trading Activity */}
          <Card className="border-white/5 bg-[#0d1117]/80 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Activity className="h-4 w-4 text-blue-400" />
                Recent Trading Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full',
                        activity.status === 'profit' ? 'bg-emerald-500/20' :
                        activity.status === 'loss' ? 'bg-red-500/20' :
                        'bg-slate-500/20'
                      )}>
                        {activity.status === 'profit' ? (
                          <TrendingUp className="h-4 w-4 text-emerald-400" />
                        ) : activity.status === 'loss' ? (
                          <TrendingDown className="h-4 w-4 text-red-400" />
                        ) : (
                          <Activity className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-white">{activity.action}</p>
                        <p className="text-xs text-slate-500">
                          {activity.timestamp.toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-300">{activity.amount}</p>
                      {activity.profitPercent !== 0 && (
                        <p className={cn(
                          'text-xs',
                          activity.profitPercent > 0 ? 'text-emerald-400' : 'text-red-400'
                        )}>
                          {activity.profitPercent > 0 ? '+' : ''}{activity.profitPercent}%
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Investment Strategy */}
          <Card className="border-white/5 bg-[#0d1117]/80 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Target className="h-4 w-4 text-blue-400" />
                Our Investment Strategy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                    <Globe className="h-5 w-5 text-blue-400" />
                  </div>
                  <h3 className="mt-3 font-medium text-white">Diversification</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Multi-asset allocation across crypto, forex, commodities, and indices for optimal risk-adjusted returns.
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                    <Shield className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="mt-3 font-medium text-white">Risk Management</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Strict stop-loss protocols and position sizing to protect member capital at all times.
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                    <Users className="h-5 w-5 text-purple-400" />
                  </div>
                  <h3 className="mt-3 font-medium text-white">Professional Team</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Expert traders with years of experience managing institutional-grade portfolios.
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                    <Eye className="h-5 w-5 text-amber-400" />
                  </div>
                  <h3 className="mt-3 font-medium text-white">Transparency</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Real-time reporting and complete visibility into fund performance and positions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-xs text-slate-500">
              Data is updated in real-time. Past performance does not guarantee future results.
            </p>
            <p className="text-xs text-slate-400">
              Powered by <span className="font-semibold text-blue-400">Vortex Trading Engine</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
