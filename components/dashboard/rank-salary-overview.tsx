'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ElementType } from 'react'
import Link from 'next/link'
import { Award, Clock, Lock, RefreshCw, TrendingUp, Trophy, Users, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const RANKS = [
  { code: 'P1', name: 'P1 Spark', salary: 100, direct: 5, group: 5000, asset: 50, legs: 0, legVolume: 0 },
  { code: 'P2', name: 'P2 Rank', salary: 300, direct: 0, group: 15000, asset: 200, legs: 3, legVolume: 5000 },
  { code: 'P3', name: 'P3 Rank', salary: 500, direct: 0, group: 45000, asset: 600, legs: 3, legVolume: 15000 },
  { code: 'P4', name: 'P4 Rank', salary: 3000, direct: 0, group: 135000, asset: 1000, legs: 3, legVolume: 45000 },
  { code: 'P5', name: 'P5 Elite', salary: 5000, direct: 0, group: 300000, asset: 2000, legs: 3, legVolume: 100000 },
]

type RankProgress = {
  currentRank: string
  highestRank?: string
  personalAsset: number
  directCount: number
  groupVolume?: number
  groupOmset?: number
  legOmsets?: Array<number | string>
  claimReason?: string
  canClaim?: boolean
  nextClaimAvailableAt?: string | null
  suspendedUntil?: string | null
  personalAssetWarning?: {
    rankCode: string
    required: number
    current: number
    message: string
  } | null
}

type Props = {
  title?: string
  description?: string
}

export function RankSalaryOverview({
  title = 'Leadership Ranks',
  description = 'Track P1-P5 rank progress from real Active Asset and downline volume.',
}: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<RankProgress | null>(null)

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/rank/check-qualification')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Unable to load rank progress')
      }

      setProgress(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)

  const getProgress = (current: number, required: number) => {
    if (required <= 0) return 100
    return Math.min((current / required) * 100, 100)
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !progress) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">{error || 'Rank progress is unavailable.'}</p>
        <Button variant="outline" onClick={fetchProgress}>Try Again</Button>
      </div>
    )
  }

  const currentRankIndex = RANKS.findIndex((rank) => rank.code === progress.currentRank)
  const achievedIndex = Math.max(currentRankIndex, -1)
  const groupVolume = Number(progress.groupVolume ?? progress.groupOmset ?? 0)
  const personalAsset = Number(progress.personalAsset || 0)
  const directCount = Number(progress.directCount || 0)
  const legOmsets = (progress.legOmsets || []).map(Number).filter((value) => Number.isFinite(value))
  const topThreeLegs = legOmsets.slice(0, 3)
  const currentRank = currentRankIndex >= 0 ? RANKS[currentRankIndex] : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProgress}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card className="border-slate-800 bg-slate-950">
        <CardContent className="grid gap-5 p-6 lg:grid-cols-[1.2fr_2fr]">
          <div className="flex items-center gap-4">
            <div className={cn(
              'flex h-16 w-16 items-center justify-center rounded-2xl border',
              currentRank ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : 'border-slate-700 bg-slate-900 text-slate-300'
            )}>
              <Trophy className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Qualified Rank</p>
              <p className="text-3xl font-bold text-white">{currentRank?.code || 'Bronze'}</p>
              <p className="text-sm text-muted-foreground">{currentRank?.name || 'Starter'}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={Users} label="Direct Referrals" value={directCount.toLocaleString()} />
            <Metric icon={TrendingUp} label="Group Volume" value={formatCurrency(groupVolume)} />
            <Metric icon={Wallet} label="Active Asset" value={formatCurrency(personalAsset)} />
            <Metric icon={Award} label="Monthly Salary" value={formatCurrency(currentRank?.salary || 0)} />
          </div>
        </CardContent>
      </Card>

      {progress.claimReason && (
        <Card className={cn(
          progress.canClaim ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/70'
        )}>
          <CardContent className="flex items-start gap-3 p-5">
            {progress.canClaim ? <Award className="mt-0.5 h-5 w-5 text-emerald-400" /> : <Lock className="mt-0.5 h-5 w-5 text-slate-400" />}
            <div className="flex-1">
              <p className="font-medium text-white">{progress.canClaim ? 'Salary Available' : 'Salary Claim Status'}</p>
              <p className="text-sm text-muted-foreground">{progress.claimReason}</p>
              {progress.nextClaimAvailableAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <Clock className="mr-1 inline h-3 w-3" />
                  Next claim window: {new Date(progress.nextClaimAvailableAt).toLocaleDateString('en-US')}
                </p>
              )}
              {progress.suspendedUntil && (
                <p className="mt-1 text-xs text-amber-300">
                  Suspended until {new Date(progress.suspendedUntil).toLocaleDateString('en-US')}
                </p>
              )}
            </div>
            <Link href="/dashboard/rewards">
              <Button size="sm">{progress.canClaim ? 'Claim' : 'View Rewards'}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {progress.personalAssetWarning && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-5">
            <p className="font-medium text-amber-200">{progress.personalAssetWarning.message}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {progress.personalAssetWarning.rankCode} requires {formatCurrency(Number(progress.personalAssetWarning.required))}. Current Active Asset is {formatCurrency(Number(progress.personalAssetWarning.current))}.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-800 bg-slate-950">
        <CardHeader>
          <CardTitle className="text-white">Three Biggest Legs</CardTitle>
          <CardDescription>Leg volume is calculated from downline Active Asset in real time.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-muted-foreground">Leg {index + 1}</p>
                <p className="mt-1 text-xl font-semibold text-white">{formatCurrency(topThreeLegs[index] || 0)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {RANKS.map((rank, index) => {
          const qualifiedLegs = legOmsets.filter((amount) => amount >= rank.legVolume).length
          const isAchieved = index <= achievedIndex
          const isNext = index === achievedIndex + 1
          const overallProgress = (
            getProgress(directCount, rank.direct) +
            getProgress(groupVolume, rank.group) +
            getProgress(personalAsset, rank.asset) +
            getProgress(qualifiedLegs, rank.legs)
          ) / 4

          return (
            <Card
              key={rank.code}
              className={cn(
                'border-slate-800 bg-slate-950',
                isAchieved && 'border-emerald-500/30',
                isNext && 'border-amber-500/40'
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-white">{rank.name}</CardTitle>
                    <CardDescription>{formatCurrency(rank.salary)} monthly salary</CardDescription>
                  </div>
                  <span className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    isAchieved ? 'bg-emerald-500/10 text-emerald-300' : isNext ? 'bg-amber-500/10 text-amber-300' : 'bg-slate-800 text-slate-300'
                  )}>
                    {isAchieved ? 'Qualified' : isNext ? 'Next' : 'Locked'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Requirement label="Direct Referrals" current={directCount} required={rank.direct} />
                <Requirement label="Group Volume" current={groupVolume} required={rank.group} currency />
                <Requirement label="Active Asset" current={personalAsset} required={rank.asset} currency />
                <Requirement label="Qualified Legs" current={qualifiedLegs} required={rank.legs} suffix={rank.legs > 0 ? ` at ${formatCurrency(rank.legVolume)}` : ''} />
                {!isAchieved && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Overall Progress</span>
                      <span>{overallProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={overallProgress} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function Requirement({
  label,
  current,
  required,
  currency = false,
  suffix = '',
}: {
  label: string
  current: number
  required: number
  currency?: boolean
  suffix?: string
}) {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
  const value = required <= 0 ? 100 : Math.min((current / required) * 100, 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-right text-white">
          {currency ? formatCurrency(current) : current.toLocaleString()} / {currency ? formatCurrency(required) : required.toLocaleString()}{suffix}
        </span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  )
}
