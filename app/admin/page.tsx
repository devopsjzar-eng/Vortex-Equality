'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  DollarSign, 
  Users, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  TrendingUp,
  Clock,
  AlertTriangle,
} from 'lucide-react'

interface Stats {
  totalMembers: number
  totalDeposits: number
  totalWithdrawals: number
  pendingWithdrawals: number
  netCashFlow: number
  todayProfit: number
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    netCashFlow: 0,
    todayProfit: 0,
  })
  const [loading, setLoading] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const supabase = createClient()

  const fetchStats = useCallback(async () => {
    // Get total members
    const { count: membersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', false)

    // Get total deposits
    const { data: deposits } = await supabase
      .from('transactions')
      .select('net_amount')
      .eq('type', 'deposit')
      .eq('status', 'success')

    const totalDeposits = deposits?.reduce((sum, d) => sum + d.net_amount, 0) || 0

    // Get total withdrawals
    const { data: withdrawals } = await supabase
      .from('transactions')
      .select('net_amount')
      .eq('type', 'withdrawal')
      .eq('status', 'success')

    const totalWithdrawals = withdrawals?.reduce((sum, w) => sum + w.net_amount, 0) || 0

    // Get pending withdrawals
    const { count: pendingCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'withdrawal')
      .eq('status', 'pending')

    // Get today's profit distributed
    const today = new Date().toISOString().split('T')[0]
    const { data: todayProfits } = await supabase
      .from('transactions')
      .select('net_amount')
      .eq('type', 'profit_claim')
      .eq('status', 'success')
      .gte('created_at', today)

    const todayProfit = todayProfits?.reduce((sum, p) => sum + p.net_amount, 0) || 0

    // Get maintenance mode
    const { data: maintenanceSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single()

    setStats({
      totalMembers: membersCount || 0,
      totalDeposits,
      totalWithdrawals,
      pendingWithdrawals: pendingCount || 0,
      netCashFlow: totalDeposits - totalWithdrawals,
      todayProfit,
    })

    setMaintenanceMode(maintenanceSetting?.value === 'true' || maintenanceSetting?.value === true)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchStats()

    // Subscribe to real-time changes for stats updates
    const profilesChannel = supabase
      .channel('admin-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        async () => {
          await fetchStats()
        }
      )
      .subscribe()

    const transactionsChannel = supabase
      .channel('admin-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
        },
        async () => {
          await fetchStats()
        }
      )
      .subscribe()

    const walletsChannel = supabase
      .channel('admin-wallets-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
        },
        async () => {
          await fetchStats()
        }
      )
      .subscribe()

    // Auto-refresh stats every 30 seconds as backup
    const interval = setInterval(() => {
      fetchStats()
    }, 30000)

    return () => {
      profilesChannel.unsubscribe()
      transactionsChannel.unsubscribe()
      walletsChannel.unsubscribe()
      clearInterval(interval)
    }
  }, [fetchStats, supabase])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

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
        <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground">Real-time platform statistics and cash flow</p>
      </div>

      {/* Maintenance Warning */}
      {maintenanceMode && (
        <Card className="border-warning bg-warning/10">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <p className="font-medium text-warning-foreground">Maintenance Mode Active</p>
              <p className="text-sm text-muted-foreground">The platform is currently locked for users.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalMembers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Deposits</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{formatCurrency(stats.totalDeposits)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Withdrawals</CardTitle>
            <ArrowUpFromLine className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{formatCurrency(stats.totalWithdrawals)}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Cash Flow</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${stats.netCashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(stats.netCashFlow)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Withdrawals</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-warning">{stats.pendingWithdrawals}</p>
            <p className="text-sm text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{"Today's"} Profit Distributed</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(stats.todayProfit)}</p>
            <p className="text-sm text-muted-foreground">Claimed by members</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Info */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Average Deposit</p>
              <p className="text-xl font-bold">
                {stats.totalMembers > 0 
                  ? formatCurrency(stats.totalDeposits / stats.totalMembers)
                  : '$0.00'}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Withdrawal Rate</p>
              <p className="text-xl font-bold">
                {stats.totalDeposits > 0 
                  ? `${((stats.totalWithdrawals / stats.totalDeposits) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Platform Status</p>
              <p className={`text-xl font-bold ${maintenanceMode ? 'text-warning' : 'text-success'}`}>
                {maintenanceMode ? 'Maintenance' : 'Online'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
