'use client'

import { Profile, RankRequirements } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Trophy, Users, DollarSign, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RankProgressProps {
  profile: Profile | null
  requirements: RankRequirements
}

const ranks = ['P1', 'P2', 'P3', 'P4', 'P5'] as const

export function RankProgress({ profile, requirements }: RankProgressProps) {
  if (!profile) return null

  const currentRankIndex = ranks.indexOf(profile.rank)
  const nextRank = ranks[currentRankIndex + 1]
  const nextReqs = nextRank ? requirements[nextRank] : null

  const getProgress = (current: number, required: number) => {
    if (required === 0) return 100
    return Math.min((current / required) * 100, 100)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Leadership Rank
          </span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            {profile.rank}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rank Progress Bar */}
        <div className="relative">
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
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold',
                    index <= currentRankIndex
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-muted'
                  )}
                >
                  {rank}
                </div>
              </div>
            ))}
          </div>
          <div className="absolute left-5 right-5 top-5 -z-10 h-0.5 bg-border">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(currentRankIndex / (ranks.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Next Rank Requirements */}
        {nextReqs && (
          <div className="space-y-4 rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium">Progress to {nextRank}</p>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Direct Referrals
                  </span>
                  <span>{profile.total_direct_referrals} / {nextReqs.direct}</span>
                </div>
                <Progress value={getProgress(profile.total_direct_referrals, nextReqs.direct)} className="h-2" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Group Turnover
                  </span>
                  <span>{formatCurrency(profile.group_turnover)} / {formatCurrency(nextReqs.turnover)}</span>
                </div>
                <Progress value={getProgress(profile.group_turnover, nextReqs.turnover)} className="h-2" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Personal Asset
                  </span>
                  <span>{formatCurrency(profile.total_deposit)} / {formatCurrency(nextReqs.personal)}</span>
                </div>
                <Progress value={getProgress(profile.total_deposit, nextReqs.personal)} className="h-2" />
              </div>
            </div>
          </div>
        )}

        {!nextReqs && (
          <div className="rounded-lg bg-success/10 p-4 text-center">
            <Trophy className="mx-auto h-8 w-8 text-success" />
            <p className="mt-2 font-medium text-success">Maximum Rank Achieved!</p>
            <p className="text-sm text-muted-foreground">{"You've"} reached the highest leadership level.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
