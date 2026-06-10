"use client"

import { useEffect, useState, useCallback } from "react"
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  CheckCircle2,
  Circle,
  ArrowUpRight,
  Shield,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TradingPosition {
  id: string
  asset: string
  type: "LONG" | "SHORT"
  entryPrice: number
  currentPrice: number
  quantity: number
  pnl: number
  pnlPercent: number
  status: "open" | "closed"
  openTime: string
  closeTime?: string
}

interface TradingStats {
  totalVolume: number
  grossProfit: number
  profitRate: number
  winRate: number
  totalTrades: number
  openPositions: number
  breakdown: {
    gold: { amount: number; percent: number }
    stocks: { amount: number; percent: number }
    forex: { amount: number; percent: number }
  }
  memberShare: number
  companyReserve: number
}

// Generate realistic trading data
function generateTradingData(dailyProfitRate: number): { positions: TradingPosition[]; stats: TradingStats } {
  const baseVolume = 100000 + Math.random() * 150000 // $100k - $250k daily volume
  const grossProfit = baseVolume * (dailyProfitRate / 100)
  
  // Breakdown percentages
  const goldPercent = 55 + Math.floor(Math.random() * 15) // 55-70%
  const stockPercent = 20 + Math.floor(Math.random() * 15) // 20-35%
  const forexPercent = 100 - goldPercent - stockPercent

  const stats: TradingStats = {
    totalVolume: baseVolume,
    grossProfit,
    profitRate: dailyProfitRate,
    winRate: 65 + Math.random() * 20, // 65-85% win rate
    totalTrades: 12 + Math.floor(Math.random() * 18), // 12-30 trades
    openPositions: 3 + Math.floor(Math.random() * 5), // 3-8 open
    breakdown: {
      gold: { amount: grossProfit * (goldPercent / 100), percent: goldPercent },
      stocks: { amount: grossProfit * (stockPercent / 100), percent: stockPercent },
      forex: { amount: grossProfit * (forexPercent / 100), percent: forexPercent },
    },
    memberShare: grossProfit * 0.5,
    companyReserve: grossProfit * 0.5,
  }

  // Generate positions
  const assets = [
    { symbol: "XAU/USD", name: "Gold", basePrice: 2341, volatility: 0.008 },
    { symbol: "BTC/USD", name: "Bitcoin", basePrice: 67500, volatility: 0.02 },
    { symbol: "ETH/USD", name: "Ethereum", basePrice: 3420, volatility: 0.025 },
    { symbol: "AAPL", name: "Apple", basePrice: 198, volatility: 0.015 },
    { symbol: "NVDA", name: "Nvidia", basePrice: 945, volatility: 0.03 },
    { symbol: "TSLA", name: "Tesla", basePrice: 178, volatility: 0.025 },
    { symbol: "GOOGL", name: "Google", basePrice: 176, volatility: 0.018 },
    { symbol: "MSFT", name: "Microsoft", basePrice: 425, volatility: 0.015 },
    { symbol: "EUR/USD", name: "Euro", basePrice: 1.085, volatility: 0.005 },
    { symbol: "SPY", name: "S&P 500", basePrice: 528, volatility: 0.01 },
  ]

  const positions: TradingPosition[] = []
  const numPositions = 6 + Math.floor(Math.random() * 6)

  for (let i = 0; i < numPositions; i++) {
    const asset = assets[Math.floor(Math.random() * assets.length)]
    const isLong = Math.random() > 0.3
    const entryPrice = asset.basePrice * (1 + (Math.random() - 0.5) * 0.02)
    const priceChange = entryPrice * (Math.random() * asset.volatility * 2 - asset.volatility * 0.3)
    const currentPrice = entryPrice + (isLong ? priceChange : -priceChange)
    const quantity = Math.floor(Math.random() * 50) + 10
    const pnl = (currentPrice - entryPrice) * quantity * (isLong ? 1 : -1)
    const pnlPercent = (pnl / (entryPrice * quantity)) * 100
    const isClosed = Math.random() > 0.4

    const hours = Math.floor(Math.random() * 8)
    const minutes = Math.floor(Math.random() * 60)
    const openTime = `${String(9 + hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    const closeTime = isClosed ? `${String(10 + hours + Math.floor(Math.random() * 3)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` : undefined

    positions.push({
      id: `TRD-${Date.now()}-${i}`,
      asset: asset.symbol,
      type: isLong ? "LONG" : "SHORT",
      entryPrice: Number(entryPrice.toFixed(asset.symbol.includes("/") ? 4 : 2)),
      currentPrice: Number(currentPrice.toFixed(asset.symbol.includes("/") ? 4 : 2)),
      quantity,
      pnl: Number(pnl.toFixed(2)),
      pnlPercent: Number(pnlPercent.toFixed(2)),
      status: isClosed ? "closed" : "open",
      openTime,
      closeTime,
    })
  }

  // Sort: open positions first, then by time
  positions.sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1
    return a.openTime.localeCompare(b.openTime)
  })

  return { positions, stats }
}

// Stats Card Component
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  color = "amber" 
}: { 
  icon: React.ElementType
  label: string
  value: string
  subValue?: string
  color?: "amber" | "emerald" | "blue" | "purple"
}) {
  const colorClasses = {
    amber: "from-slate-1000 to-blue-600",
    emerald: "from-blue-500 to-blue-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-pink-600",
  }

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className={cn("rounded-lg bg-gradient-to-br p-2", colorClasses[color])}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="font-mono text-xl font-bold text-white">{value}</p>
      {subValue && <p className="mt-1 text-xs text-slate-500">{subValue}</p>}
    </div>
  )
}

// Position Row Component
function PositionRow({ position }: { position: TradingPosition }) {
  const isProfit = position.pnl >= 0

  return (
    <tr className="border-b border-slate-700/30 transition-colors hover:bg-slate-800/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {position.status === "open" ? (
            <Circle className="h-3 w-3 animate-pulse fill-blue-500 text-blue-500" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-slate-500" />
          )}
          <span className="font-medium text-white">{position.asset}</span>
          <span className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-bold",
            position.type === "LONG" ? "bg-blue-500/20 text-blue-400" : "bg-rose-500/20 text-rose-400"
          )}>
            {position.type}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-sm text-slate-300">
        ${position.entryPrice.toLocaleString()}
      </td>
      <td className="px-4 py-3 font-mono text-sm text-slate-300">
        ${position.currentPrice.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-center text-sm text-slate-300">
        {position.quantity}
      </td>
      <td className="px-4 py-3">
        <div className={cn(
          "flex items-center gap-1 font-mono text-sm font-medium",
          isProfit ? "text-blue-400" : "text-rose-400"
        )}>
          {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isProfit ? "+" : ""}{position.pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          <span className="text-xs opacity-60">({position.pnlPercent}%)</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">
        {position.openTime}
        {position.closeTime && <span className="text-slate-600"> → {position.closeTime}</span>}
      </td>
    </tr>
  )
}

export function TradingDashboard({ dailyProfitRate = 1.5 }: { dailyProfitRate?: number }) {
  const [data, setData] = useState<ReturnType<typeof generateTradingData> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const refreshData = useCallback(() => {
    setData(generateTradingData(dailyProfitRate))
    setLastUpdate(new Date())
  }, [dailyProfitRate])

  useEffect(() => {
    refreshData()
    setIsLoading(false)

    // Refresh every 30 seconds
    const interval = setInterval(refreshData, 30000)
    return () => clearInterval(interval)
  }, [refreshData])

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-1000" />
        <span className="ml-2 text-slate-400">Loading trading data...</span>
      </div>
    )
  }

  const { positions, stats } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <BarChart3 className="h-6 w-6 text-slate-1000" />
            Trading Performance
          </h1>
          <p className="text-sm text-slate-400">
            Real-time transparency of Vortex trading activities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            Market Open
          </span>
          <button 
            onClick={refreshData}
            className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Trading Volume"
          value={`$${(stats.totalVolume / 1000).toFixed(0)}K`}
          subValue="24h volume"
          color="amber"
        />
        <StatCard
          icon={TrendingUp}
          label="Gross Profit"
          value={`$${stats.grossProfit.toFixed(2)}`}
          subValue={`+${stats.profitRate.toFixed(2)}% today`}
          color="emerald"
        />
        <StatCard
          icon={Activity}
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          subValue={`${stats.totalTrades} trades today`}
          color="blue"
        />
        <StatCard
          icon={Zap}
          label="Open Positions"
          value={`${stats.openPositions}`}
          subValue="Active trades"
          color="purple"
        />
      </div>

      {/* Profit Distribution */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Distribution Breakdown */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 md:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-slate-1000" />
            <h3 className="font-semibold text-white">Profit Distribution</h3>
          </div>
          
          <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-lg border border-slate-1000/30 bg-slate-1000/10 p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-slate-400/80">Gold Trading</p>
              <p className="font-mono text-sm sm:text-lg font-bold text-slate-400 truncate">
                ${stats.breakdown.gold.amount >= 1000 ? (stats.breakdown.gold.amount / 1000).toFixed(1) + 'K' : stats.breakdown.gold.amount.toFixed(0)}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-1000/60">{stats.breakdown.gold.percent}%</p>
            </div>
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-blue-400/80">Stock Trading</p>
              <p className="font-mono text-sm sm:text-lg font-bold text-blue-400 truncate">
                ${stats.breakdown.stocks.amount >= 1000 ? (stats.breakdown.stocks.amount / 1000).toFixed(1) + 'K' : stats.breakdown.stocks.amount.toFixed(0)}
              </p>
              <p className="text-[10px] sm:text-xs text-blue-500/60">{stats.breakdown.stocks.percent}%</p>
            </div>
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-purple-400/80">Forex Trading</p>
              <p className="font-mono text-sm sm:text-lg font-bold text-purple-400 truncate">
                ${stats.breakdown.forex.amount >= 1000 ? (stats.breakdown.forex.amount / 1000).toFixed(1) + 'K' : stats.breakdown.forex.amount.toFixed(0)}
              </p>
              <p className="text-[10px] sm:text-xs text-purple-500/60">{stats.breakdown.forex.percent}%</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-3 overflow-hidden rounded-full bg-slate-700">
            <div className="flex h-full">
              <div 
                className="bg-gradient-to-r from-slate-1000 to-slate-500" 
                style={{ width: `${stats.breakdown.gold.percent}%` }} 
              />
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600" 
                style={{ width: `${stats.breakdown.stocks.percent}%` }} 
              />
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-600" 
                style={{ width: `${stats.breakdown.forex.percent}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Member/Company Split */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-white">Profit Sharing</h3>
          </div>
          
          <div className="space-y-3">
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-400/80">Member Share (50%)</span>
                <ArrowUpRight className="h-4 w-4 text-blue-400" />
              </div>
              <p className="font-mono text-xl font-bold text-blue-400">
                ${stats.memberShare.toFixed(2)}
              </p>
              <p className="text-xs text-blue-500/60">Distributed to investors</p>
            </div>
            <div className="rounded-lg border border-slate-600/30 bg-slate-700/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Company Reserve (50%)</span>
                <Shield className="h-4 w-4 text-slate-400" />
              </div>
              <p className="font-mono text-xl font-bold text-slate-300">
                ${stats.companyReserve.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500">Operations & Growth</p>
            </div>
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30">
        <div className="border-b border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-slate-1000" />
              <h3 className="font-semibold text-white">Trading Positions</h3>
              <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
                {positions.length} positions
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 text-xs text-slate-400">
                <th className="px-4 py-3 text-left font-medium">Asset</th>
                <th className="px-4 py-3 text-left font-medium">Entry</th>
                <th className="px-4 py-3 text-left font-medium">Current</th>
                <th className="px-4 py-3 text-center font-medium">Qty</th>
                <th className="px-4 py-3 text-left font-medium">P/L</th>
                <th className="px-4 py-3 text-left font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <PositionRow key={position.id} position={position} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="border-t border-slate-700/50 p-4">
          <p className="text-center text-xs text-slate-500">
            Trading data is simulated for demonstration purposes. 
            Actual trading activities are managed by <span className="text-slate-1000">Vortex AI Trading Engine</span>.
          </p>
        </div>
      </div>

      <div className="apple-matte-surface p-4">
        <p className="text-center text-xs text-slate-500">
          Vortex Equality market simulation. Data is presented for member dashboard analysis.
        </p>
      </div>
    </div>
  )
}
