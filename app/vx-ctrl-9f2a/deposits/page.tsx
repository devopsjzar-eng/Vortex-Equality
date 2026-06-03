'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, Clock, RefreshCw, User, Mail, DollarSign, Calendar, XCircle } from 'lucide-react'

interface Deposit {
  id: string
  user_id: string
  member_name: string
  member_email: string
  amount: number
  status: 'pending' | 'success'
  external_ref: string
  created_at: string
}

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pending' | 'success' | 'all'>('pending')
  const [stats, setStats] = useState({ pendingCount: 0, pendingAmount: 0 })

  useEffect(() => {
    loadDeposits()
  }, [filter])

  const loadDeposits = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/admin/deposits?status=${filter}`)
      const data = await response.json()

      if (data.error) throw new Error(data.error)

      const formatted: Deposit[] = (data.deposits || []).map((d: any) => ({
        id: d.id,
        user_id: d.user_id,
        member_name: d.profiles?.full_name || 'Unknown',
        member_email: d.profiles?.email || 'Unknown',
        amount: d.amount,
        status: d.status,
        external_ref: d.external_ref,
        created_at: d.created_at,
      }))

      setDeposits(formatted)
      setStats(data.stats || { pendingCount: 0, pendingAmount: 0 })
    } catch (error) {
      console.error('Error loading deposits:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (transactionId: string) => {
    try {
      setApproving(transactionId)

      const response = await fetch('/api/admin/deposit/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve deposit')
      }

      await loadDeposits()
      alert('Deposit approved successfully!')
    } catch (error) {
      console.error('Error approving deposit:', error)
      alert('Failed to approve deposit')
    } finally {
      setApproving(null)
    }
  }

  const handleReject = async (transactionId: string, memberName: string, amount: number) => {
    if (!confirm(`Tolak deposit $${amount.toFixed(2)} dari ${memberName}? Record akan dihapus dan tidak muncul di riwayat member.`)) {
      return
    }
    
    try {
      setRejecting(transactionId)

      const response = await fetch('/api/admin/deposit/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject deposit')
      }

      await loadDeposits()
      alert('Deposit ditolak dan dihapus dari riwayat.')
    } catch (error) {
      console.error('Error rejecting deposit:', error)
      alert('Failed to reject deposit')
    } finally {
      setRejecting(null)
    }
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Deposit Management</h1>
        <Button variant="outline" size="sm" onClick={() => loadDeposits()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-blue-500/30 bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Pending</p>
                <p className="text-xl font-bold text-white">{stats.pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30 bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <DollarSign className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Pending</p>
                <p className="text-xl font-bold text-white">${stats.pendingAmount.toFixed(2)}</p>
              </div>
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
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filter === tab
                ? 'bg-primary text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'all' ? 'All' : tab === 'pending' ? `Pending (${stats.pendingCount})` : 'Success'}
          </button>
        ))}
      </div>

      {/* Deposits List - Card Layout for Mobile */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : deposits.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-3 rounded-full bg-slate-800 p-3">
              <DollarSign className="h-6 w-6 text-slate-500" />
            </div>
            <p className="text-slate-400">No deposits found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {deposits.map((deposit) => (
            <Card key={deposit.id} className="border-slate-800 bg-slate-900 overflow-hidden">
              <CardContent className="p-4">
                {/* Header with Status */}
                <div className="mb-3 flex items-center justify-between">
                  <Badge 
                    variant={deposit.status === 'pending' ? 'outline' : 'default'}
                    className={deposit.status === 'pending' 
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                      : 'border-blue-500 bg-blue-500/20 text-blue-400'
                    }
                  >
                    {deposit.status === 'pending' ? (
                      <><Clock className="mr-1 h-3 w-3" /> PENDING</>
                    ) : (
                      <><CheckCircle className="mr-1 h-3 w-3" /> SUCCESS</>
                    )}
                  </Badge>
                  <span className="text-2xl font-bold text-blue-400">
                    ${deposit.amount.toFixed(2)}
                  </span>
                </div>

                {/* Member Info */}
                <div className="mb-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <User className="h-4 w-4 text-slate-500" />
                    <span className="font-medium">{deposit.member_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <span className="truncate">{deposit.member_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span>{formatDate(deposit.created_at)}</span>
                  </div>
                </div>

                {/* Payment ID */}
                {deposit.external_ref && (
                  <div className="mb-3 rounded bg-slate-800 px-3 py-2 text-xs text-slate-400">
                    Payment ID: <span className="font-mono text-slate-300">{deposit.external_ref}</span>
                  </div>
                )}

                {/* Action Button */}
                {deposit.status === 'pending' && (
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleApprove(deposit.id)}
                      disabled={approving === deposit.id || rejecting === deposit.id}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {approving === deposit.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve Deposit
                        </>
                      )}
                    </Button>
                    {/* Small reject button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleReject(deposit.id, deposit.member_name, deposit.amount)}
                        disabled={rejecting === deposit.id || approving === deposit.id}
                        className="text-xs text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {rejecting === deposit.id ? 'Memproses...' : 'Tolak Deposit'}
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
