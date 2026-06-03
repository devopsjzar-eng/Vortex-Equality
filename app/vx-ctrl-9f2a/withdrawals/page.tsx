'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowUpFromLine, 
  Copy, 
  Check, 
  CheckCircle, 
  XCircle,
  Clock, 
  Loader2, 
  RefreshCw,
  User,
  Wallet,
  DollarSign,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  fee: number
  net_amount: number
  status: string
  wallet_type: string
  crypto_address: string
  external_ref: string
  created_at: string
  updated_at: string
  profile: {
    full_name: string
    email: string
  } | null
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pending' | 'success' | 'all'>('pending')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [stats, setStats] = useState({ pendingCount: 0, pendingAmount: 0, approvedAmount: 0 })

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true)
    try {
      // Use admin API route that bypasses RLS
      const response = await fetch(`/api/admin/withdrawals?status=${filter}`)
      const data = await response.json()

      if (data.error) throw new Error(data.error)

      const formatted: WithdrawalRequest[] = (data.withdrawals || []).map((w: any) => ({
        id: w.id,
        user_id: w.user_id,
        amount: w.amount,
        fee: w.fee,
        net_amount: w.net_amount,
        status: w.status,
        wallet_type: w.wallet_type,
        crypto_address: w.crypto_address,
        external_ref: w.external_ref,
        created_at: w.created_at,
        updated_at: w.updated_at,
        profile: w.profiles ? {
          full_name: w.profiles.full_name,
          email: w.profiles.email
        } : null
      }))

      setWithdrawals(formatted)
      setStats({
        pendingCount: data.stats?.pendingCount || 0,
        pendingAmount: data.stats?.pendingAmount || 0,
        approvedAmount: data.stats?.approvedAmount || 0
      })
    } catch (error) {
      console.error('Error fetching withdrawals:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchWithdrawals()
  }, [fetchWithdrawals])

  const handleCopyAddress = (id: string, address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleApprove = async (withdrawal: WithdrawalRequest) => {
    setApprovingId(withdrawal.id)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/withdrawal/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: withdrawal.id })
      })
      
      if (!response.ok) throw new Error('Failed to approve')

      setMessage({ type: 'success', text: `Withdrawal ${formatCurrency(withdrawal.net_amount)} for ${withdrawal.profile?.full_name} approved!` })
      setWithdrawals(prev => prev.map(w => w.id === withdrawal.id ? { ...w, status: 'success' } : w))
      fetchWithdrawals()
    } catch {
      setMessage({ type: 'error', text: 'Failed to approve withdrawal' })
    } finally {
      setApprovingId(null)
    }
  }

  const handleReject = async (withdrawal: WithdrawalRequest) => {
    if (!confirm(`Reject withdrawal and refund ${formatCurrency(withdrawal.amount)} to ${withdrawal.profile?.full_name}?`)) return
    setRejectingId(withdrawal.id)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/withdrawal/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: withdrawal.id })
      })
      
      if (!response.ok) throw new Error('Failed to reject')

      setMessage({ type: 'success', text: `Withdrawal rejected. ${formatCurrency(withdrawal.amount)} refunded to ${withdrawal.profile?.full_name}.` })
      setWithdrawals(prev => prev.map(w => w.id === withdrawal.id ? { ...w, status: 'rejected' } : w))
      fetchWithdrawals()
    } catch {
      setMessage({ type: 'error', text: 'Failed to reject withdrawal' })
    } finally {
      setRejectingId(null)
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Withdrawal Requests</h1>
          <p className="mt-1 text-slate-400">Review and approve member withdrawal requests manually</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchWithdrawals} className="border-slate-700 text-slate-300">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div className={cn(
          'flex items-center gap-3 rounded-lg p-4 text-sm font-medium',
          message.type === 'success' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
        )}>
          {message.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-blue-500/30 bg-slate-900">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-blue-500/20 p-3"><Clock className="h-6 w-6 text-blue-400" /></div>
            <div>
              <p className="text-sm text-slate-400">Pending</p>
              <p className="text-2xl font-bold text-white">{stats.pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-red-500/20 p-3"><DollarSign className="h-6 w-6 text-red-400" /></div>
            <div>
              <p className="text-sm text-slate-400">Total Pending</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.pendingAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-blue-500/20 p-3"><CheckCircle className="h-6 w-6 text-blue-400" /></div>
            <div>
              <p className="text-sm text-slate-400">Total Approved</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.approvedAmount)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['pending', 'success', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all',
              filter === tab ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            )}
          >
            {tab === 'all' ? 'All' : tab === 'pending' ? `Pending (${stats.pendingCount})` : 'Approved'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : withdrawals.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="py-16 text-center">
            <ArrowUpFromLine className="mx-auto mb-3 h-12 w-12 text-slate-600" />
            <p className="text-slate-400">No withdrawal requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {withdrawals.map((withdrawal) => (
            <Card
              key={withdrawal.id}
              className={cn(
                'border bg-slate-900',
                withdrawal.status === 'pending' ? 'border-blue-500/40' : 'border-slate-800'
              )}
            >
              <CardContent className="p-5">
                <div className="space-y-4">
                  {/* Member + Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{withdrawal.profile?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{withdrawal.profile?.email}</p>
                      </div>
                    </div>
                    <Badge className={cn(
                      'text-xs',
                      withdrawal.status === 'pending' && 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                      withdrawal.status === 'success' && 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                      withdrawal.status === 'rejected' && 'bg-red-500/20 text-red-400 border-red-500/30',
                    )}>
                      {withdrawal.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                      {withdrawal.status === 'success' && <CheckCircle className="mr-1 h-3 w-3" />}
                      {withdrawal.status === 'rejected' && <XCircle className="mr-1 h-3 w-3" />}
                      {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                    </Badge>
                  </div>

                  {/* Amount breakdown */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-slate-800 p-3 text-center">
                      <p className="text-xs text-slate-500">Jumlah Tarik</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(withdrawal.amount)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-800 p-3 text-center">
                      <p className="text-xs text-slate-500">Admin Fee</p>
                      <p className="text-lg font-bold text-red-400">-{formatCurrency(withdrawal.fee || 0)}</p>
                    </div>
                    <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                      <p className="text-xs text-slate-500">Diterima Member</p>
                      <p className="text-lg font-bold text-blue-400">{formatCurrency(withdrawal.net_amount || withdrawal.amount)}</p>
                    </div>
                  </div>

                  {/* Info row */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-slate-800 px-2 py-1 text-slate-400">
                      <Wallet className="mr-1 inline h-3 w-3" />
                      {withdrawal.wallet_type} wallet
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-1 text-slate-400">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {formatDate(withdrawal.created_at)}
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-1 text-slate-400">
                      {withdrawal.external_ref}
                    </span>
                  </div>

                  {/* Wallet Address - UTAMA */}
                  <div className="rounded-xl border border-slate-600 bg-slate-800 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Alamat Tujuan Pengiriman USDT
                    </p>
                    <div className="flex items-center gap-3">
                      <p className="flex-1 break-all font-mono text-sm font-medium text-white">
                        {withdrawal.crypto_address || '-'}
                      </p>
                      {withdrawal.crypto_address && (
                        <Button
                          size="sm"
                          onClick={() => handleCopyAddress(withdrawal.id, withdrawal.crypto_address)}
                          className={cn(
                            'flex-shrink-0 gap-2 transition-all',
                            copiedId === withdrawal.id ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                          )}
                        >
                          {copiedId === withdrawal.id ? (
                            <><Check className="h-4 w-4" /> Tersalin!</>
                          ) : (
                            <><Copy className="h-4 w-4" /> Salin</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons - hanya untuk pending */}
                  {withdrawal.status === 'pending' && (
                    <div className="space-y-2">
                      <Button
                        onClick={() => handleApprove(withdrawal)}
                        disabled={approvingId === withdrawal.id}
                        className="h-12 w-full bg-blue-600 text-base font-bold hover:bg-blue-700"
                        size="lg"
                      >
                        {approvingId === withdrawal.id ? (
                          <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memproses...</>
                        ) : (
                          <><CheckCircle className="mr-2 h-5 w-5" />SETUJU - Tandai Selesai</>
                        )}
                      </Button>
                      <p className="text-center text-xs text-slate-500">
                        Salin alamat, transfer manual via Bitget, lalu tekan SETUJU
                      </p>
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleReject(withdrawal)}
                          disabled={rejectingId === withdrawal.id}
                          className="text-xs text-red-500 hover:text-red-400 transition-colors"
                        >
                          {rejectingId === withdrawal.id ? 'Memproses...' : 'Tolak & Kembalikan Dana'}
                        </button>
                      </div>
                    </div>
                  )}

                  {withdrawal.status === 'success' && (
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-500/10 py-3 text-sm font-medium text-blue-400">
                      <CheckCircle className="h-5 w-5" />
                      Sudah disetujui dan selesai
                    </div>
                  )}

                  {withdrawal.status === 'rejected' && (
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-red-500/10 py-3 text-sm font-medium text-red-400">
                      <XCircle className="h-5 w-5" />
                      Ditolak - Dana sudah dikembalikan
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
