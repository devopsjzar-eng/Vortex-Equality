'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreditCard, Search, CheckCircle, Loader2, AlertCircle } from 'lucide-react'

export default function DirectCreditPage() {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [creditType, setCreditType] = useState<string>('asset_sponsor') // Default: Asset + Sponsor
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creditHistory, setCreditHistory] = useState<any[]>([])
  const supabase = createClient()

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_admin', false)
      .order('full_name', { ascending: true })
    
    if (data) setMembers(data)
    setLoading(false)
  }, [supabase])

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from('transactions')
      .select(`
        id,
        user_id,
        amount,
        wallet_type,
        admin_notes,
        created_at,
        profiles:user_id (full_name, email)
      `)
      .eq('type', 'deposit')
      .like('external_ref', 'DEP-%')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) setCreditHistory(data)
  }, [supabase])

  useEffect(() => {
    fetchMembers()
    fetchHistory()

    // Subscribe to real-time changes on profiles (member list)
    const profilesChannel = supabase
      .channel('credit-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'is_admin=eq.false',
        },
        async () => {
          await fetchMembers()
        }
      )
      .subscribe()

    // Subscribe to real-time changes on transactions (credit history)
    const transactionsChannel = supabase
      .channel('credit-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: 'type=eq.deposit',
        },
        async () => {
          await fetchHistory()
        }
      )
      .subscribe()

    // Auto-refresh history every 15 seconds as backup
    const interval = setInterval(() => {
      fetchHistory()
    }, 15000)

    return () => {
      profilesChannel.unsubscribe()
      transactionsChannel.unsubscribe()
      clearInterval(interval)
    }
  }, [fetchMembers, fetchHistory, supabase])

  const handleCredit = async () => {
    if (!selectedMember || !amount || parseFloat(amount) <= 0) {
      setError('Pilih member dan masukkan nominal')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const creditAmount = parseFloat(amount)
      
      // Parse creditType: "asset_sponsor" | "asset_direct" | "bonus_direct"
      let walletType: 'asset' | 'bonus' = 'asset'
      let transferType: 'sponsor' | 'direct' | 'as_deposit' = 'direct'
      
      if (creditType === 'asset_sponsor') {
        walletType = 'asset'
        transferType = 'as_deposit' // Treat as deposit, trigger sponsor bonus
      } else if (creditType === 'asset_direct') {
        walletType = 'asset'
        transferType = 'direct' // No sponsor bonus
      } else if (creditType === 'bonus_direct') {
        walletType = 'bonus'
        transferType = 'direct'
      }

      console.log('[Vortex] Sending credit:', { selectedMember, walletType, transferType, creditAmount })

      const response = await fetch('/api/admin/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMember,
          walletType: walletType,
          amount: creditAmount,
          reason: notes || 'Credit dari admin',
          transferType: transferType
        })
      })

      const data = await response.json()
      console.log('[Vortex] API response:', data)

      if (!response.ok) {
        setError(data.error || 'Gagal mengirim credit')
        return
      }

      setSuccess(true)
      setSelectedMember('')
      setAmount('')
      setNotes('')
      setCreditType('asset_sponsor')
      
      setTimeout(() => setSuccess(false), 3000)
      fetchHistory()
    } catch (err: any) {
      console.log('[Vortex] Error:', err.message)
      setError(err.message || 'Error mengirim credit')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num)
  }

  const filteredMembers = members.filter(member =>
    member.email.toLowerCase().includes(search.toLowerCase()) ||
    member.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const selectedMemberData = members.find(m => m.id === selectedMember)

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
        <h1 className="text-2xl font-bold tracking-tight">Direct Credit</h1>
        <p className="text-muted-foreground">Manually inject funds into {"member's"} accounts</p>
      </div>

      {success && (
        <Card className="border-success bg-success/10">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle className="h-5 w-5 text-success" />
            <p className="font-medium text-success">Credit applied successfully!</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Credit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              New Credit
            </CardTitle>
            <CardDescription>
              Add funds directly to a {"member's"} wallet. This will be recorded as a deposit transaction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Member Search */}
            <div className="space-y-2">
              <Label>Search Member</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Member Selection */}
            <div className="space-y-2">
              <Label>Select Member</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent>
                  {filteredMembers && filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name || member.email} - {member.email}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__placeholder__" disabled>
                      {search ? 'Tidak ada member yang cocok' : 'Mulai cari member'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Credit Type - Single Select */}
            <div className="space-y-2">
              <Label>Pilih Tipe Transfer</Label>
              <Select value={creditType} onValueChange={setCreditType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset_sponsor">Asset Wallet + Sponsor (8% 5% 2%)</SelectItem>
                  <SelectItem value="asset_direct">Asset Wallet Saja (Tanpa Sponsor)</SelectItem>
                  <SelectItem value="bonus_direct">Bonus Wallet</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {creditType === 'asset_sponsor' 
                  ? 'Kirim $100 → upline dapat $8, $5, $2 sponsor'
                  : creditType === 'asset_direct'
                  ? 'Kirim langsung ke asset wallet member'
                  : 'Kirim langsung ke bonus wallet member'}
              </p>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-lg"
                  min="0"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Admin Notes (optional)</Label>
              <Textarea
                placeholder="Reason for credit..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button
              onClick={handleCredit}
              disabled={submitting || !selectedMember || !amount || parseFloat(amount) <= 0}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Apply Credit'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Credit Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedMemberData && amount && parseFloat(amount) > 0 ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Member</p>
                  <p className="text-lg font-bold">{selectedMemberData.full_name || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{selectedMemberData.email}</p>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Credit Details</p>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Destination</span>
                      <span className="capitalize font-medium">
                        {creditType === 'bonus_direct' ? 'Bonus' : 'Asset'} Wallet
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount</span>
                      <span className="font-bold text-success">{formatCurrency(amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sponsor Bonus</span>
                      <span className="font-medium">
                        {creditType === 'asset_sponsor' ? '✓ 8% 5% 2%' : '✗ None'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                  <p className="font-medium text-primary">What Member Will See</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>- Transaction type: <span className="font-medium text-foreground">DEPOSIT</span></li>
                    <li>- Same as regular crypto deposit</li>
                    <li>- No indication of admin transfer</li>
                    {creditType === 'asset_sponsor' && (
                      <li className="text-success font-semibold">✓ Sponsor bonuses akan ke upline</li>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                Select a member and enter an amount to see preview
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transfer History */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
          <CardDescription>Recent admin credits (displayed as deposits to members)</CardDescription>
        </CardHeader>
        <CardContent>
          {creditHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-3 px-4 text-left font-semibold">Member</th>
                    <th className="py-3 px-4 text-left font-semibold">Amount</th>
                    <th className="py-3 px-4 text-left font-semibold">Wallet</th>
                    <th className="py-3 px-4 text-left font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {creditHistory.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className="font-medium">{tx.profiles?.full_name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{tx.profiles?.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-success">${tx.amount.toFixed(2)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-muted px-2 py-1 text-xs capitalize">
                          {tx.wallet_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No transfer history yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

