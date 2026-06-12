'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Wallet as MemberWallet } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Users, Search, Eye, Ban, ShieldCheck, GitBranch, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

type MemberWithWallets = Profile & {
  wallets: MemberWallet[]
  financial_wallets: { active_deposit: number; network_bonus_balance: number }[]
  is_banned?: boolean
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberWithWallets[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<MemberWithWallets | null>(null)

  const [uplineMember, setUplineMember] = useState<MemberWithWallets | null>(null)
  const [newUplineSearch, setNewUplineSearch] = useState('')
  const [newUplineResult, setNewUplineResult] = useState<{ id: string; email: string; full_name: string } | null>(null)
  const [uplineSearching, setUplineSearching] = useState(false)
  const [uplineShifting, setUplineShifting] = useState(false)
  const [uplineMessage, setUplineMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = createClient()

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select(`*, wallets(*), financial_wallets(active_deposit, network_bonus_balance)`)
      .eq('is_admin', false)
      .order('created_at', { ascending: false })

    if (data) {
      const ids = data.map(member => member.id)
      const { data: statuses } = await supabase
        .from('user_account_status')
        .select('user_id, is_banned')
        .in('user_id', ids)

      const statusByUser = new Map((statuses || []).map(s => [s.user_id, s.is_banned]))
      setMembers(data.map(member => ({
        ...member,
        is_banned: statusByUser.get(member.id) || false,
      })) as MemberWithWallets[])
    }
    setLoading(false)
  }, [supabase])

  const setBanStatus = async (member: MemberWithWallets, isBanned: boolean) => {
    const response = await fetch('/api/admin/member/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: member.id, isBanned, reason: isBanned ? 'Admin action' : null }),
    })
    if (response.ok) await fetchMembers()
  }

  const searchNewUpline = async () => {
    if (!newUplineSearch.trim()) return
    setUplineSearching(true)
    setNewUplineResult(null)
    setUplineMessage(null)
    try {
      const res = await fetch(`/api/admin/member/search?email=${encodeURIComponent(newUplineSearch.trim())}`)
      const data = await res.json()
      if (data.success && data.member) {
        if (data.member.id === uplineMember?.id) {
          setUplineMessage({ type: 'error', text: 'Cannot set a user as their own upline.' })
        } else {
          setNewUplineResult(data.member)
        }
      } else {
        setUplineMessage({ type: 'error', text: 'Member not found.' })
      }
    } catch {
      setUplineMessage({ type: 'error', text: 'Search failed.' })
    } finally {
      setUplineSearching(false)
    }
  }

  const confirmUplineShift = async (removeUpline = false) => {
    if (!uplineMember) return
    if (!removeUpline && !newUplineResult) return

    setUplineShifting(true)
    setUplineMessage(null)
    try {
      const res = await fetch('/api/admin/member/change-upline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uplineMember.id,
          newUplineId: removeUpline ? null : newUplineResult!.id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setUplineMessage({
          type: 'success',
          text: removeUpline
            ? 'Upline removed. Member is now a root member.'
            : `Upline changed to ${newUplineResult!.email} successfully.`,
        })
        await fetchMembers()
        setNewUplineResult(null)
        setNewUplineSearch('')
      } else {
        setUplineMessage({ type: 'error', text: data.error || 'Failed to shift upline.' })
      }
    } catch {
      setUplineMessage({ type: 'error', text: 'Request failed.' })
    } finally {
      setUplineShifting(false)
    }
  }

  useEffect(() => {
    fetchMembers()
    const profilesSub = supabase.channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: 'is_admin=eq.false' }, fetchMembers)
      .subscribe()
    const walletsSub = supabase.channel('financial-wallets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_wallets' }, fetchMembers)
      .subscribe()
    return () => {
      profilesSub.unsubscribe()
      walletsSub.unsubscribe()
    }
  }, [supabase, fetchMembers])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  const filteredMembers = members.filter(member =>
    member.email.toLowerCase().includes(search.toLowerCase()) ||
    member.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    member.referral_code.toLowerCase().includes(search.toLowerCase())
  )

  const currentUpline = uplineMember?.referred_by
    ? members.find(m => m.id === uplineMember.referred_by)
    : null

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
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        <p className="text-muted-foreground">Manage all platform members</p>
      </div>

      <Card className="apple-matte-surface">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Members ({members.length})
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Referral Code</TableHead>
                  <TableHead>Upline</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Total Deposit</TableHead>
                  <TableHead>Asset Balance</TableHead>
                  <TableHead>Bonus Balance</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => {
                  const fw = member.financial_wallets?.[0]
                  const assetBalance = Number(fw?.active_deposit || 0)
                  const bonusBalance = Number(fw?.network_bonus_balance || 0)
                  const uplineProfile = member.referred_by
                    ? members.find(m => m.id === member.referred_by)
                    : null

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.full_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-1 text-sm">{member.referral_code}</code>
                      </TableCell>
                      <TableCell>
                        {uplineProfile ? (
                          <div>
                            <p className="text-sm font-medium">{uplineProfile.full_name || uplineProfile.email}</p>
                            <p className="text-xs text-muted-foreground">{uplineProfile.referral_code}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">— none —</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-sm font-medium text-primary">
                          {member.rank}
                        </span>
                      </TableCell>
                      <TableCell>{formatCurrency(member.total_deposit)}</TableCell>
                      <TableCell className="text-success">{formatCurrency(assetBalance)}</TableCell>
                      <TableCell className="text-warning">{formatCurrency(bonusBalance)}</TableCell>
                      <TableCell>{formatDate(member.created_at)}</TableCell>
                      <TableCell>
                        <span className={member.is_banned ? 'text-destructive' : 'text-success'}>
                          {member.is_banned ? 'Banned' : 'Active'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedMember(member)} title="View details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBanStatus(member, !member.is_banned)}
                            title={member.is_banned ? 'Unban user' : 'Ban user'}
                          >
                            {member.is_banned ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUplineMember(member)
                              setNewUplineSearch('')
                              setNewUplineResult(null)
                              setUplineMessage(null)
                            }}
                            title="Change upline (Upline Shifter)"
                          >
                            <GitBranch className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selectedMember.full_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedMember.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Referral Code</p>
                  <code className="rounded bg-muted px-2 py-1">{selectedMember.referral_code}</code>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rank</p>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-sm font-medium text-primary">
                    {selectedMember.rank}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Deposit</p>
                  <p className="font-medium">{formatCurrency(selectedMember.total_deposit)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Direct Referrals</p>
                  <p className="font-medium">{selectedMember.total_direct_referrals}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Group Turnover</p>
                  <p className="font-medium">{formatCurrency(selectedMember.group_turnover)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Booster %</p>
                  <p className="font-medium text-warning">+{selectedMember.booster_percentage}%</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-medium">Wallet Balances</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-success/10 p-3">
                    <p className="text-sm text-muted-foreground">Asset Wallet</p>
                    <p className="text-xl font-bold text-success">
                      {formatCurrency(Number(selectedMember.financial_wallets?.[0]?.active_deposit || 0))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-warning/10 p-3">
                    <p className="text-sm text-muted-foreground">Bonus Wallet</p>
                    <p className="text-xl font-bold text-warning">
                      {formatCurrency(Number(selectedMember.financial_wallets?.[0]?.network_bonus_balance || 0))}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Member since {formatDate(selectedMember.created_at)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!uplineMember} onOpenChange={() => setUplineMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-amber-400" />
              Upline Shifter
            </DialogTitle>
            <DialogDescription>
              Reassign the sponsor/upline for this member. All group volumes will be recalculated automatically.
            </DialogDescription>
          </DialogHeader>

          {uplineMember && (
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Moving member</p>
                <p className="font-semibold">{uplineMember.full_name || uplineMember.email}</p>
                <p className="text-sm text-muted-foreground">{uplineMember.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Current upline:{' '}
                  <span className="text-foreground">
                    {currentUpline
                      ? `${currentUpline.full_name || currentUpline.email} (${currentUpline.referral_code})`
                      : '— none —'}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Search new upline by email</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="new-upline@email.com"
                    value={newUplineSearch}
                    onChange={(e) => setNewUplineSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchNewUpline()}
                  />
                  <Button variant="outline" onClick={searchNewUpline} disabled={uplineSearching}>
                    {uplineSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                  </Button>
                </div>
              </div>

              {newUplineResult && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1">
                  <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">New upline found</p>
                  <p className="font-medium">{newUplineResult.full_name || newUplineResult.email}</p>
                  <p className="text-sm text-muted-foreground">{newUplineResult.email}</p>
                </div>
              )}

              {uplineMessage && (
                <div className={`rounded-lg p-3 text-sm font-medium ${
                  uplineMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                }`}>
                  {uplineMessage.text}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  onClick={() => confirmUplineShift(false)}
                  disabled={!newUplineResult || uplineShifting}
                  className="w-full"
                >
                  {uplineShifting ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Shifting...</span>
                  ) : (
                    'Confirm Upline Change'
                  )}
                </Button>
                {uplineMember.referred_by && (
                  <Button
                    variant="outline"
                    onClick={() => confirmUplineShift(true)}
                    disabled={uplineShifting}
                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    Remove Upline (Make Root Member)
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
