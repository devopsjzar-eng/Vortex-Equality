'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Referral } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Copy, CheckCircle, Gift, Zap, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ReferralsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [referrals, setReferrals] = useState<(Referral & { invitee: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (profileData) setProfile(profileData)

    // Fetch referrals with invitee details
    const { data: referralData } = await supabase
      .from('referrals')
      .select(`
        *,
        invitee:profiles!referrals_invitee_id_fkey(*)
      `)
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false })
    
    if (referralData) setReferrals(referralData as (Referral & { invitee: Profile })[])

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const copyReferralLink = () => {
    if (profile) {
      const link = `${window.location.origin}/auth/sign-up?ref=${profile.referral_code}`
      navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const qualifyingReferrals = referrals.filter(r => r.qualifies_for_booster).length
  const pendingBoosters = referrals.filter(r => r.qualifies_for_booster && !r.booster_applied).length

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
        <h1 className="text-2xl font-bold tracking-tight">Referral Program</h1>
        <p className="text-muted-foreground">Invite friends and earn booster bonuses</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{profile?.total_direct_referrals || 0}</p>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <Zap className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{qualifyingReferrals}</p>
              <p className="text-sm text-muted-foreground">Qualifying Boosters</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <Gift className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">+{(profile?.booster_percentage || 0).toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Active Booster</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Your Referral Link
          </CardTitle>
          <CardDescription>
            Share this link with friends. When they deposit equal to or more than your current deposit, you earn a +0.2% permanent daily booster!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/sign-up?ref=${profile?.referral_code || ''}`}
              className="font-mono text-sm"
            />
            <Button onClick={copyReferralLink} className="shrink-0">
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium">Your Referral Code</p>
            <p className="text-2xl font-bold text-primary">{profile?.referral_code}</p>
          </div>
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Booster System Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                1
              </div>
              <p className="font-medium">Share Your Link</p>
              <p className="text-sm text-muted-foreground">Invite friends to join Vortex Equality</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                2
              </div>
              <p className="font-medium">They Deposit</p>
              <p className="text-sm text-muted-foreground">When their deposit equals or exceeds yours</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                3
              </div>
              <p className="font-medium">Earn +0.2%</p>
              <p className="text-sm text-muted-foreground">Permanent daily booster (max 3.0%)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
          <CardDescription>
            Track your referrals and their qualification status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No referrals yet. Share your link to start earning boosters!
            </p>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full',
                      referral.qualifies_for_booster ? 'bg-success/10' : 'bg-muted'
                    )}>
                      <Users className={cn(
                        'h-5 w-5',
                        referral.qualifies_for_booster ? 'text-success' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div>
                      <p className="font-medium">{referral.invitee?.full_name || 'Member'}</p>
                      <p className="text-sm text-muted-foreground">
                        Deposited: {formatCurrency(referral.invitee_deposit)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {referral.qualifies_for_booster ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-sm font-medium text-success">
                        <Zap className="h-3 w-3" />
                        +0.2% Earned
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Needs {formatCurrency(referral.inviter_deposit_at_time - referral.invitee_deposit)} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
