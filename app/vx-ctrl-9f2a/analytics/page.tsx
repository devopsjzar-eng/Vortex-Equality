'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  Users, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCw
} from 'lucide-react'

interface Stats {
  totalMembers: number
  newMembersToday: number
  totalDeposits: number
  totalWithdrawals: number
  pendingWithdrawals: number
  todayDeposits: number
  todayWithdrawals: number
  activeMembers: number
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    newMembersToday: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    todayDeposits: 0,
    todayWithdrawals: 0,
    activeMembers: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClient()

  const fetchStats = async () => {
    setRefreshing(true)
    const today = new Date().toISOString().split('T')[0]

    // Total members
    const { count: totalMembers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', false)

    // New members today
    const { count: newMembersToday } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', false)
      .gte('created_at', today)

    // Total deposits
    const { data: deposits } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'deposit')
      .eq('status', 'completed')

    const totalDeposits = deposits?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0

    // Total withdrawals
    const { data: withdrawals } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'withdrawal')
      .eq('status', 'completed')

    const totalWithdrawals = withdrawals?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0

    // Pending withdrawals
    const { count: pendingWithdrawals } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'withdrawal')
      .eq('status', 'pending')

    // Today deposits
    const { data: todayDeps } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'deposit')
      .eq('status', 'completed')
      .gte('created_at', today)

    const todayDeposits = todayDeps?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0

    // Today withdrawals
    const { data: todayWiths } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'withdrawal')
      .eq('status', 'completed')
      .gte('created_at', today)

    const todayWithdrawals = todayWiths?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0

    // Active members (has any transaction in last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: activeUsers } = await supabase
      .from('transactions')
      .select('user_id')
      .gte('created_at', weekAgo)

    const uniqueActiveUsers = new Set(activeUsers?.map(u => u.user_id)).size

    setStats({
      totalMembers: totalMembers || 0,
      newMembersToday: newMembersToday || 0,
      totalDeposits,
      totalWithdrawals,
      pendingWithdrawals: pendingWithdrawals || 0,
      todayDeposits,
      todayWithdrawals,
      activeMembers: uniqueActiveUsers
    })

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const statCards = [
    {
      title: 'Total Members',
      value: stats.totalMembers,
      change: `+${stats.newMembersToday} today`,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Active Members',
      value: stats.activeMembers,
      change: 'Last 7 days',
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Total Deposits',
      value: `$${stats.totalDeposits.toLocaleString()}`,
      change: `+$${stats.todayDeposits.toLocaleString()} today`,
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      trend: 'up'
    },
    {
      title: 'Total Withdrawals',
      value: `$${stats.totalWithdrawals.toLocaleString()}`,
      change: `$${stats.todayWithdrawals.toLocaleString()} today`,
      icon: TrendingDown,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      trend: 'down'
    },
    {
      title: 'Pending Withdrawals',
      value: stats.pendingWithdrawals,
      change: 'Awaiting approval',
      icon: DollarSign,
      color: 'text-slate-1000',
      bgColor: 'bg-slate-1000/10'
    },
    {
      title: 'Net Flow',
      value: `$${(stats.totalDeposits - stats.totalWithdrawals).toLocaleString()}`,
      change: stats.totalDeposits > stats.totalWithdrawals ? 'Positive' : 'Negative',
      icon: stats.totalDeposits > stats.totalWithdrawals ? ArrowUpRight : ArrowDownRight,
      color: stats.totalDeposits > stats.totalWithdrawals ? 'text-blue-500' : 'text-red-500',
      bgColor: stats.totalDeposits > stats.totalWithdrawals ? 'bg-blue-500/10' : 'bg-red-500/10'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground">Platform statistics and insights</p>
          </div>
        </div>
        <Button onClick={fetchStats} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Key platform metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Avg Deposit</p>
              <p className="text-xl font-bold">
                ${stats.totalMembers > 0 ? (stats.totalDeposits / stats.totalMembers).toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Platform Balance</p>
              <p className="text-xl font-bold text-blue-600">
                ${(stats.totalDeposits - stats.totalWithdrawals).toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Engagement Rate</p>
              <p className="text-xl font-bold">
                {stats.totalMembers > 0 ? ((stats.activeMembers / stats.totalMembers) * 100).toFixed(1) : '0'}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
