'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { 
  Calculator, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  Percent,
  ArrowRight,
  Info,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'

export default function CalculatorPage() {
  const [deposit, setDeposit] = useState(500)
  const [days, setDays] = useState(30)
  const [rate, setRate] = useState(1.5)

  const calculateCompoundProfit = () => {
    let balance = deposit
    const dailyRate = rate / 100
    for (let i = 0; i < days; i++) {
      balance += balance * dailyRate
    }
    return balance
  }

  const totalBalance = calculateCompoundProfit()
  const totalProfit = totalBalance - deposit
  const percentageGain = ((totalProfit / deposit) * 100)
  const dailyProfit = deposit * (rate / 100)

  // Milestones
  const milestones = [
    { days: 30, label: '1 Month' },
    { days: 90, label: '3 Months' },
    { days: 180, label: '6 Months' },
    { days: 365, label: '1 Year' },
  ]

  const calculateMilestone = (targetDays: number) => {
    let balance = deposit
    const dailyRate = rate / 100
    for (let i = 0; i < targetDays; i++) {
      balance += balance * dailyRate
    }
    return balance
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-7 w-7 text-primary" />
          Profit Calculator
        </h1>
        <p className="text-muted-foreground">Calculate your potential earnings with Vortex Equality</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calculator Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              Investment Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Deposit Amount */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Initial Deposit</Label>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">${deposit.toLocaleString()}</span>
                </div>
              </div>
              <Slider
                value={[deposit]}
                onValueChange={(value) => setDeposit(value[0])}
                min={50}
                max={50000}
                step={50}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>$50</span>
                <span>$50,000</span>
              </div>
              {/* Quick deposit buttons */}
              <div className="flex flex-wrap gap-2">
                {[100, 500, 1000, 5000, 10000].map((amount) => (
                  <Button
                    key={amount}
                    variant={deposit === amount ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDeposit(amount)}
                  >
                    ${amount.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Investment Period */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Investment Period</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="text-3xl font-bold">{days}</span>
                  <span className="text-muted-foreground">days</span>
                </div>
              </div>
              <Slider
                value={[days]}
                onValueChange={(value) => setDays(value[0])}
                min={7}
                max={365}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>7 days</span>
                <span>365 days</span>
              </div>
              {/* Quick period buttons */}
              <div className="flex flex-wrap gap-2">
                {[30, 60, 90, 180, 365].map((d) => (
                  <Button
                    key={d}
                    variant={days === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDays(d)}
                  >
                    {d} days
                  </Button>
                ))}
              </div>
            </div>

            {/* Daily Rate */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Daily Profit Rate</Label>
                <div className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-muted-foreground" />
                  <span className="text-3xl font-bold">{rate}</span>
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
              <Slider
                value={[rate * 10]}
                onValueChange={(value) => setRate(value[0] / 10)}
                min={10}
                max={20}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1.0%</span>
                <span>2.0%</span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Daily profit ranges from 1% to 2% based on market conditions
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {/* Main Result Card */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Projected Earnings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Total Balance */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/20 p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Balance after {days} days</p>
                <p className="text-4xl font-bold text-blue-500">
                  ${totalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-muted/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Total Profit</p>
                  <p className="text-2xl font-bold text-blue-500">
                    +${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">ROI</p>
                  <p className="text-2xl font-bold text-slate-1000">
                    +{percentageGain.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Daily Profit</p>
                  <p className="text-2xl font-bold text-blue-500">
                    ${dailyProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Monthly Profit</p>
                  <p className="text-2xl font-bold text-purple-500">
                    ${(dailyProfit * 30).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              {/* CTA */}
              <Link href="/dashboard/deposit">
                <Button className="h-12 w-full gap-2 text-lg">
                  Start Earning Now
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Growth Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {milestones.map((milestone) => {
                  const balance = calculateMilestone(milestone.days)
                  const profit = balance - deposit
                  const roi = ((profit / deposit) * 100)
                  
                  return (
                    <div
                      key={milestone.days}
                      className="flex items-center justify-between rounded-lg border p-3 transition-all hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {milestone.days}d
                        </div>
                        <div>
                          <p className="font-medium">{milestone.label}</p>
                          <p className="text-xs text-muted-foreground">
                            +{roi.toFixed(0)}% ROI
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-500">
                          ${balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          +${profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Disclaimer */}
      <Card className="border-slate-1000/30 bg-slate-1000/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="h-5 w-5 text-slate-1000 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-slate-1000">Disclaimer</p>
            <p className="text-muted-foreground">
              This calculator provides estimated projections based on the selected daily profit rate. 
              Actual returns may vary between 1-2% daily depending on market conditions. 
              Past performance does not guarantee future results. Maximum ROI cap is 400%.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
