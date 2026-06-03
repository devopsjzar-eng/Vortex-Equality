"use client"

import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface WalletCompactProps {
  assetBalance: number
  bonusBalance: number
  totalDeposit: number
  todayProfit?: number
  currency?: string
}

export function WalletCompact({ 
  assetBalance, 
  bonusBalance, 
  totalDeposit,
  todayProfit = 0,
  currency = "USD" 
}: WalletCompactProps) {
  const [showBalance, setShowBalance] = useState(true)
  const totalBalance = assetBalance + bonusBalance
  const profitPercentage = totalDeposit > 0 ? ((totalBalance - totalDeposit) / totalDeposit) * 100 : 0
  const isProfit = profitPercentage >= 0

  const formatCurrency = (amount: number) => {
    if (!showBalance) return "••••••"
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 md:p-6 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-slate-1000 to-blue-600 p-2">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Portfolio Balance</h3>
            <p className="text-xs text-slate-400">Your total holdings</p>
          </div>
        </div>
        <button
          onClick={() => setShowBalance(!showBalance)}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
        >
          {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>

      {/* Total Balance */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl font-bold text-white">
            {formatCurrency(totalBalance)}
          </span>
          <span className={cn(
            "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
            isProfit ? "bg-blue-500/10 text-blue-400" : "bg-rose-500/10 text-rose-400"
          )}>
            {isProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {isProfit ? "+" : ""}{profitPercentage.toFixed(2)}%
          </span>
        </div>
        {todayProfit > 0 && (
          <p className="mt-1 flex items-center gap-1 text-xs text-blue-400">
            <TrendingUp className="h-3 w-3" />
            +{formatCurrency(todayProfit)} today
          </p>
        )}
      </div>

      {/* Wallet Breakdown */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {/* Asset Wallet */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-slate-400">Asset Wallet</span>
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
              MAIN
            </span>
          </div>
          <span className="font-mono text-lg font-bold text-white">
            {formatCurrency(assetBalance)}
          </span>
        </div>

        {/* Bonus Wallet */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-slate-400">Bonus Wallet</span>
            <span className="rounded bg-slate-1000/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
              BONUS
            </span>
          </div>
          <span className="font-mono text-lg font-bold text-white">
            {formatCurrency(bonusBalance)}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Link href="/dashboard/deposit" className="flex-1">
          <Button 
            className="w-full bg-gradient-to-r from-slate-1000 to-blue-600 text-white hover:from-slate-500 hover:to-blue-700"
            size="sm"
          >
            <ArrowDownRight className="mr-1.5 h-4 w-4 rotate-180" />
            Deposit
          </Button>
        </Link>
        <Link href="/dashboard/withdraw" className="flex-1">
          <Button 
            variant="outline" 
            className="w-full border-slate-600 bg-slate-800/50 text-white hover:bg-slate-700/50"
            size="sm"
          >
            <ArrowUpRight className="mr-1.5 h-4 w-4" />
            Withdraw
          </Button>
        </Link>
      </div>
    </div>
  )
}
