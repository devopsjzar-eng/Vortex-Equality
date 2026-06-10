'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Clock, Landmark, Send, Wallet } from 'lucide-react'

interface WithdrawalStats {
  pending_count: number
  pending_total: number
}

export default function TreasuryPage() {
  const [withdrawalStats, setWithdrawalStats] = useState<WithdrawalStats | null>(null)

  const fetchWithdrawalStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/withdrawal?status=pending')
      const data = await res.json()
      if (data.transactions) {
        const total = data.transactions.reduce((sum: number, transaction: any) => sum + (transaction.net_amount || 0), 0)
        setWithdrawalStats({ pending_count: data.transactions.length, pending_total: total })
      }
    } catch {
      setWithdrawalStats(null)
    }
  }, [])

  useEffect(() => {
    fetchWithdrawalStats()
  }, [fetchWithdrawalStats])

  const pendingTotal = withdrawalStats?.pending_total ?? 0
  const pendingCount = withdrawalStats?.pending_count ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Plisio Treasury</h1>
        <p className="mt-1 text-sm text-slate-400">Monitor pending payouts and Plisio admin approval flow.</p>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
          <div>
            <p className="text-sm font-semibold text-blue-300">
              {pendingCount} withdrawal request{pendingCount === 1 ? '' : 's'} waiting for approval
            </p>
            <p className="mt-1 text-xs text-blue-200">
              Pending net payout total: ${pendingTotal.toFixed(2)} USDT.
            </p>
          </div>
        </div>
      )}

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              Admin-Controlled Payout
            </CardTitle>
            <Badge className="bg-blue-500/20 text-blue-300">Plisio</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-300">
            User withdrawal requests remain pending. When an admin approves a request, the system sends the exact net amount through Plisio.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
            <p className="text-xs text-slate-400">Flow: Member Request - Admin Approve - Plisio Payout - Processing Status</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-white">
            <Wallet className="h-5 w-5 text-blue-400" />
            Funding Reminder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
              <p className="text-sm text-blue-200">
                Keep enough payout balance available in the Plisio merchant account before approving withdrawals or running Global Payout.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-300">
            The platform records gross amount, admin fee, net amount, Plisio payout id, and provider response on each approved withdrawal.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Landmark className="h-5 w-5 text-slate-400" />
            Reject Scrub Rule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300">
            Rejecting a pending withdrawal does not call Plisio. It refunds 100% of the gross amount, recalculates the wallet state, and deletes the user-facing pending withdrawal ledger entries.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Send className="h-5 w-5 text-blue-400" />
            Operating Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>Use USDT TRC20 or USDT BEP20 for exact net-amount payouts.</li>
            <li>Run Global Payout only after checking all pending requests and treasury balance.</li>
            <li>If Plisio rejects a payout, the request stays pending and the error is saved on the withdrawal metadata.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
