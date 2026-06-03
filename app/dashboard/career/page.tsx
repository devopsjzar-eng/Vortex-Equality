'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, RANK_REQUIREMENTS } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Loader2, 
  Award, 
  Zap,
  Star,
  Crown,
  Gem,
  Trophy,
  Check,
  Lock,
  DollarSign,
  Users,
  Wallet,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

const rankIcons: Record<string, React.ElementType> = {
  P1: Zap,
  P2: Star,
  P3: Crown,
  P4: Gem,
  P5: Trophy
}

const rankColors: Record<string, { bg: string, text: string, border: string, gradient: string }> = {
  P1: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', gradient: 'from-blue-500 to-blue-600' },
  P2: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', gradient: 'from-blue-500 to-blue-600' },
  P3: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', gradient: 'from-purple-500 to-violet-600' },
  P4: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', gradient: 'from-blue-500 to-slate-500' },
  P5: { bg: 'bg-slate-1000/20', text: 'text-slate-400', border: 'border-slate-1000/30', gradient: 'from-slate-400 to-slate-1000' }
}

const rankNames: Record<string, string> = {
  P1: 'Spark',
  P2: 'Rising Star',
  P3: 'Elite Trader',
  P4: 'Master Investor',
  P5: 'Legendary Pioneer'
}

export default function CareerPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState({
    directReferrals: 0,
    groupOmset: 0,
    personalAsset: 0,
    qualifyingLegs: 0
  })
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (profileData) setProfile(profileData)

      // Get wallet info
      const { data: wallet } = await supabase
        .from('wallets')
        .select('total_deposit')
        .eq('user_id', user.id)
        .eq('wallet_type', 'asset')
        .single()

      // Get direct referrals
      const { data: directs } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by', user.id)
      
      // Calculate group omset (simplified)
      const { data: groupWallets } = await supabase
        .from('wallets')
        .select('total_deposit, user_id')
        .eq('wallet_type', 'asset')

      // This would need more complex logic for real leg calculations
      setStats({
        directReferrals: directs?.length || 0,
        groupOmset: profileData?.total_group_investment || 0,
        personalAsset: Number(wallet?.total_deposit || 0),
        qualifyingLegs: 0 // Would need leg calculation logic
      })

      setLoading(false)
    }
    fetchData()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const currentRank = profile?.rank || 'P1'
  const currentRankIndex = ['P1', 'P2', 'P3', 'P4', 'P5'].indexOf(currentRank)

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white lg:text-3xl">Career & Ranking</h1>
        <p className="mt-1 text-slate-400">Track your leadership progress and earn monthly rewards</p>
      </div>

      {/* Current Rank Card */}
      <Card className={cn('border-2', rankColors[currentRank].border, 'bg-slate-900')}>
        <CardContent className="p-6 lg:p-8">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div className={cn('rounded-2xl bg-gradient-to-br p-6', rankColors[currentRank].gradient)}>
              {(() => {
                const Icon = rankIcons[currentRank]
                return <Icon className="h-12 w-12 text-white" />
              })()}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <span className={cn('text-sm font-medium', rankColors[currentRank].text)}>Current Rank</span>
              </div>
              <h2 className="mt-1 text-3xl font-bold text-white">{currentRank} - {rankNames[currentRank]}</h2>
              <p className="mt-1 text-slate-400">
                {currentRank === 'P5' 
                  ? 'Congratulations! You have reached the highest rank!'
                  : `Progress to ${['P1', 'P2', 'P3', 'P4', 'P5'][currentRankIndex + 1]} to unlock more rewards`
                }
              </p>
            </div>
            <div className="rounded-xl bg-slate-800 p-4 text-center">
              <p className="text-sm text-slate-400">Monthly Salary</p>
              <p className={cn('text-3xl font-bold', rankColors[currentRank].text)}>
                ${RANK_REQUIREMENTS[currentRank as keyof typeof RANK_REQUIREMENTS].salary.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.directReferrals}</p>
                <p className="text-sm text-slate-400">Direct Referrals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">${stats.groupOmset.toLocaleString()}</p>
                <p className="text-sm text-slate-400">Group Omset</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/20 p-2">
                <Wallet className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">${stats.personalAsset.toLocaleString()}</p>
                <p className="text-sm text-slate-400">Personal Asset</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <Award className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.qualifyingLegs}</p>
                <p className="text-sm text-slate-400">Qualifying Legs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Ranks */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">Leadership Ranks</CardTitle>
          <CardDescription>Complete requirements to advance through ranks and earn bigger rewards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(['P1', 'P2', 'P3', 'P4', 'P5'] as const).map((rank, index) => {
              const req = RANK_REQUIREMENTS[rank]
              const Icon = rankIcons[rank]
              const colors = rankColors[rank]
              const isCurrentRank = rank === currentRank
              const isAchieved = index <= currentRankIndex
              const isNext = index === currentRankIndex + 1

              return (
                <div 
                  key={rank}
                  className={cn(
                    'rounded-xl border p-4 transition-all',
                    isCurrentRank ? `${colors.border} ${colors.bg}` : 'border-slate-800 bg-slate-800/50',
                    isNext && 'ring-2 ring-primary/50'
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'rounded-xl p-3',
                        isAchieved ? `bg-gradient-to-br ${colors.gradient}` : 'bg-slate-700'
                      )}>
                        <Icon className={cn('h-6 w-6', isAchieved ? 'text-white' : 'text-slate-400')} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={cn('font-bold', isAchieved ? colors.text : 'text-slate-400')}>
                            {rank} - {rankNames[rank]}
                          </h3>
                          {isCurrentRank && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                              Current
                            </span>
                          )}
                          {isAchieved && !isCurrentRank && (
                            <Check className="h-4 w-4 text-blue-400" />
                          )}
                          {!isAchieved && <Lock className="h-4 w-4 text-slate-500" />}
                        </div>
                        <p className="text-sm text-slate-400">
                          Monthly Salary: <span className="font-semibold text-white">${req.salary.toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                      <div className="rounded-lg bg-slate-900/50 p-2 text-center">
                        <p className="text-slate-500">Direct</p>
                        <p className="font-semibold text-white">{req.direct_referrals}</p>
                      </div>
                      <div className="rounded-lg bg-slate-900/50 p-2 text-center">
                        <p className="text-slate-500">Group</p>
                        <p className="font-semibold text-white">${(req.group_investment / 1000).toFixed(0)}K</p>
                      </div>
                      <div className="rounded-lg bg-slate-900/50 p-2 text-center">
                        <p className="text-slate-500">Min Asset</p>
                        <p className="font-semibold text-white">${req.personal_investment}</p>
                      </div>
                      <div className="rounded-lg bg-slate-900/50 p-2 text-center">
                        <p className="text-slate-500">Legs</p>
                        <p className="font-semibold text-white">{req.legs_required > 0 ? `${req.legs_required} x $${(req.leg_investment/1000).toFixed(0)}K` : '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rank Rewards Info */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">How Rank Rewards Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <Zap className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-white">Instant Activation</p>
              <p className="text-sm text-slate-400">Once you meet all requirements, your new rank activates immediately and the salary is paid out</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-white">Acceleration Bonus</p>
              <p className="text-sm text-slate-400">If you reach multiple ranks in the same month, you receive all rank rewards without waiting</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-purple-500/20 p-2">
              <DollarSign className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-white">Monthly Salary</p>
              <p className="text-sm text-slate-400">Maintain your rank each month to receive recurring salary payments automatically</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
