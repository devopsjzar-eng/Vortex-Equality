"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Sparkles, Activity, Globe, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface MarketInsightProps {
  profitRate: number
  className?: string
}

// Real-time simulated market data
const generateMarketData = () => {
  const baseData = [
    { symbol: "BTC", name: "Bitcoin", basePrice: 67845 },
    { symbol: "ETH", name: "Ethereum", basePrice: 3456 },
    { symbol: "XAU", name: "Gold", basePrice: 2345 },
    { symbol: "EUR/USD", name: "Euro", basePrice: 1.0856 },
  ]

  return baseData.map(item => ({
    ...item,
    price: item.basePrice * (1 + (Math.random() - 0.5) * 0.002),
    change: (Math.random() - 0.3) * 3, // Bias towards positive
  }))
}

// Market insight narratives
const generateInsight = (profitRate: number): { narrative: string; sentiment: string; confidence: number } => {
  const insights = {
    high: [
      "Bullish momentum across multiple asset classes signals strong market confidence.",
      "Technical indicators show sustained upward trends in key positions.",
      "Diversified portfolio strategy capturing gains across crypto and commodities.",
    ],
    medium: [
      "Markets showing steady gains with balanced risk-reward positioning.",
      "Strategic allocations performing within expected parameters.",
      "Consistent returns from algorithmic trading systems.",
    ],
    low: [
      "Conservative positioning maintaining capital preservation.",
      "Defensive strategy protecting against market volatility.",
      "Risk-managed approach delivering stable returns.",
    ],
  }

  const category = profitRate >= 1.5 ? "high" : profitRate >= 1.0 ? "medium" : "low"
  const sentiment = profitRate >= 1.5 ? "Bullish" : profitRate >= 1.0 ? "Neutral" : "Cautious"
  const confidence = Math.min(95, Math.max(65, 70 + profitRate * 10 + Math.random() * 10))

  return { 
    narrative: insights[category][Math.floor(Math.random() * insights[category].length)],
    sentiment,
    confidence: Math.round(confidence)
  }
}

export function MarketInsightCard({ profitRate, className }: MarketInsightProps) {
  const [insight, setInsight] = useState<ReturnType<typeof generateInsight> | null>(null)
  const [marketData, setMarketData] = useState<ReturnType<typeof generateMarketData>>([])
  const [currentTime, setCurrentTime] = useState<string>("")

  useEffect(() => {
    setInsight(generateInsight(profitRate))
    setMarketData(generateMarketData())
    setCurrentTime(new Date().toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }))

    // Update market data every 5 seconds
    const interval = setInterval(() => {
      setMarketData(generateMarketData())
    }, 5000)

    return () => clearInterval(interval)
  }, [profitRate])

  if (!insight) return null

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1117]/80 backdrop-blur-xl",
      className
    )}>
      {/* Subtle glow effects */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-500/10 blur-[80px]" />
      <div className="absolute -left-20 -bottom-20 h-32 w-32 rounded-full bg-emerald-400/5 blur-[60px]" />

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-600/10 ring-1 ring-white/10">
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Market Analysis</h3>
              <p className="text-xs text-slate-500">{currentTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
        </div>

        {/* Today's Performance */}
        <div className="mb-5 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/5 p-4 ring-1 ring-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Today&apos;s Trading Performance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">+{profitRate.toFixed(2)}%</span>
                <span className="flex items-center gap-0.5 text-xs text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  Above target
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 mb-1">Confidence</p>
              <p className="text-lg font-bold text-blue-400">{insight.confidence}%</p>
            </div>
          </div>
        </div>

        {/* Market Sentiment */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-400">AI Market Sentiment</span>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                insight.sentiment === "Bullish" 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : insight.sentiment === "Neutral"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-amber-500/20 text-amber-400"
              )}>
                {insight.sentiment}
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {insight.narrative}
            </p>
          </div>
        </div>

        {/* Live Market Prices */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Live Market Prices</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {marketData.map((item) => (
              <div 
                key={item.symbol}
                className="rounded-lg bg-white/[0.03] p-2.5 ring-1 ring-white/[0.06] transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-300">{item.symbol}</span>
                  {item.change >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-rose-400" />
                  )}
                </div>
                <p className="text-sm font-bold text-white">
                  ${item.price.toLocaleString('en-US', { 
                    minimumFractionDigits: item.symbol === "EUR/USD" ? 4 : 2,
                    maximumFractionDigits: item.symbol === "EUR/USD" ? 4 : 2
                  })}
                </p>
                <p className={cn(
                  "text-[10px] font-medium",
                  item.change >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center justify-center gap-1.5">
            <Zap className="h-3 w-3 text-blue-400" />
            <p className="text-[10px] text-slate-500">
              Vortex AI Trading System
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
