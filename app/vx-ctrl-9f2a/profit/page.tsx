'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  TrendingUp, 
  Sparkles, 
  RefreshCw, 
  CheckCircle, 
  Loader2,
  Clock,
  Users,
  DollarSign,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ClaimStats = {
  totalEligible: number
  totalClaimed: number
  totalExpired: number
  totalAvailable: number
  totalDistributed: number
}

type ProfitHistory = {
  profit_date: string
  base_rate: number
  total_claims: number
  claimed_count: number
  expired_count: number
  total_distributed: number
}

export default function ProfitControlPage() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [customPercentage, setCustomPercentage] = useState('')
  const [todayRate, setTodayRate] = useState<number | null>(null)
  const [claimStats, setClaimStats] = useState<ClaimStats>({
    totalEligible: 0,
    totalClaimed: 0,
    totalExpired: 0,
    totalAvailable: 0,
    totalDistributed: 0
  })
  const [profitHistory, setProfitHistory] = useState<ProfitHistory[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Check auth
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Demo mode
        setTodayRate(1.75)
        setClaimStats({
          totalEligible: 156,
          totalClaimed: 89,
          totalExpired: 12,
          totalAvailable: 55,
          totalDistributed: 4523.50
        })
        setProfitHistory([
          { profit_date: today, base_rate: 0.0175, total_claims: 156, claimed_count: 89, expired_count: 12, total_distributed: 4523.50 },
          { profit_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], base_rate: 0.0142, total_claims: 152, claimed_count: 145, expired_count: 7, total_distributed: 3892.30 },
          { profit_date: new Date(Date.now() - 172800000).toISOString().split('T')[0], base_rate: 0.0188, total_claims: 148, claimed_count: 140, expired_count: 8, total_distributed: 5120.75 },
        ])
        setLoading(false)
        return
      }

      // Get today's profit claims stats
      const { data: todayClaims, error: claimsError } = await supabase
        .from('profit_claims')
        .select('*')
        .eq('profit_date', today)

      if (!claimsError && todayClaims && todayClaims.length > 0) {
        const claimed = todayClaims.filter(c => c.status === 'claimed')
        const expired = todayClaims.filter(c => c.status === 'expired')
        const available = todayClaims.filter(c => c.status === 'available')
        
        setTodayRate(Number(todayClaims[0].base_rate) * 100)
        setClaimStats({
          totalEligible: todayClaims.length,
          totalClaimed: claimed.length,
          totalExpired: expired.length,
          totalAvailable: available.length,
          totalDistributed: claimed.reduce((sum, c) => sum + Number(c.profit_amount), 0)
        })
      } else {
        setTodayRate(null)
      }

      // Get profit history (last 14 days)
      const dates = Array.from({ length: 14 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - i)
        return d.toISOString().split('T')[0]
      })

      const { data: historyData } = await supabase
        .from('profit_claims')
        .select('*')
        .in('profit_date', dates)

      if (historyData) {
        const groupedByDate = historyData.reduce((acc, claim) => {
          if (!acc[claim.profit_date]) {
            acc[claim.profit_date] = {
              profit_date: claim.profit_date,
              base_rate: Number(claim.base_rate),
              total_claims: 0,
              claimed_count: 0,
              expired_count: 0,
              total_distributed: 0
            }
          }
          acc[claim.profit_date].total_claims++
          if (claim.status === 'claimed') {
            acc[claim.profit_date].claimed_count++
            acc[claim.profit_date].total_distributed += Number(claim.profit_amount)
          }
          if (claim.status === 'expired') {
            acc[claim.profit_date].expired_count++
          }
          return acc
        }, {} as Record<string, ProfitHistory>)

        setProfitHistory(Object.values(groupedByDate).sort((a, b) => 
          new Date(b.profit_date).getTime() - new Date(a.profit_date).getTime()
        ))
      }

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const generateDailyProfit = async (percentage?: number) => {
    const rateToUse = percentage || parseFloat(customPercentage) || null;
    
    if (!confirm(`Anda yakin ingin MEMBAGIKAN PROFIT ${rateToUse ? rateToUse + '%' : 'ACAK'} ke seluruh member SEKARANG?`)) {
      return
    }

    setGenerating(true)
    setMessage(null)

    try {
      // Connects directly to the new secure API we just built!
      const payload = rateToUse ? { rate: rateToUse } : {}
      const response = await fetch('/api/admin/trigger-profit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: data.message || 'Profit berhasil disebarkan!' })
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to generate profit' })
      }
      setCustomPercentage('')
    } catch (error) {
      console.error('Error triggering profit:', error)
      setMessage({ type: 'error', text: 'Failed to trigger profit generation' })
    } finally {
      setGenerating(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

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
        <p className="text-muted-foreground">
          Generate and manage daily profit distributions (10:00 AM - 11:59 PM)
        </p>
      </div>

      {message && (
        <Card className={cn(
          "border",
          message.type === 'success' ? 'border-blue-500/50 bg-blue-500/10' : 'border-red-500/50 bg-red-500/10'
        )}>
          <CardContent className="flex items-center gap-3 p-4">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-blue-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <p className={cn(
              "font-medium",
              message.type === 'success' ? 'text-blue-600' : 'text-red-600'
            )}>
              {message.text}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Today's Profit Status */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className={cn(
          "border-2",
          todayRate !== null ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-1000/50 bg-slate-1000/5'
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-primary" />
              Today&apos;s Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {todayRate !== null ? `${todayRate.toFixed(2)}%` : 'Not Set'}
            </p>
            <p className="text-xs text-muted-foreground">
              {todayRate !== null ? 'Active' : 'Generate profit below'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-blue-500" />
              Eligible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{claimStats.totalEligible}</p>
            <p className="text-xs text-muted-foreground">Members today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              Claimed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{claimStats.totalClaimed}</p>
            <p className="text-xs text-muted-foreground">{claimStats.totalAvailable} pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <XCircle className="h-4 w-4 text-red-500" />
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{claimStats.totalExpired}</p>
            <p className="text-xs text-muted-foreground">Unclaimed / hangus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Distributed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(claimStats.totalDistributed)}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Info */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="flex items-center gap-3 p-4">
          <Clock className="h-5 w-5 text-blue-500" />
          <div>
            <p className="font-medium text-blue-700">Profit Schedule</p>
            <p className="text-sm text-blue-600">
              Profit tersedia untuk diklaim member mulai <strong>10:00 pagi</strong> sampai <strong>23:59 malam</strong>. 
              Setelah lewat jam 12 malam, profit yang tidak diklaim akan <strong>hangus</strong> dan reset.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Generate Profit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-slate-1000" />
            Generate Daily Profit
          </CardTitle>
          <CardDescription>
            Generate profit untuk hari ini. Sistem akan otomatis generate jam 10:00 pagi, 
            tapi Anda bisa trigger manual di sini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Random Generation */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Random Profit (1-2%)</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Generate profit acak antara 1% sampai 2%
              </p>
              <Button
                onClick={() => generateDailyProfit()}
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate Random
                  </>
                )}
              </Button>
            </div>

            {/* Custom Percentage */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <h3 className="font-medium">Custom Percentage</h3>
              </div>
              <div className="space-y-2">
                <Label>Profit Percentage</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      placeholder="1.50"
                      value={customPercentage}
                      onChange={(e) => setCustomPercentage(e.target.value)}
                      min="0"
                      max="10"
                      step="0.01"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <Button
                    onClick={() => generateDailyProfit(parseFloat(customPercentage))}
                    disabled={generating || !customPercentage || parseFloat(customPercentage) <= 0}
                    variant="secondary"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {todayRate !== null && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-slate-1000/30 bg-slate-1000/10 p-4">
              <AlertTriangle className="h-5 w-5 text-slate-500 shrink-0" />
              <p className="text-sm text-slate-600">
                Profit hari ini sudah di-generate ({todayRate.toFixed(2)}%). 
                Generate ulang akan update rate untuk member yang belum claim.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profit History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Profit History (Last 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profitHistory.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No profit records yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Base Rate</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Claimed</TableHead>
                  <TableHead>Expired</TableHead>
                  <TableHead>Distributed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitHistory.map((profit) => {
                  const isToday = profit.profit_date === new Date().toISOString().split('T')[0]
                  return (
                    <TableRow key={profit.profit_date} className={cn(isToday && 'bg-primary/5')}>
                      <TableCell className="font-medium">
                        {formatDate(profit.profit_date)}
                        {isToday && (
                          <span className="ml-2 rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
                            Today
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-lg font-bold text-blue-600">
                          {(profit.base_rate * 100).toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell>{profit.total_claims}</TableCell>
                      <TableCell>
                        <span className="text-blue-600">{profit.claimed_count}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-600">{profit.expired_count}</span>
                      </TableCell>
                      <TableCell className="font-medium text-blue-600">
                        {formatCurrency(profit.total_distributed)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
