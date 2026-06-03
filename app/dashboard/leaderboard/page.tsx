'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Trophy, 
  Medal, 
  Crown, 
  TrendingUp, 
  Users, 
  Wallet,
  Star,
  Award,
  RefreshCw,
  Flame
} from 'lucide-react'

interface LeaderboardEntry {
  id: string
  full_name: string
  rank: string
  total_deposit: number
  asset_wallet: number
  team_count: number
  avatar?: string
}

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true)
  const [topDeposits, setTopDeposits] = useState<LeaderboardEntry[]>([])
  const [topTeams, setTopTeams] = useState<LeaderboardEntry[]>([])
  const [topEarners, setTopEarners] = useState<LeaderboardEntry[]>([])
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Demo data
        const demoDeposits: LeaderboardEntry[] = [
          { id: '1', full_name: 'Alexander W.', rank: 'P5 TITAN', total_deposit: 125000, asset_wallet: 450000, team_count: 1250 },
          { id: '2', full_name: 'Victoria S.', rank: 'P4 LEGEND', total_deposit: 85000, asset_wallet: 298000, team_count: 890 },
          { id: '3', full_name: 'Benjamin K.', rank: 'P4 LEGEND', total_deposit: 72000, asset_wallet: 245000, team_count: 720 },
          { id: '4', full_name: 'Sophia M.', rank: 'P3 ELITE', total_deposit: 58000, asset_wallet: 189000, team_count: 540 },
          { id: '5', full_name: 'William J.', rank: 'P3 ELITE', total_deposit: 45000, asset_wallet: 156000, team_count: 420 },
          { id: '6', full_name: 'Isabella R.', rank: 'P2 MASTER', total_deposit: 38000, asset_wallet: 125000, team_count: 310 },
          { id: '7', full_name: 'James L.', rank: 'P2 MASTER', total_deposit: 32000, asset_wallet: 108000, team_count: 280 },
          { id: '8', full_name: 'Charlotte H.', rank: 'P2 MASTER', total_deposit: 28000, asset_wallet: 92000, team_count: 230 },
          { id: '9', full_name: 'Michael T.', rank: 'P1 SPARK', total_deposit: 22000, asset_wallet: 72000, team_count: 180 },
          { id: '10', full_name: 'Emma D.', rank: 'P1 SPARK', total_deposit: 18000, asset_wallet: 58000, team_count: 150 },
        ]

        const demoTeams: LeaderboardEntry[] = [
          { id: '1', full_name: 'Alexander W.', rank: 'P5 TITAN', total_deposit: 125000, asset_wallet: 450000, team_count: 1250 },
          { id: '2', full_name: 'Victoria S.', rank: 'P4 LEGEND', total_deposit: 85000, asset_wallet: 298000, team_count: 890 },
          { id: '3', full_name: 'Benjamin K.', rank: 'P4 LEGEND', total_deposit: 72000, asset_wallet: 245000, team_count: 720 },
          { id: '4', full_name: 'Sophia M.', rank: 'P3 ELITE', total_deposit: 58000, asset_wallet: 189000, team_count: 540 },
          { id: '5', full_name: 'William J.', rank: 'P3 ELITE', total_deposit: 45000, asset_wallet: 156000, team_count: 420 },
          { id: '6', full_name: 'Daniel C.', rank: 'P2 MASTER', total_deposit: 35000, asset_wallet: 115000, team_count: 380 },
          { id: '7', full_name: 'Isabella R.', rank: 'P2 MASTER', total_deposit: 38000, asset_wallet: 125000, team_count: 310 },
          { id: '8', full_name: 'James L.', rank: 'P2 MASTER', total_deposit: 32000, asset_wallet: 108000, team_count: 280 },
          { id: '9', full_name: 'Olivia P.', rank: 'P1 SPARK', total_deposit: 25000, asset_wallet: 82000, team_count: 245 },
          { id: '10', full_name: 'Charlotte H.', rank: 'P2 MASTER', total_deposit: 28000, asset_wallet: 92000, team_count: 230 },
        ]

        const demoEarners: LeaderboardEntry[] = [
          { id: '1', full_name: 'Alexander W.', rank: 'P5 TITAN', total_deposit: 125000, asset_wallet: 450000, team_count: 1250 },
          { id: '2', full_name: 'Victoria S.', rank: 'P4 LEGEND', total_deposit: 85000, asset_wallet: 298000, team_count: 890 },
          { id: '3', full_name: 'Benjamin K.', rank: 'P4 LEGEND', total_deposit: 72000, asset_wallet: 245000, team_count: 720 },
          { id: '4', full_name: 'Sophia M.', rank: 'P3 ELITE', total_deposit: 58000, asset_wallet: 189000, team_count: 540 },
          { id: '5', full_name: 'William J.', rank: 'P3 ELITE', total_deposit: 45000, asset_wallet: 156000, team_count: 420 },
          { id: '6', full_name: 'Isabella R.', rank: 'P2 MASTER', total_deposit: 38000, asset_wallet: 125000, team_count: 310 },
          { id: '7', full_name: 'James L.', rank: 'P2 MASTER', total_deposit: 32000, asset_wallet: 108000, team_count: 280 },
          { id: '8', full_name: 'Charlotte H.', rank: 'P2 MASTER', total_deposit: 28000, asset_wallet: 92000, team_count: 230 },
          { id: '9', full_name: 'Michael T.', rank: 'P1 SPARK', total_deposit: 22000, asset_wallet: 72000, team_count: 180 },
          { id: '10', full_name: 'Emma D.', rank: 'P1 SPARK', total_deposit: 18000, asset_wallet: 58000, team_count: 150 },
        ]

        setTopDeposits(demoDeposits)
        setTopTeams(demoTeams.sort((a, b) => b.team_count - a.team_count))
        setTopEarners(demoEarners.sort((a, b) => b.asset_wallet - a.asset_wallet))
        setLoading(false)
        return
      }

      // Fetch real data
      const { data: deposits } = await supabase
        .from('profiles')
        .select('id, full_name, rank, total_deposit, asset_wallet')
        .order('total_deposit', { ascending: false })
        .limit(10)

      if (deposits) {
        setTopDeposits(deposits.map(d => ({ ...d, team_count: 0 })))
      }

      const { data: earners } = await supabase
        .from('profiles')
        .select('id, full_name, rank, total_deposit, asset_wallet')
        .order('asset_wallet', { ascending: false })
        .limit(10)

      if (earners) {
        setTopEarners(earners.map(e => ({ ...e, team_count: 0 })))
      }

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getRankColor = (rank: string) => {
    if (rank.includes('P5')) return 'from-purple-500 to-violet-600'
    if (rank.includes('P4')) return 'from-slate-1000 to-blue-600'
    if (rank.includes('P3')) return 'from-blue-500 to-blue-600'
    if (rank.includes('P2')) return 'from-blue-500 to-blue-600'
    if (rank.includes('P1')) return 'from-pink-500 to-rose-600'
    return 'from-slate-500 to-slate-600'
  }

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Crown className="h-6 w-6 text-slate-1000" />
    if (position === 2) return <Medal className="h-6 w-6 text-slate-400" />
    if (position === 3) return <Medal className="h-6 w-6 text-slate-600" />
    return <span className="flex h-6 w-6 items-center justify-center text-sm font-bold text-muted-foreground">{position}</span>
  }

  const getPositionBg = (position: number) => {
    if (position === 1) return 'bg-gradient-to-r from-slate-1000/20 to-slate-1000/20 border-slate-1000/30'
    if (position === 2) return 'bg-gradient-to-r from-slate-500/20 to-slate-400/20 border-slate-500/30'
    if (position === 3) return 'bg-gradient-to-r from-slate-600/20 to-blue-700/20 border-slate-600/30'
    return 'bg-card border-border'
  }

  const LeaderboardList = ({ data, valueKey, valueLabel, icon: Icon }: { 
    data: LeaderboardEntry[], 
    valueKey: 'total_deposit' | 'asset_wallet' | 'team_count',
    valueLabel: string,
    icon: any
  }) => (
    <div className="space-y-3">
      {/* Top 3 Podium */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {data.slice(0, 3).map((entry, index) => {
          const positions = [1, 0, 2] // 2nd, 1st, 3rd
          const actualPosition = positions[index]
          const actualEntry = data[actualPosition]
          const heights = ['h-24', 'h-32', 'h-20']
          
          return (
            <div key={index} className="flex flex-col items-center">
              <div className={`relative mb-2 flex ${heights[index]} w-full flex-col items-center justify-end rounded-t-xl bg-gradient-to-t ${
                actualPosition === 0 ? 'from-slate-1000/30 to-slate-1000/5' :
                actualPosition === 1 ? 'from-slate-500/30 to-slate-500/5' :
                'from-slate-600/30 to-slate-600/5'
              }`}>
                <div className={`absolute -top-6 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${getRankColor(actualEntry?.rank || 'Starter')} text-white font-bold shadow-lg`}>
                  {actualEntry?.full_name.charAt(0)}
                </div>
                <div className="pb-2 text-center">
                  <p className="text-xs font-medium truncate max-w-[80px]">{actualEntry?.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">{actualEntry?.rank}</p>
                </div>
              </div>
              <div className={`flex h-8 w-full items-center justify-center rounded-b-lg font-bold ${
                actualPosition === 0 ? 'bg-slate-1000 text-slate-900' :
                actualPosition === 1 ? 'bg-slate-400 text-slate-950' :
                'bg-slate-600 text-slate-200'
              }`}>
                #{actualPosition + 1}
              </div>
            </div>
          )
        })}
      </div>

      {/* Full List */}
      {data.map((entry, index) => (
        <div
          key={entry.id}
          className={`flex items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-md ${getPositionBg(index + 1)}`}
        >
          {/* Position */}
          <div className="flex h-10 w-10 items-center justify-center">
            {getPositionIcon(index + 1)}
          </div>

          {/* Avatar */}
          <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${getRankColor(entry.rank)} text-white font-bold shadow-lg`}>
            {entry.full_name.charAt(0)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate">{entry.full_name}</p>
              {index < 3 && <Flame className="h-4 w-4 text-blue-500" />}
            </div>
            <p className="text-xs text-muted-foreground">{entry.rank}</p>
          </div>

          {/* Value */}
          <div className="text-right">
            <p className="text-lg font-bold text-primary">
              {valueKey === 'team_count' ? entry[valueKey].toLocaleString() : formatCurrency(entry[valueKey])}
            </p>
            <p className="text-xs text-muted-foreground">{valueLabel}</p>
          </div>
        </div>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-7 w-7 text-slate-1000" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground">Top performers in Vortex Equality</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-500">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          Live
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-1000/30 bg-gradient-to-br from-slate-1000/10 to-slate-1000/10">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-slate-1000/20 p-3">
              <Crown className="h-6 w-6 text-slate-1000" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Top Depositor</p>
              <p className="font-bold">{topDeposits[0]?.full_name}</p>
              <p className="text-xs text-slate-1000">{formatCurrency(topDeposits[0]?.total_deposit || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-500/10">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-blue-500/20 p-3">
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Top Earner</p>
              <p className="font-bold">{topEarners[0]?.full_name}</p>
              <p className="text-xs text-blue-500">{formatCurrency(topEarners[0]?.asset_wallet || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-violet-500/10">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-purple-500/20 p-3">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Largest Team</p>
              <p className="font-bold">{topTeams[0]?.full_name}</p>
              <p className="text-xs text-purple-500">{topTeams[0]?.team_count.toLocaleString()} members</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="deposits" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="deposits" className="gap-2">
                <Wallet className="h-4 w-4" />
                Top Deposits
              </TabsTrigger>
              <TabsTrigger value="earners" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Top Earners
              </TabsTrigger>
              <TabsTrigger value="teams" className="gap-2">
                <Users className="h-4 w-4" />
                Top Teams
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deposits">
              <LeaderboardList 
                data={topDeposits} 
                valueKey="total_deposit" 
                valueLabel="Total Deposit"
                icon={Wallet}
              />
            </TabsContent>

            <TabsContent value="earners">
              <LeaderboardList 
                data={topEarners} 
                valueKey="asset_wallet" 
                valueLabel="Total Earnings"
                icon={TrendingUp}
              />
            </TabsContent>

            <TabsContent value="teams">
              <LeaderboardList 
                data={topTeams} 
                valueKey="team_count" 
                valueLabel="Team Members"
                icon={Users}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Motivation Card */}
      <Card className="border-slate-1000/30 bg-gradient-to-r from-slate-1000/10 via-blue-500/10 to-slate-1000/10">
        <CardContent className="p-6 text-center">
          <Award className="mx-auto h-12 w-12 text-slate-1000 mb-3" />
          <h3 className="text-lg font-bold mb-2">Want to See Your Name Here?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Increase your deposit, grow your team, and climb the leaderboard!
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <div className="rounded-lg bg-background/50 px-4 py-2">
              <p className="font-bold text-slate-1000">P1-P5</p>
              <p className="text-xs text-muted-foreground">Rank Rewards</p>
            </div>
            <div className="rounded-lg bg-background/50 px-4 py-2">
              <p className="font-bold text-blue-500">$100-$5,000</p>
              <p className="text-xs text-muted-foreground">Bonus Pool</p>
            </div>
            <div className="rounded-lg bg-background/50 px-4 py-2">
              <p className="font-bold text-purple-500">8%/5%/2%</p>
              <p className="text-xs text-muted-foreground">Referral Bonus</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
