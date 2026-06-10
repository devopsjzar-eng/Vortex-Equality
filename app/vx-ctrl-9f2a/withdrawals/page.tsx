'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, Clock, Loader2, Send, Wallet, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type AdminWithdrawal = {
  id: string
  user_id: string
  amount: number
  fee: number
  net_amount: number
  fee_percentage: number
  status: string
  raw_status: string
  crypto_address: string | null
  external_ref: string | null
  admin_notes: string | null
  created_at: string
  profile: {
    full_name: string | null
    email: string | null
  } | null
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([])
  const [stats, setStats] = useState({ pendingCount: 0, pendingAmount: 0, approvedAmount: 0 })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [globalPayoutProcessing, setGlobalPayoutProcessing] = useState(false)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<AdminWithdrawal | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [adminNotes, setAdminNotes] = useState('')

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/withdrawals?status=all')
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setWithdrawals(data.withdrawals || [])
      setStats(data.stats || { pendingCount: 0, pendingAmount: 0, approvedAmount: 0 })
    } catch (error) {
      console.error('Error loading withdrawals:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWithdrawals()
  }, [fetchWithdrawals])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const handleAction = async () => {
    if (!selectedWithdrawal || !action) return
    setProcessing(true)
    try {
      const endpoint =
        action === 'approve'
          ? '/api/admin/withdrawal/approve'
          : '/api/admin/withdrawal/reject'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: selectedWithdrawal.id, adminNotes }),
      })
      const data = await response.json()
      if (!response.ok || data.error) throw new Error(data.error || 'Failed to process withdrawal')

      await fetchWithdrawals()
      setSelectedWithdrawal(null)
      setAction(null)
      setAdminNotes('')
    } catch (error) {
      console.error('Error processing withdrawal:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleGlobalPayout = async () => {
    if (pendingWithdrawals.length === 0) return
    setGlobalPayoutProcessing(true)
    try {
      const response = await fetch('/api/admin/withdrawal/global-payout', { method: 'POST' })
      const data = await response.json()
      if (!response.ok || data.error) throw new Error(data.error || 'Failed to process global payout')
      await fetchWithdrawals()
    } catch (error) {
      console.error('Error processing global payout:', error)
    } finally {
      setGlobalPayoutProcessing(false)
    }
  }

  const pendingWithdrawals = withdrawals.filter(w => w.raw_status === 'pending')
  const processedWithdrawals = withdrawals.filter(w => w.raw_status !== 'pending')

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Withdrawal Requests</h1>
        <p className="text-muted-foreground">Approve pending requests through Plisio or reject and scrub them from user history.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Pending Requests</p>
            <p className="mt-1 text-2xl font-bold">{stats.pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Pending Net Amount</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.pendingAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Approved Net Amount</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.approvedAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className={pendingWithdrawals.length > 0 ? 'border-warning' : ''}>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Pending Withdrawals ({pendingWithdrawals.length})
          </CardTitle>
          {pendingWithdrawals.length > 0 && (
            <Button onClick={handleGlobalPayout} disabled={globalPayoutProcessing} className="w-full sm:w-auto">
              {globalPayoutProcessing
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Send className="mr-2 h-4 w-4" />}
              Global Payout
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {pendingWithdrawals.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No pending withdrawals</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[920px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <p className="font-medium">{withdrawal.profile?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{withdrawal.profile?.email}</p>
                      </TableCell>
                      <TableCell>{formatCurrency(withdrawal.amount)}</TableCell>
                      <TableCell className="text-destructive">
                        {formatCurrency(withdrawal.fee)} ({Number(withdrawal.fee_percentage || 0)}%)
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(withdrawal.net_amount)}</TableCell>
                      <TableCell>
                        <code className="text-xs">{withdrawal.crypto_address?.slice(0, 24) || '-'}...</code>
                      </TableCell>
                      <TableCell>{formatDate(withdrawal.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-success text-success hover:bg-success hover:text-success-foreground"
                            onClick={() => { setSelectedWithdrawal(withdrawal); setAction('approve') }}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Pay via Plisio
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => { setSelectedWithdrawal(withdrawal); setAction('reject') }}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Processed Withdrawals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processedWithdrawals.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No processed withdrawals</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedWithdrawals.slice(0, 50).map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <p className="font-medium">{withdrawal.profile?.full_name || 'Unknown'}</p>
                      </TableCell>
                      <TableCell>{formatCurrency(withdrawal.net_amount)}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            withdrawal.status === 'success' && 'bg-success/10 text-success',
                            withdrawal.status === 'processing' && 'bg-warning/10 text-warning',
                            withdrawal.status === 'rejected' && 'bg-destructive/10 text-destructive'
                          )}
                        >
                          {withdrawal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                        {withdrawal.admin_notes || '-'}
                      </TableCell>
                      <TableCell>{formatDate(withdrawal.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedWithdrawal && !!action}
        onOpenChange={() => {
          setSelectedWithdrawal(null)
          setAction(null)
          setAdminNotes('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}</DialogTitle>
            <DialogDescription>
              {action === 'approve'
                ? 'Send the exact net amount through Plisio. The company covers blockchain gas fees.'
                : 'Cancel this request, refund 100% of the gross amount, and scrub the pending log from user history.'}
            </DialogDescription>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member</span>
                  <span className="font-medium">{selectedWithdrawal.profile?.full_name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross</span>
                  <span className="font-medium">{formatCurrency(selectedWithdrawal.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net</span>
                  <span className="font-medium">{formatCurrency(selectedWithdrawal.net_amount)}</span>
                </div>
                <div className="mt-2">
                  <span className="text-muted-foreground">Address</span>
                  <code className="mt-1 block break-all text-xs">{selectedWithdrawal.crypto_address}</code>
                </div>
              </div>

              <Textarea
                placeholder="Admin notes..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setSelectedWithdrawal(null); setAction(null); setAdminNotes('') }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              className={action === 'approve' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action === 'approve' ? 'Send Plisio Payout' : 'Reject & Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
