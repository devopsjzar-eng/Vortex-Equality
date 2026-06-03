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
import { 
  CreditCard, 
  Search, 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  Wallet,
  Send,
  DollarSign,
  User,
  History
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Admin fund balance - this represents admin's available fund for P2P transfers
const ADMIN_FUND_BALANCE = 500000

type CreditHistory = {
  id: string
  member_name: string
  member_email: string
  amount: number
  wallet_type: string
  created_at: string
}

export default function DirectCreditPage() {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'email' | 'name' | 'id'>('all')
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [creditType, setCreditType] = useState<string>('asset_sponsor') // Simplified: single select
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creditHistory, setCreditHistory] = useState<CreditHistory[]>([])
  const [totalCredited, setTotalCredited] = useState(0)
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

  const fetchCreditHistory = useCallback(async () => {
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
    fetchCreditHistory()
  }, [fetchMembers, fetchCreditHistory])

  const handleCredit = async () => {
    if (!selectedMember || !amount || parseFloat(amount) <= 0) {
      setError('Pilih member dan masukkan nominal')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const creditAmount = parseFloat(amount)
      
      // Parse creditType
      let walletType: 'asset' | 'bonus' = 'asset'
      let transferType: 'sponsor' | 'direct' | 'as_deposit' = 'direct'
      
      if (creditType === 'asset_sponsor') {
        walletType = 'asset'
        transferType = 'as_deposit'
      } else if (creditType === 'asset_direct') {
        walletType = 'asset'
        transferType = 'direct'
      } else if (creditType === 'bonus_direct') {
        walletType = 'bonus'
        transferType = 'direct'
      }

      const response = await fetch('/api/admin/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMember,
          walletType: walletType,
          amount: creditAmount,
          reason: notes || 'Credit dari admin',
          transferType: transferType,
        })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Gagal mengirim credit')

      setSuccess(true)
      setSelectedMember('')
      setAmount('')
      setNotes('')
      setCreditType('asset_sponsor')
      fetchCreditHistory()
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim credit')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Advanced search - by email, name, ID, or referral code
  const filteredMembers = members.filter(member => {
    const searchLower = search.toLowerCase()
    if (!search) return true
    
    switch (searchType) {
      case 'email':
        return member.email.toLowerCase().includes(searchLower)
      case 'name':
        return member.full_name?.toLowerCase().includes(searchLower)
      case 'id':
        return member.id.toLowerCase().includes(searchLower) || 
               member.referral_code.toLowerCase().includes(searchLower)
      default:
        return member.email.toLowerCase().includes(searchLower) ||
               member.full_name?.toLowerCase().includes(searchLower) ||
               member.id.toLowerCase().includes(searchLower) ||
               member.referral_code.toLowerCase().includes(searchLower)
    }
  })

  const selectedMemberData = members.find(m => m.id === selectedMember)
  const availableFund = ADMIN_FUND_BALANCE - totalCredited

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
        <h1 className="text-2xl font-bold tracking-tight">Direct Credit (P2P Transfer)</h1>
        <p className="text-muted-foreground">Send funds directly to member accounts - appears as regular deposit</p>
      </div>

      {/* Admin Fund Balance */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary/20 p-3">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admin Fund Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(ADMIN_FUND_BALANCE)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-success/30 bg-gradient-to-br from-success/5 to-success/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-success/20 p-3">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available to Send</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(availableFund)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-warning/20 p-3">
                <Send className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Credited</p>
                <p className="text-2xl font-bold text-warning">{formatCurrency(totalCredited)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {success && (
        <Card className="border-success bg-success/10">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle className="h-5 w-5 text-success" />
            <p className="font-medium text-success">Transfer completed successfully! Member will see this as a deposit.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Credit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Send Funds to Member
            </CardTitle>
            <CardDescription>
              Transfer funds P2P to any member. Transaction will appear as a regular deposit in their account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Member Search */}
            <div className="space-y-2">
              <Label>Find Member</Label>
              <div className="flex gap-2">
                <Select value={searchType} onValueChange={(v) => setSearchType(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="id">ID/Code</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by email, name, ID, or referral code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
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
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{member.full_name || 'N/A'}</span>
                          <span className="text-muted-foreground">- {member.email}</span>
                          <code className="ml-2 rounded bg-muted px-1 text-xs">{member.referral_code}</code>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
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

            {/* Quick Amount Buttons */}
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <div className="grid grid-cols-4 gap-2">
                {[100, 500, 1000, 5000].map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant={amount === String(amt) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAmount(String(amt))}
                  >
                    ${amt.toLocaleString()}
                  </Button>
                ))}
              </div>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-lg"
                  min="0"
                  max={availableFund}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Internal Notes (optional)</Label>
              <Textarea
                placeholder="Notes for your records only (member won't see this)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button
              onClick={handleCredit}
              disabled={submitting || !selectedMember || !amount || parseFloat(amount) <= 0}
              className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Transfer...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send {amount ? formatCurrency(amount) : 'Funds'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedMemberData && amount && parseFloat(amount) > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">Recipient</p>
                    <p className="text-lg font-bold">{selectedMemberData.full_name || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">{selectedMemberData.email}</p>
                    <code className="mt-1 inline-block rounded bg-muted px-2 py-0.5 text-xs">
                      ID: {selectedMemberData.referral_code}
                    </code>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">Transfer Details</p>
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Destination</span>
                        <span className="font-medium capitalize">
                          {creditType === 'bonus_direct' ? 'Bonus' : 'Asset'} Wallet
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount</span>
                        <span className="text-xl font-bold text-success">{formatCurrency(amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sponsor Bonus</span>
                        <span className="font-medium">
                          {creditType === 'asset_sponsor' ? '8% 5% 2%' : 'None'}
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
                        <li>- Sponsor bonuses will be triggered</li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <User className="mb-2 h-12 w-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground">
                    Select a member and enter amount to preview
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Credit History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent P2P Transfers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {creditHistory.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">No transfers yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditHistory.slice(0, 5).map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>
                          <p className="font-medium">{h.member_name}</p>
                          <p className="text-xs text-muted-foreground">{h.member_email}</p>
                        </TableCell>
                        <TableCell className="font-medium text-success">
                          {formatCurrency(h.amount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(h.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
