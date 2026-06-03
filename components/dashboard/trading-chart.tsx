'use client'

import { useMemo } from 'react'
import { Transaction } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'

interface TradingChartProps {
  transactions: Transaction[]
}

export function TradingChart({ transactions }: TradingChartProps) {
  const chartData = useMemo(() => {
    // Generate last 7 days of data
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Calculate profits for this day
      const dayProfits = transactions
        .filter(t => 
          t.type === 'profit_claim' && 
          t.status === 'success' &&
          t.created_at.split('T')[0] === dateStr
        )
        .reduce((sum, t) => sum + t.net_amount, 0)

      days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        profit: dayProfits,
      })
    }
    return days
  }, [transactions])

  const totalProfit = chartData.reduce((sum, d) => sum + d.profit, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg">Trading Performance</CardTitle>
          <p className="text-sm text-muted-foreground">Last 7 days profit</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-success">
            +${totalProfit.toFixed(2)}
          </p>
          <p className="flex items-center justify-end gap-1 text-sm text-success">
            <TrendingUp className="h-3 w-3" />
            This week
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Profit']}
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
