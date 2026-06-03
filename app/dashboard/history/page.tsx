'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReceiptModal } from '@/components/receipt-modal'
import { 
  Receipt,
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Gift, 
  Trophy,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  TrendingUp,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const typeIcons: Record<string, any> = {
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  profit_claim: TrendingUp,
  referral_bonus: Gift,
  sponsor_bonus: Gift,
  rank_reward: Trophy,
  admin_credit: CreditCard,
}

const typeLabels: Record<string, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  profit_claim: 'Daily Profit',
  referral_bonus: 'Referral Bonus',
  sponsor_bonus: 'Sponsor Bonus',
  rank_reward: 'Rank Reward',
  admin_credit: 'Admin Credit',
}

const statusColors: Record<string, string> = {
  pending: 'text-slate-1000 bg-slate-1000/10',
  success: 'text-blue-500 bg-blue-500/10',
  completed: 'text-blue-500 bg-blue-500/10',
  failed: 'text-red-500 bg-red-500/10',
  rejected: 'text-red-500 bg-red-500/10',
  expired: 'text-slate-500 bg-slate-500/10',
  available: 'text-slate-1000 bg-slate-1000/10',
  claimed: 'text-blue-500 bg-blue-500/10',
}

const statusIcons: Record<string, any> = {
  pending: Clock,
  success: CheckCircle,
  completed: CheckCircle,
  failed: XCircle,
  rejected: XCircle,
  expired: XCircle,
  available: Clock,
  claimed: CheckCircle,
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: txResult } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (txResult) setTransactions(txResult)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  const handleViewReceipt = (tx: Transaction) => {
    setSelectedTx(tx)
    setShowReceipt(true)
  }

  const filteredTransactions = filter === 'all' 
    ? transactions 
    : transactions.filter(tx => tx.type === filter)

  // Calculate stats from transactions
  const profitTransactions = transactions.filter(t => t.type === 'profit_claim' && t.status === 'success')
  const totalProfitsClaimed = profitTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
  const totalClaimedDays = profitTransactions.length

  const stats = {
    totalDeposits: transactions.filter(t => t.type === 'deposit' && (t.status === 'success' || t.status === 'completed')).reduce((sum, t) => sum + t.net_amount, 0),
    totalWithdrawals: transactions.filter(t => t.type === 'withdrawal' && (t.status === 'success' || t.status === 'completed')).reduce((sum, t) => sum + t.net_amount, 0),
    totalProfits: totalProfitsClaimed,
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transaction History</h1>
        <p className="text-muted-foreground">View all your transactions and daily profit records</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-600/5">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Deposits</p>
            <p className="text-xl font-bold text-blue-500">{formatCurrency(stats.totalDeposits)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-red-600/5">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Withdrawals</p>
            <p className="text-xl font-bold text-red-500">{formatCurrency(stats.totalWithdrawals)}</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-600/5">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Profits Claimed</p>
            <p className="text-xl font-bold text-green-500">{formatCurrency(stats.totalProfits)}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalClaimedDays} days claimed</p>
          </CardContent>
        </Card>
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-purple-600/5">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Bonuses</p>
            <p className="text-xl font-bold text-purple-500">{formatCurrency(transactions.filter(t => (t.type === 'sponsor_bonus' || t.type === 'referral_bonus' || t.type === 'rank_reward') && t.status === 'success').reduce((sum, t) => sum + t.net_amount, 0))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="mb-4 w-full justify-start overflow-x-auto">
              <TabsTrigger value="all">All Transactions</TabsTrigger>
              <TabsTrigger value="profit_claim" className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Daily Profits
              </TabsTrigger>
              <TabsTrigger value="deposit">Deposits</TabsTrigger>
              <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
              <TabsTrigger value="sponsor_bonus">Bonuses</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-0">
              <div className="flex items-center mb-3 text-sm text-muted-foreground">
                <Filter className="h-4 w-4 mr-1" />
                {filteredTransactions.length} transactions
              </div>
              {filteredTransactions.length === 0 ? (
                  <div className="py-12 text-center">
                    <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No transactions found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTransactions.map((tx) => {
                      const Icon = typeIcons[tx.type] || Receipt
                      const StatusIcon = statusIcons[tx.status] || Clock
                      const isPositive = ['deposit', 'profit_claim', 'referral_bonus', 'sponsor_bonus', 'rank_reward', 'admin_credit'].includes(tx.type)
                      const isSuccess = tx.status === 'success' || tx.status === 'completed'
                      return (
                        <div
                          key={tx.id}
                          className={cn(
                            "flex items-center justify-between rounded-xl border p-4 transition-all",
                            isSuccess ? "border-border bg-card hover:bg-muted/50 cursor-pointer" : "border-border bg-card/50"
                          )}
                          onClick={() => isSuccess && handleViewReceipt(tx)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'flex h-12 w-12 items-center justify-center rounded-xl',
                              isPositive ? 'bg-blue-500/15 text-blue-500' : 'bg-red-500/15 text-red-500'
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold">{typeLabels[tx.type] || tx.type}</p>
                              <p className="text-sm text-muted-foreground">{formatDate(tx.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={cn('text-lg font-bold', isPositive ? 'text-blue-500' : 'text-red-500')}>
                                {isPositive ? '+' : '-'}{formatCurrency(tx.net_amount)}
                              </p>
                              <div className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                                statusColors[tx.status] || 'text-slate-500 bg-slate-500/10'
                              )}>
                                <StatusIcon className="h-3 w-3" />
                                {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                              </div>
                            </div>
                            {isSuccess && (
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={(e) => { e.stopPropagation(); handleViewReceipt(tx) }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedTx && (
        <ReceiptModal
          open={showReceipt}
          onOpenChange={setShowReceipt}
          data={{
            type: typeLabels[selectedTx.type] || selectedTx.type,
            amount: selectedTx.amount,
            status: selectedTx.status,
            date: formatDate(selectedTx.created_at),
            receipt_number: 'VX-' + selectedTx.id.slice(0, 8).toUpperCase(),
            wallet: selectedTx.wallet_type === 'asset' ? 'Asset Wallet' : selectedTx.wallet_type === 'bonus' ? 'Bonus Wallet' : undefined,
            fee: selectedTx.fee,
            net_amount: selectedTx.net_amount,
            crypto_address: selectedTx.crypto_address,
            external_ref: selectedTx.external_ref,
          }}
        />
      )}
    </div>
  )
}
