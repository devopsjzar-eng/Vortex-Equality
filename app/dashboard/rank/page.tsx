'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, RANK_REQUIREMENTS, RANK_REWARDS } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Trophy, Users, TrendingUp, DollarSign, Gift, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const ranks = ['P1', 'P2', 'P3', 'P4', 'P5'] as const

export default function RankPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
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

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getProgress = (current: number, required: number) => {
    if (required === 0) return 100
    return Math.min((current / required) * 100, 100)
  }

  if (loading || !profile) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const currentRankIndex = ranks.indexOf(profile.rank)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leadership Ranks</h1>
        <p className="text-muted-foreground">Advance through ranks and earn exclusive rewards</p>
      </div>

      {/* Current Rank Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Trophy className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Rank</p>
              <p className="text-3xl font-bold">{profile.rank}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Position</p>
            <p className="text-2xl font-bold">{currentRankIndex + 1} of {ranks.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Rank Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Rank Progress</CardTitle>
          <CardDescription>Your journey through the leadership ladder</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-8">
            <div className="flex justify-between">
              {ranks.map((rank, index) => (
                <div
                  key={rank}
                  className={cn(
                    'flex flex-col items-center',
                    index <= currentRankIndex ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full border-2 font-bold',
                      index <= currentRankIndex
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-muted'
                    )}
                  >
                    {index < currentRankIndex ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      rank
                    )}
                  </div>
                  <span className="mt-2 text-sm font-medium">{rank}</span>
                </div>
              ))}
            </div>
            <div className="absolute left-6 right-6 top-6 -z-10 h-0.5 bg-border">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(currentRankIndex / (ranks.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Ranks */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ranks.map((rank, index) => {
          const requirements = RANK_REQUIREMENTS[rank]
          const reward = RANK_REWARDS[rank]
          const isAchieved = index <= currentRankIndex
          const isCurrent = index === currentRankIndex
          const isNext = index === currentRankIndex + 1

          return (
            <Card
              key={rank}
              className={cn(
                'transition-all',
                isCurrent && 'border-primary ring-2 ring-primary/20',
                isNext && 'border-warning/50',
                isAchieved && !isCurrent && 'opacity-60'
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className={cn(
                      'h-5 w-5',
                      isAchieved ? 'text-success' : 'text-muted-foreground'
                    )} />
                    {rank}
                  </CardTitle>
                  {isAchieved && (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                      Achieved
                    </span>
                  )}
                  {isNext && (
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                      Next
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Requirements */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        Direct Referrals
                      </span>
                      <span>{profile.total_direct_referrals}/{requirements.direct_referrals}</span>
                    </div>
                    <Progress 
                      value={isNext ? getProgress(profile.total_direct_referrals, requirements.direct_referrals) : (isAchieved ? 100 : 0)} 
                      className="h-1.5" 
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        Group Turnover
                      </span>
                      <span>{formatCurrency(isNext ? profile.group_turnover : (isAchieved ? requirements.group_investment : 0))}/{formatCurrency(requirements.group_investment)}</span>
                    </div>
                    <Progress 
                      value={isNext ? getProgress(profile.group_turnover, requirements.group_investment) : (isAchieved ? 100 : 0)} 
                      className="h-1.5" 
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        Personal Asset
                      </span>
                      <span>{formatCurrency(isNext ? profile.total_deposit : (isAchieved ? requirements.personal_investment : 0))}/{formatCurrency(requirements.personal_investment)}</span>
                    </div>
                    <Progress 
                      value={isNext ? getProgress(profile.total_deposit, requirements.personal_investment) : (isAchieved ? 100 : 0)} 
                      className="h-1.5" 
                    />
                  </div>
                </div>

                {/* Reward */}
                {reward && (
                  <div className="flex items-center justify-between rounded-lg bg-success/10 p-3">
                    <span className="flex items-center gap-1 text-sm text-success">
                      <Gift className="h-4 w-4" />
                      Rank Reward
                    </span>
                    <span className="font-bold text-success">{formatCurrency(reward)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Leadership Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <Gift className="mt-0.5 h-5 w-5 text-success" />
              <div>
                <p className="font-medium">Instant Rank Rewards</p>
                <p className="text-sm text-muted-foreground">Receive bonus rewards immediately upon rank advancement</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Real-time Qualification</p>
                <p className="text-sm text-muted-foreground">System automatically tracks and promotes you when qualified</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-5 w-5 text-warning" />
              <div>
                <p className="font-medium">Team Building</p>
                <p className="text-sm text-muted-foreground">Grow your network to unlock higher ranks and rewards</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Trophy className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Exclusive Status</p>
                <p className="text-sm text-muted-foreground">Higher ranks unlock exclusive platform features</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
