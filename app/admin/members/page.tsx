'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Wallet } from '@/lib/types'
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
import { Users, Search, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type MemberWithWallets = Profile & {
  wallets: Wallet[]
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberWithWallets[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<MemberWithWallets | null>(null)
  const supabase = createClient()

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select(`
        *,
        wallets(*)
      `)
      .eq('is_admin', false)
      .order('created_at', { ascending: false })
    
    if (data) setMembers(data as MemberWithWallets[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchMembers()

    // Subscribe to real-time updates on profiles table
    const profilesSubscription = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'is_admin=eq.false',
        },
        async (payload) => {
          // Re-fetch all members when any profile changes
          await fetchMembers()
        }
      )
      .subscribe()

    // Subscribe to real-time updates on wallets table
    const walletsSubscription = supabase
      .channel('wallets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
        },
        async (payload) => {
          // Re-fetch all members when any wallet changes
          await fetchMembers()
        }
      )
      .subscribe()

    // Subscribe to transactions for indirect updates
    const transactionsSubscription = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
        },
        async (payload) => {
          // Debounce to avoid too many re-fetches
          await fetchMembers()
        }
      )
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      profilesSubscription.unsubscribe()
      walletsSubscription.unsubscribe()
      transactionsSubscription.unsubscribe()
    }
  }, [supabase, fetchMembers])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const filteredMembers = members.filter(member =>
    member.email.toLowerCase().includes(search.toLowerCase()) ||
    member.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    member.referral_code.toLowerCase().includes(search.toLowerCase())
  )

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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Members ({members.length})
          </CardTitle>
          <div className="relative w-64">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>Total Deposit</TableHead>
                <TableHead>Asset Balance</TableHead>
                <TableHead>Bonus Balance</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => {
                const assetWallet = member.wallets.find(w => w.wallet_type === 'asset')
                const bonusWallet = member.wallets.find(w => w.wallet_type === 'bonus')
                
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
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-sm font-medium text-primary">
                        {member.rank}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrency(member.total_deposit)}</TableCell>
                    <TableCell className="text-success">{formatCurrency(assetWallet?.balance || 0)}</TableCell>
                    <TableCell className="text-warning">{formatCurrency(bonusWallet?.balance || 0)}</TableCell>
                    <TableCell>{formatDate(member.created_at)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMember(member)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Member Detail Dialog */}
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
                      {formatCurrency(selectedMember.wallets.find(w => w.wallet_type === 'asset')?.balance || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-warning/10 p-3">
                    <p className="text-sm text-muted-foreground">Bonus Wallet</p>
                    <p className="text-xl font-bold text-warning">
                      {formatCurrency(selectedMember.wallets.find(w => w.wallet_type === 'bonus')?.balance || 0)}
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
    </div>
  )
}
