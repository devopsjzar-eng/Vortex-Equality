'use client'

import { Wallet } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet as WalletIcon, Gift, TrendingUp, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WalletCardsProps {
  assetWallet?: Wallet
  bonusWallet?: Wallet
}

export function WalletCards({ assetWallet, bonusWallet }: WalletCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const roiPercentage = assetWallet?.initial_capital 
    ? ((assetWallet.total_profit_earned / assetWallet.initial_capital) * 100).toFixed(1)
    : '0'

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Asset Wallet */}
      <Card className={cn(
        'relative overflow-hidden border-primary/20',
        assetWallet?.cap_reached && 'border-warning'
      )}>
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-primary/10" />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Asset Wallet</CardTitle>
          <div className="rounded-full bg-primary/10 p-2">
            <WalletIcon className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(assetWallet?.balance || 0)}</div>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="h-3 w-3" />
              <span>ROI: {roiPercentage}%</span>
            </div>
            <span className="text-muted-foreground">/ 400% cap</span>
          </div>
          {assetWallet?.cap_reached && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>400% cap reached. Re-invest to continue earning.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bonus Wallet */}
      <Card className="relative overflow-hidden">
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-success/10" />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Bonus Wallet</CardTitle>
          <div className="rounded-full bg-success/10 p-2">
            <Gift className="h-4 w-4 text-success" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(bonusWallet?.balance || 0)}</div>
          <div className="mt-2 text-sm text-muted-foreground">
            From referrals & rank rewards
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
