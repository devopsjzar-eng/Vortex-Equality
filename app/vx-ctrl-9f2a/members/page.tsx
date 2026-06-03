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
import { Users, Search, Eye, DollarSign, UserCheck, Wallet } from 'lucide-react'
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
    
    // REAL-TIME SUBSCRIPTION for profiles table
    const profilesSubscription = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'is_admin=eq.false'
        },
        () => {
          console.log('[v0] Profiles updated - refreshing members')
          fetchMembers()
        }
      )
      .subscribe()
    
    // REAL-TIME SUBSCRIPTION for wallets table
    const walletsSubscription = supabase
      .channel('wallets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets'
        },
        () => {
          console.log('[v0] Wallets updated - refreshing members')
          fetchMembers()
        }
      )
      .subscribe()
    
    // Cleanup subscriptions
    return () => {
      profilesSubscription.unsubscribe()
      walletsSubscription.unsubscribe()
    }
  }, [fetchMembers, supabase])

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

  // Calculate stats
  const activeMembers = members.filter(m => {
    const assetBalance = m.wallets?.find(w => w.wallet_type === 'asset')?.balance || 0
    const bonusBalance = m.wallets?.find(w => w.wallet_type === 'bonus')?.balance || 0
    return assetBalance > 0 || bonusBalance > 0 || m.total_deposit > 0
  })
  
  const totalAssets = members.reduce((sum, m) => {
    return sum + (m.wallets?.find(w => w.wallet_type === 'asset')?.balance || 0)
  }, 0)
  
  const totalBonus = members.reduce((sum, m) => {
    return sum + (m.wallets?.find(w => w.wallet_type === 'bonus')?.balance || 0)
  }, 0)
  
  const totalDeposits = members.reduce((sum, m) => sum + m.total_deposit, 0)

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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-xs text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-success/10 p-2">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{activeMembers.length}</p>
                <p className="text-xs text-muted-foreground">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-success/10 p-2">
                <Wallet className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{formatCurrency(totalAssets)}</p>
                <p className="text-xs text-muted-foreground">Total Asset Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-warning/10 p-2">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{formatCurrency(totalBonus)}</p>
                <p className="text-xs text-muted-foreground">Total Bonus Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
          <div className="w-full overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="hidden sm:table-cell">Referral Code</TableHead>
                <TableHead>Total Deposit</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => {
                const assetWallet = member.wallets?.find(w => w.wallet_type === 'asset')
                const bonusWallet = member.wallets?.find(w => w.wallet_type === 'bonus')
                const assetBalance = assetWallet?.balance || 0
                const bonusBalance = bonusWallet?.balance || 0
                const isActive = assetBalance > 0 || bonusBalance > 0 || member.total_deposit > 0
                
                return (
                  <TableRow key={member.id} className={isActive ? 'bg-success/5' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <span className="h-2 w-2 rounded-full bg-success animate-pulse" title="Active Member" />
                        )}
                        <div>
                          <p className="font-medium">{member.full_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <code className="rounded bg-muted px-2 py-1 text-xs">{member.referral_code}</code>
                    </TableCell>
                    <TableCell>
                      <span className={member.total_deposit > 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}>
                        {formatCurrency(member.total_deposit)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={assetBalance > 0 ? 'font-semibold text-success' : 'text-muted-foreground'}>
                        {formatCurrency(assetBalance)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={bonusBalance > 0 ? 'font-semibold text-warning' : 'text-muted-foreground'}>
                        {formatCurrency(bonusBalance)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">{formatDate(member.created_at)}</TableCell>
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
          </div>
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
