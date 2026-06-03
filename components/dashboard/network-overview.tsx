'use client'

import { Profile } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Users, UserPlus, TrendingUp, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface NetworkOverviewProps {
  profile: Profile | null
}

export function NetworkOverview({ profile }: NetworkOverviewProps) {
  if (!profile) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-success/10 to-blue-500/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-success/20 p-2.5">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold">Network Overview</h3>
              <p className="text-sm text-muted-foreground">Your sponsor bonus summary</p>
            </div>
          </div>
          <Link 
            href="/dashboard/referrals" 
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View team
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
          {/* Total Team */}
          <div className="rounded-xl bg-muted/50 p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Team</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{profile.total_direct_referrals || 0}</p>
            <p className="text-xs text-muted-foreground">Direct members</p>
          </div>
          
          {/* Level 1 Bonus */}
          <div className="rounded-xl bg-success/5 p-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Level 1</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-success">8%</p>
            <p className="text-xs text-muted-foreground">Direct referral bonus</p>
          </div>
          
          {/* Level 2 Bonus */}
          <div className="rounded-xl bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Level 2</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-primary">5%</p>
            <p className="text-xs text-muted-foreground">Second level bonus</p>
          </div>
          
          {/* Level 3 Bonus */}
          <div className="rounded-xl bg-warning/5 p-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-warning" />
              <span className="text-sm text-muted-foreground">Level 3</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-warning">2%</p>
            <p className="text-xs text-muted-foreground">Third level bonus</p>
          </div>
        </div>
        
        {/* Group Turnover */}
        <div className="border-t border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Group Turnover</p>
                <p className="text-xl font-bold">{formatCurrency(profile.group_turnover || 0)}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Total deposits from your network
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
