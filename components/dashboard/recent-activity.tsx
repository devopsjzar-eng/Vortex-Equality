'use client'

import { useState } from 'react'
import { Transaction } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReceiptModal } from '@/components/receipt-modal'
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Gift, 
  Trophy,
  CreditCard,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RecentActivityProps {
  transactions: Transaction[]
}

const typeIcons = {
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  profit_claim: Gift,
  referral_bonus: Trophy,
  rank_reward: Trophy,
  admin_credit: CreditCard,
}

const typeLabels = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  profit_claim: 'Daily Profit',
  referral_bonus: 'Referral Bonus',
  rank_reward: 'Rank Reward',
  admin_credit: 'Admin Credit',
}

const statusColors = {
  pending: 'text-warning bg-warning/10',
  success: 'text-success bg-success/10',
  failed: 'text-destructive bg-destructive/10',
  expired: 'text-muted-foreground bg-muted',
}

const statusIcons = {
  pending: Clock,
  success: CheckCircle,
  failed: XCircle,
  expired: XCircle,
}

export function RecentActivity({ transactions }: RecentActivityProps) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No transactions yet. Make your first deposit to get started!
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const Icon = typeIcons[tx.type]
                const StatusIcon = statusIcons[tx.status]
                const isPositive = ['deposit', 'profit_claim', 'referral_bonus', 'rank_reward', 'admin_credit'].includes(tx.type)

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full',
                        isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{typeLabels[tx.type]}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={cn('font-semibold', isPositive ? 'text-success' : 'text-destructive')}>
                          {isPositive ? '+' : '-'}{formatCurrency(tx.net_amount)}
                        </p>
                        <div className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                          statusColors[tx.status]
                        )}>
                          <StatusIcon className="h-3 w-3" />
                          {tx.status}
                        </div>
                      </div>
                      {tx.status === 'success' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTx(tx)}
                        >
                          View Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Modal */}
      <ReceiptModal
        transaction={selectedTx}
        open={!!selectedTx}
        onOpenChange={(open) => !open && setSelectedTx(null)}
      />
    </>
  )
}
