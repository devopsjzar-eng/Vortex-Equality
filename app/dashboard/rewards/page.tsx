'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Trophy, 
  Star, 
  Crown, 
  Zap,
  Gift,
  Users,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  TrendingUp,
  RefreshCw,
  DollarSign,
  Loader2,
  Clock
} from 'lucide-react'
import Link from 'next/link'

// Rank Requirements based on Marketing Plan
const RANKS = [
  {
    id: 'Bronze',
    code: 'Bronze',
    name: 'Starter',
    icon: Star,
    color: 'from-slate-400 to-slate-500',
    borderColor: 'border-slate-500/30',
    bgColor: 'bg-slate-500/10',
    textColor: 'text-slate-500',
    requirements: {
      directReferrals: 0,
      branches: 0,
      branchOmset: 0,
      groupOmset: 0,
      minAsset: 0
    },
    reward: 0
  },
  {
    id: 'P1',
    code: 'P1',
    name: 'P1 SPARK',
    icon: Zap,
    color: 'from-yellow-400 to-yellow-600',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-500',
    requirements: {
      directReferrals: 5,
      branches: 0,
      branchOmset: 0,
      groupOmset: 5000,
      minAsset: 50
    },
    reward: 100
  },
  {
    id: 'P2',
    code: 'P2',
    name: 'P2 RISING',
    icon: Sparkles,
    color: 'from-orange-400 to-orange-600',
    borderColor: 'border-orange-500/30',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-500',
    requirements: {
      directReferrals: 0,
      branches: 3,
      branchOmset: 5000,
      groupOmset: 15000,
      minAsset: 200
    },
    reward: 300
  },
  {
    id: 'P3',
    code: 'P3',
    name: 'P3 LEADER',
    icon: TrendingUp,
    color: 'from-blue-400 to-blue-600',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
    requirements: {
      directReferrals: 0,
      branches: 3,
      branchOmset: 15000,
      groupOmset: 45000,
      minAsset: 600
    },
    reward: 500
  },
  {
    id: 'P4',
    code: 'P4',
    name: 'P4 MASTER',
    icon: Crown,
    color: 'from-purple-400 to-purple-600',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-500',
    requirements: {
      directReferrals: 0,
      branches: 3,
      branchOmset: 45000,
      groupOmset: 135000,
      minAsset: 1000
    },
    reward: 3000
  },
  {
    id: 'P5',
    code: 'P5',
    name: 'P5 ELITE',
    icon: Trophy,
    color: 'from-red-400 to-rose-600',
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
    requirements: {
      directReferrals: 0,
      branches: 3,
      branchOmset: 100000,
      groupOmset: 300000,
      minAsset: 2000
    },
    reward: 5000
  }
]

interface RankQualification {
  userId: string
  fullName: string
  currentRank: string
  personalAsset: number
  directCount: number
  groupOmset: number
  legOmsets: number[]
  qualifiedRank: {
    code: string
    name: string
    reward: number
  } | null
  pendingReward: {
    id: string
    rank_code: string
    rank_name: string
    reward_amount: string
    status: string
    eligible_at: string
    expires_at: string
  } | null
  claimedThisMonth: {
    id: string
    rank_code: string
    rank_name: string
    reward_amount: string
    claimed_at: string
  } | null
  canClaim: boolean
  newRankAvailable: boolean
}

export default function RewardsPage() {
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [qualification, setQualification] = useState<RankQualification | null>(null)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const fetchQualification = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/rank/check-qualification')
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error)
      }
      
      setQualification(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQualification()
  }, [fetchQualification])

  const handleClaimReward = async () => {
    if (!qualification?.pendingReward) return
    
    try {
      setClaiming(true)
      const res = await fetch('/api/rank/claim-reward', { method: 'POST' })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error)
      }
      
      alert(`Congratulations! You claimed ${formatCurrency(data.amount)} ${data.rank} reward!`)
      fetchQualification()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setClaiming(false)
    }
  }

  const getCurrentRankIndex = () => {
    if (!qualification) return 0
    const idx = RANKS.findIndex(r => r.code === qualification.currentRank)
    return idx >= 0 ? idx : 0
  }

  const currentRankIndex = getCurrentRankIndex()

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchQualification}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leadership Career</h1>
          <p className="text-muted-foreground">Rank rewards and monthly salary</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchQualification}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* CLAIM REWARD CARD - Show if can claim */}
      {qualification?.canClaim && qualification?.pendingReward && (
        <Card className="border-2 border-green-500 bg-green-500/10">
          <CardContent className="flex flex-col items-center justify-between gap-4 p-6 md:flex-row">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-500 p-3">
                <Gift className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Rank Reward Available!</h3>
                <p className="text-muted-foreground">
                  {qualification.pendingReward.rank_name} ({qualification.pendingReward.rank_code}) - Monthly Salary
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
              <span className="text-3xl font-bold text-green-500">
                {formatCurrency(parseFloat(qualification.pendingReward.reward_amount))}
              </span>
              <Button 
                size="lg" 
                className="bg-green-500 hover:bg-green-600"
                onClick={handleClaimReward}
                disabled={claiming}
              >
                {claiming ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Claiming...</>
                ) : (
                  <><Gift className="mr-2 h-4 w-4" /> Claim Reward</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ALREADY CLAIMED THIS MONTH */}
      {qualification?.claimedThisMonth && (
        <Card className="border-blue-500/30 bg-blue-500/10">
          <CardContent className="flex items-center gap-4 p-6">
            <CheckCircle2 className="h-8 w-8 text-blue-500" />
            <div>
              <h3 className="font-bold">Reward Claimed This Month</h3>
              <p className="text-muted-foreground">
                You claimed {formatCurrency(parseFloat(qualification.claimedThisMonth.reward_amount))} ({qualification.claimedThisMonth.rank_code}) on{' '}
                {new Date(qualification.claimedThisMonth.claimed_at).toLocaleDateString('en-US', { 
                  day: 'numeric', month: 'short', year: 'numeric' 
                })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <Clock className="inline h-3 w-3 mr-1" />
                Next claim available on 1st of next month
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Rank Card */}
      <Card className={`relative overflow-hidden border-2 ${RANKS[currentRankIndex].borderColor}`}>
        <div className={`absolute inset-0 bg-gradient-to-r ${RANKS[currentRankIndex].color} opacity-10`} />
        <CardContent className="relative p-6">
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
            <div className="flex items-center gap-4">
              <div className={`rounded-2xl bg-gradient-to-br ${RANKS[currentRankIndex].color} p-5 text-white shadow-lg`}>
                {(() => {
                  const Icon = RANKS[currentRankIndex].icon
                  return <Icon className="h-10 w-10" />
                })()}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Rank</p>
                <h2 className={`text-2xl md:text-3xl font-bold ${RANKS[currentRankIndex].textColor}`}>
                  {RANKS[currentRankIndex].name}
                </h2>
                {currentRankIndex > 0 && (
                  <p className="text-sm text-green-500">
                    Monthly Salary: {formatCurrency(RANKS[currentRankIndex].reward)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
              <div>
                <p className="text-2xl font-bold">{qualification?.directCount || 0}</p>
                <p className="text-xs text-muted-foreground">Direct Referrals</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(qualification?.legOmsets || []).filter(o => o >= 5000).length}
                </p>
                <p className="text-xs text-muted-foreground">Qualified Legs</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(qualification?.groupOmset || 0)}</p>
                <p className="text-xs text-muted-foreground">Group Omset</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(qualification?.personalAsset || 0)}</p>
                <p className="text-xs text-muted-foreground">Personal Asset</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Legs Performance */}
      {qualification?.legOmsets && qualification.legOmsets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Legs Performance</CardTitle>
            <CardDescription>Omset from your direct downlines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-3">
              {qualification.legOmsets.slice(0, 5).map((omset, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    omset >= 5000 ? 'border-green-500/30 bg-green-500/5' : ''
                  }`}
                >
                  <span className="text-sm text-muted-foreground">Leg {idx + 1}</span>
                  <span className={`font-bold ${omset >= 5000 ? 'text-green-500' : ''}`}>
                    {formatCurrency(omset)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rank Progression */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Rank Progression</h3>
        
        {RANKS.map((rank, index) => {
          const isCurrentRank = index === currentRankIndex
          const isAchieved = index <= currentRankIndex
          const isNext = index === currentRankIndex + 1
          const Icon = rank.icon

          // Calculate progress for each requirement
          const directProgress = rank.requirements.directReferrals > 0 
            ? Math.min(((qualification?.directCount || 0) / rank.requirements.directReferrals) * 100, 100)
            : 100
          
          const assetProgress = rank.requirements.minAsset > 0
            ? Math.min(((qualification?.personalAsset || 0) / rank.requirements.minAsset) * 100, 100)
            : 100
          
          const groupProgress = rank.requirements.groupOmset > 0
            ? Math.min(((qualification?.groupOmset || 0) / rank.requirements.groupOmset) * 100, 100)
            : 100
          
          const qualifiedLegs = (qualification?.legOmsets || []).filter(o => o >= rank.requirements.branchOmset).length
          const legProgress = rank.requirements.branches > 0
            ? Math.min((qualifiedLegs / rank.requirements.branches) * 100, 100)
            : 100
          
          const overallProgress = (directProgress + assetProgress + groupProgress + legProgress) / 4

          return (
            <Card 
              key={rank.id} 
              className={`transition-all ${
                isCurrentRank 
                  ? `border-2 ${rank.borderColor} shadow-lg` 
                  : isAchieved 
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'opacity-70'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`relative rounded-xl p-3 ${
                      isAchieved 
                        ? `bg-gradient-to-br ${rank.color} text-white` 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="h-6 w-6" />
                      {isAchieved && index > 0 && (
                        <CheckCircle2 className="absolute -right-1 -top-1 h-4 w-4 text-green-500 bg-background rounded-full" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`font-bold ${isAchieved ? rank.textColor : 'text-muted-foreground'}`}>
                          {rank.name}
                        </h4>
                        {isCurrentRank && (
                          <Badge className="bg-primary text-[10px]">CURRENT</Badge>
                        )}
                        {isNext && (
                          <Badge variant="outline" className="text-[10px]">NEXT</Badge>
                        )}
                      </div>
                      
                      {/* Requirements */}
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {rank.requirements.directReferrals > 0 && (
                          <span className={`rounded-full px-2 py-0.5 ${
                            (qualification?.directCount || 0) >= rank.requirements.directReferrals 
                              ? 'bg-green-500/20 text-green-500' 
                              : 'bg-muted'
                          }`}>
                            {(qualification?.directCount || 0) >= rank.requirements.directReferrals ? '✓' : ''} {rank.requirements.directReferrals} Direct
                          </span>
                        )}
                        {rank.requirements.branches > 0 && (
                          <span className={`rounded-full px-2 py-0.5 ${
                            qualifiedLegs >= rank.requirements.branches 
                              ? 'bg-green-500/20 text-green-500' 
                              : 'bg-muted'
                          }`}>
                            {qualifiedLegs >= rank.requirements.branches ? '✓' : ''} {rank.requirements.branches} Legs @{formatCurrency(rank.requirements.branchOmset)}
                          </span>
                        )}
                        {rank.requirements.groupOmset > 0 && (
                          <span className={`rounded-full px-2 py-0.5 ${
                            (qualification?.groupOmset || 0) >= rank.requirements.groupOmset 
                              ? 'bg-green-500/20 text-green-500' 
                              : 'bg-muted'
                          }`}>
                            {(qualification?.groupOmset || 0) >= rank.requirements.groupOmset ? '✓' : ''} {formatCurrency(rank.requirements.groupOmset)} Group
                          </span>
                        )}
                        {rank.requirements.minAsset > 0 && (
                          <span className={`rounded-full px-2 py-0.5 ${
                            (qualification?.personalAsset || 0) >= rank.requirements.minAsset 
                              ? 'bg-green-500/20 text-green-500' 
                              : 'bg-muted'
                          }`}>
                            {(qualification?.personalAsset || 0) >= rank.requirements.minAsset ? '✓' : ''} {formatCurrency(rank.requirements.minAsset)} Asset
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Reward */}
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Monthly Salary</p>
                      <p className={`text-xl font-bold ${isAchieved && rank.reward > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {formatCurrency(rank.reward)}
                      </p>
                    </div>
                    
                    {/* Status Icon */}
                    {isAchieved && index > 0 ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : !isAchieved && !isNext ? (
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    ) : null}
                  </div>
                </div>

                {/* Progress bar for next rank */}
                {isNext && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Overall Progress to {rank.name}</span>
                      <span className="font-medium">{overallProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={overallProgress} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Instant Rank Up Reward
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              When you qualify for a new rank, the reward is <strong>immediately available</strong> to claim! 
              No waiting period for rank promotions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="h-5 w-5 text-green-500" />
              Monthly Salary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Every month you can claim your rank salary. If you rank up before the month ends, 
              the old rank reward is replaced with the <strong>new higher reward</strong>.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-violet-500/10">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h3 className="text-lg font-bold">Ready to climb higher?</h3>
            <p className="text-sm text-muted-foreground">
              Build your team and increase your group omset to unlock bigger rewards!
            </p>
          </div>
          <Link href="/dashboard/team">
            <Button className="gap-2">
              <Users className="h-4 w-4" />
              Build My Team
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
