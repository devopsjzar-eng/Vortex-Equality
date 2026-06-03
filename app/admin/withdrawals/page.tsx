'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction, Profile } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Wallet, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type WithdrawalWithProfile = Transaction & {
  profile: Profile
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalWithProfile | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const supabase = createClient()

  const fetchWithdrawals = useCallback(async () => {
    const { data } = await supabase
      .from('transactions')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('type', 'withdrawal')
      .order('created_at', { ascending: false })
    
    if (data) setWithdrawals(data as WithdrawalWithProfile[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchWithdrawals()

    // Subscribe to real-time withdrawal updates
    const transactionsChannel = supabase
      .channel('admin-withdrawals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: 'type=eq.withdrawal',
        },
        async () => {
          await fetchWithdrawals()
        }
      )
      .subscribe()

    // Auto-refresh every 20 seconds as backup
    const interval = setInterval(() => {
      fetchWithdrawals()
    }, 20000)

    return () => {
      transactionsChannel.unsubscribe()
      clearInterval(interval)
    }
  }, [fetchWithdrawals, supabase])

  const handleAction = async () => {
    if (!selectedWithdrawal || !action) return
    
    setProcessing(true)

    try {
      if (action === 'approve') {
        // Approve withdrawal
        await supabase
          .from('transactions')
          .update({ 
            status: 'success',
            admin_notes: adminNotes || 'Approved by admin'
          })
          .eq('id', selectedWithdrawal.id)
      } else {
        // Reject withdrawal - refund balance
        await supabase
          .from('transactions')
          .update({ 
            status: 'failed',
            admin_notes: adminNotes || 'Rejected by admin'
          })
          .eq('id', selectedWithdrawal.id)

        // Refund the amount to user's wallet
        const { data: wallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', selectedWithdrawal.user_id)
          .eq('wallet_type', selectedWithdrawal.wallet_type)
          .single()

        if (wallet) {
          await supabase
            .from('wallets')
            .update({ balance: wallet.balance + selectedWithdrawal.amount })
            .eq('id', wallet.id)
        }
      }

      fetchWithdrawals()
    } catch (error) {
      console.error('Error processing withdrawal:', error)
    } finally {
      setProcessing(false)
      setSelectedWithdrawal(null)
      setAction(null)
      setAdminNotes('')
    }
  }

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

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending')
  const processedWithdrawals = withdrawals.filter(w => w.status !== 'pending')

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
        <h1 className="text-2xl font-bold tracking-tight">Withdrawal Requests</h1>
        <p className="text-muted-foreground">Approve or reject withdrawal requests</p>
      </div>

      {/* Pending Withdrawals */}
      <Card className={pendingWithdrawals.length > 0 ? 'border-warning' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Pending Withdrawals ({pendingWithdrawals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingWithdrawals.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No pending withdrawals</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Wallet</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingWithdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{withdrawal.profile?.full_name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">{withdrawal.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{withdrawal.wallet_type}</TableCell>
                    <TableCell>{formatCurrency(withdrawal.amount)}</TableCell>
                    <TableCell className="text-destructive">{formatCurrency(withdrawal.fee)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(withdrawal.net_amount)}</TableCell>
                    <TableCell>
                      <code className="text-xs">{withdrawal.crypto_address?.slice(0, 20)}...</code>
                    </TableCell>
                    <TableCell>{formatDate(withdrawal.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-success text-success hover:bg-success hover:text-success-foreground"
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal)
                            setAction('approve')
                          }}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal)
                            setAction('reject')
                          }}
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
          )}
        </CardContent>
      </Card>

      {/* Processed Withdrawals */}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedWithdrawals.slice(0, 20).map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell>
                      <p className="font-medium">{withdrawal.profile?.full_name || 'N/A'}</p>
                    </TableCell>
                    <TableCell>{formatCurrency(withdrawal.amount)}</TableCell>
                    <TableCell>{formatCurrency(withdrawal.net_amount)}</TableCell>
                    <TableCell>
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                        withdrawal.status === 'success' && 'bg-success/10 text-success',
                        withdrawal.status === 'failed' && 'bg-destructive/10 text-destructive'
                      )}>
                        {withdrawal.status === 'success' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {withdrawal.status}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {withdrawal.admin_notes || '-'}
                    </TableCell>
                    <TableCell>{formatDate(withdrawal.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedWithdrawal && !!action} onOpenChange={() => {
        setSelectedWithdrawal(null)
        setAction(null)
        setAdminNotes('')
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
            </DialogTitle>
            <DialogDescription>
              {action === 'approve' 
                ? 'This will mark the withdrawal as successful. Make sure you have sent the funds.'
                : 'This will reject the withdrawal and refund the amount to the user\'s wallet.'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member</span>
                  <span className="font-medium">{selectedWithdrawal.profile?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{formatCurrency(selectedWithdrawal.net_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <code className="text-xs">{selectedWithdrawal.crypto_address}</code>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (optional)</label>
                <Textarea
                  placeholder="Add notes for this action..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedWithdrawal(null)
                setAction(null)
                setAdminNotes('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              className={action === 'approve' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                action === 'approve' ? 'Approve' : 'Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
