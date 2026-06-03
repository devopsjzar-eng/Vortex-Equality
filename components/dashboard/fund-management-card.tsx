'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { 
  TrendingUp, 
  Activity, 
  PieChart,
  ArrowRight,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface AllocationItem {
  name: string
  percentage: number
  color: string
}

const ALLOCATION_DATA: AllocationItem[] = [
  { name: 'Crypto', percentage: 40, color: '#3b82f6' },
  { name: 'Forex', percentage: 25, color: '#8b5cf6' },
  { name: 'Gold', percentage: 20, color: '#f59e0b' },
  { name: 'Stocks', percentage: 10, color: '#10b981' },
  { name: 'Reserve', percentage: 5, color: '#6b7280' },
]

// Mini Donut Chart
function MiniDonutChart({ data }: { data: AllocationItem[] }) {
  let currentAngle = -90

  return (
    <svg viewBox="0 0 36 36" className="h-16 w-16">
      {data.map((item, index) => {
        const angle = (item.percentage / 100) * 360
        const startAngle = currentAngle
        const endAngle = currentAngle + angle
        currentAngle = endAngle

        const startRad = (startAngle * Math.PI) / 180
        const endRad = (endAngle * Math.PI) / 180

        const x1 = 18 + 14 * Math.cos(startRad)
        const y1 = 18 + 14 * Math.sin(startRad)
        const x2 = 18 + 14 * Math.cos(endRad)
        const y2 = 18 + 14 * Math.sin(endRad)

        const largeArc = angle > 180 ? 1 : 0

        return (
          <path
            key={index}
            d={`M 18 18 L ${x1} ${y1} A 14 14 0 ${largeArc} 1 ${x2} ${y2} Z`}
            fill={item.color}
          />
        )
      })}
      <circle cx="18" cy="18" r="8" fill="#0d1117" />
    </svg>
  )
}

export function FundManagementCard() {
  const [monthlyReturn, setMonthlyReturn] = useState(2.45)
  const [isLive, setIsLive] = useState(true)

  // Simulate live data
  useEffect(() => {
    const interval = setInterval(() => {
      setMonthlyReturn(prev => {
        const change = (Math.random() - 0.5) * 0.1
        return Math.max(1.5, Math.min(3.5, prev + change))
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Link href="/dashboard/fund-management">
      <Card className="group relative cursor-pointer overflow-hidden border border-white/[0.08] bg-[#0d1117]/80 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-blue-500/30 hover:shadow-blue-500/10">
        {/* Subtle glow effect */}
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-500/10 blur-[80px] transition-all duration-500 group-hover:bg-blue-500/20" />
        <div className="absolute -left-20 -bottom-20 h-32 w-32 rounded-full bg-purple-500/5 blur-[60px]" />
        
        <CardContent className="relative p-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-600/10 ring-1 ring-white/10">
                <PieChart className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <span className="text-sm font-medium text-slate-300">Fund Management</span>
                <p className="text-[10px] text-slate-500">Professional Asset Management</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              LIVE
            </span>
          </div>

          {/* Content */}
          <div className="mt-4 flex items-center justify-between">
            {/* Left - Stats */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Total Assets Under Management</p>
                <p className="text-2xl font-bold tracking-tight text-white">$67.8M</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-slate-500">Monthly Return</p>
                  <p className="flex items-center gap-1 text-sm font-semibold text-emerald-400">
                    <TrendingUp className="h-3 w-3" />
                    +{monthlyReturn.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Win Rate</p>
                  <p className="text-sm font-semibold text-blue-400">87.3%</p>
                </div>
              </div>
            </div>

            {/* Right - Mini Donut Chart */}
            <div className="flex flex-col items-center">
              <MiniDonutChart data={ALLOCATION_DATA} />
              <p className="mt-1 text-[9px] text-slate-500">Allocation</p>
            </div>
          </div>

          {/* Top Assets */}
          <div className="mt-4 flex items-center gap-2">
            {ALLOCATION_DATA.slice(0, 3).map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-1 rounded-full bg-white/[0.03] px-2 py-1 text-[10px] ring-1 ring-white/5"
              >
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-400">{item.name}</span>
                <span className="font-medium text-slate-300">{item.percentage}%</span>
              </div>
            ))}
          </div>

          {/* Footer - View Details */}
          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
            <p className="text-[10px] text-slate-500">Real-time market data & portfolio tracking</p>
            <span className="flex items-center gap-1 text-xs font-medium text-blue-400 transition-all group-hover:gap-2">
              View Details
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
