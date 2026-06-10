'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  TrendingUp, Sparkles, RefreshCw, CheckCircle, Loader2,
  Clock, Users, DollarSign, XCircle, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ProfitRun = {
  id: string
  run_date: string
  percentage: number
  total_eligible: number
  total_distributed: number
  created_at: string
  profit_allocations?: { user_id: string; amount: number }[]
}

export default function AdminProfitPage() {
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [percentage, setPercentage] = useState('')
  const [profitRuns, setProfitRuns] = useState<ProfitRun[]>([])
  const [todayRun, setTodayRun] = useState<ProfitRun | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data: runs } = await supabase
        .from('profit_runs')
        .select('*, profit_allocations(user_id, amount)')
        .order('run_date', { ascending: false })
        .limit(14)

      const list: ProfitRun[] = (runs || []).map((r: ProfitRun) => ({
        ...r,
        total_eligible: r.profit_allocations?.length ?? 0,
        total_distributed: r.profit_allocations?.reduce((sum, a) => sum + Number(a.amount), 0) ?? 0,
      }))
      setProfitRuns(list)
      setTodayRun(list.find(r => r.run_date === today) || null)
    } catch (err) {
      console.error('Failed to load profit runs:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const triggerProfit = async (customPct?: number) => {
    const pct = customPct ?? (Math.random() * 1 + 1) // 1-2% random
    const finalPct = parseFloat(pct.toFixed(2))

    if (finalPct < 1 || finalPct > 2) {
      setMessage({ type: 'error', text: 'Percentage must be between 1% and 2%.' })
      return
    }

    setTriggering(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/trigger-profit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage: finalPct }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: `Daily profit ${finalPct}% triggered successfully! Run ID: ${data.profitRunId}` })
        setPercentage('')
        await fetchData()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to trigger profit.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Request failed. Check server logs.' })
    } finally {
      setTriggering(false)
    }
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profit Control</h1>
        <p className="text-muted-foreground">Trigger daily profit for all eligible members (1%–2% per day)</p>
      </div>

      {/* Alert message */}
      {message && (
        <Card className={cn(
          'border',
          message.type === 'success' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-red-500/50 bg-red-500/10'
        )}>
          <CardContent className="flex items-center gap-3 p-4">
            {message.type === 'success'
              ? <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
              : <XCircle className="h-5 w-5 shrink-0 text-red-500" />}
            <p className={cn('text-sm font-medium', message.type === 'success' ? 'text-emerald-400' : 'text-red-400')}>
              {message.text}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Today's status */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className={cn('border-2', todayRun ? 'border-amber-500/40 bg-amber-500/5' : 'border-muted')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              Today's Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-400">
              {todayRun ? `${todayRun.percentage}%` : 'Not Set'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {todayRun ? 'Profit triggered today' : 'No profit triggered yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-blue-400" />
              Eligible Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todayRun?.total_eligible ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">Members with active deposit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              Total Distributed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-400">
              {todayRun ? formatCurrency(todayRun.total_distributed) : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Schedule info */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
          <div>
            <p className="font-medium text-blue-400">Profit Schedule (WIB)</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Admin triggers profit anytime between <strong className="text-foreground">1:00 AM – 9:59 AM</strong>.
              Members can claim from <strong className="text-foreground">10:00 AM</strong> until end of day.
              Unclaimed profits expire at midnight.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trigger controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Trigger Daily Profit
          </CardTitle>
          <CardDescription>
            Manually trigger profit distribution. All members with an active deposit and below the 400% cap will receive profit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Random */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Random (1–2%)</h3>
              </div>
              <p className="text-sm text-muted-foreground">System picks a random rate between 1% and 2%</p>
              <Button onClick={() => triggerProfit()} disabled={triggering} className="w-full">
                {triggering
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Triggering...</>
                  : <><RefreshCw className="mr-2 h-4 w-4" /> Generate Random</>}
              </Button>
            </div>

            {/* Custom */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-400" />
                <h3 className="font-medium">Custom Percentage</h3>
              </div>
              <div className="space-y-2">
                <Label>Percentage (1.00 – 2.00)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      placeholder="1.50"
                      value={percentage}
                      onChange={(e) => setPercentage(e.target.value)}
                      min="1"
                      max="2"
                      step="0.01"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <Button
                    onClick={() => triggerProfit(parseFloat(percentage))}
                    disabled={triggering || !percentage || parseFloat(percentage) < 1 || parseFloat(percentage) > 2}
                    variant="secondary"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {todayRun && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <p className="text-sm text-amber-300">
                Profit for today ({todayRun.percentage}%) has already been triggered.
                Triggering again will overwrite unclaimed entries for today.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Profit Run History (Last 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profitRuns.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No profit runs yet. Trigger the first one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Eligible</TableHead>
                    <TableHead>Distributed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitRuns.map((run) => {
                    const isToday = run.run_date === new Date().toISOString().split('T')[0]
                    return (
                      <TableRow key={run.id} className={cn(isToday && 'bg-amber-500/5')}>
                        <TableCell className="font-medium">
                          {formatDate(run.run_date)}
                          {isToday && (
                            <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
                              Today
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-lg font-bold text-amber-400">{run.percentage}%</span>
                        </TableCell>
                        <TableCell>{run.total_eligible ?? '—'}</TableCell>
                        <TableCell className="font-medium text-emerald-400">
                          {formatCurrency(run.total_distributed ?? 0)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
