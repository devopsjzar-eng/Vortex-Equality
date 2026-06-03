'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Gift, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { ProfitSuccessModal } from '@/components/profit-success-modal'

interface ProfitClaim {
  id: string
  user_id: string
  daily_profit_id: string
  amount: number
  base_percentage: number
  booster_percentage: number
  total_percentage: number
  status: 'available' | 'claimed' | 'expired'
  created_at: string
  claimed_at: string | null
}

interface ProfitClaimCardProps {
  userId?: string
  assetBalance?: number
  boosterPercentage?: number
  onClaim?: () => void
}

export function ProfitClaimCard({ userId, assetBalance = 0, boosterPercentage = 0, onClaim }: ProfitClaimCardProps) {
  const router = useRouter()
  const [profitClaim, setProfitClaim] = useState<ProfitClaim | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [timeInfo, setTimeInfo] = useState({ timeLeft: '', isClaimTime: false, status: '' })
  const [error, setError] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [claimedAmount, setClaimedAmount] = useState(0)
  const [claimedRates, setClaimedRates] = useState({ base: 0, booster: 0, total: 0 })
  const supabase = createClient()

  // Calculate time info
  useEffect(() => {
    const calculateTimeInfo = () => {
      let now = new Date()
      
      // [DEV] Allow test override via URL param ?testTime=HH:MM
      const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
      const testTimeParam = urlParams.get('testTime')
      if (testTimeParam) {
        const [hours, minutes] = testTimeParam.split(':').map(Number)
        now = new Date()
        now.setHours(hours, minutes, 0, 0)
        console.log('[v0] TEST MODE: Using time:', testTimeParam)
      }
      
      const hours = now.getHours()
      const minutes = now.getMinutes()
      
      // Claim time: 10:00 AM - 11:59 PM (23:59)
      const isClaimTime = hours >= 10 && hours <= 23
      
      if (hours < 10) {
        // Before 10 AM - show countdown to 10 AM
        const tenAM = new Date()
        tenAM.setHours(10, 0, 0, 0)
        const diff = tenAM.getTime() - now.getTime()
        const h = Math.floor(diff / (1000 * 60 * 60))
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const s = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeInfo({
          timeLeft: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
          isClaimTime: false,
          status: 'waiting'
        })
      } else if (isClaimTime) {
        // During claim time - show countdown to midnight
        const midnight = new Date()
        midnight.setHours(23, 59, 59, 999)
        const diff = midnight.getTime() - now.getTime()
        const h = Math.floor(diff / (1000 * 60 * 60))
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const s = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeInfo({
          timeLeft: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
          isClaimTime: true,
          status: 'active'
        })
      } else {
        // After midnight (shouldn't happen normally)
        setTimeInfo({ timeLeft: '00:00:00', isClaimTime: false, status: 'expired' })
      }
    }

    calculateTimeInfo()
    const interval = setInterval(calculateTimeInfo, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch today's profit claim
  const fetchProfitClaim = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      // Get today's daily_profit record first
      const today = new Date().toISOString().split('T')[0]
      
      const { data: dailyProfit } = await supabase
        .from('daily_profits')
        .select('id')
        .eq('profit_date', today)
        .single()
      
      if (!dailyProfit) {
        setLoading(false)
        return
      }
      
      // Then get user's profit claim for today
      const { data, error } = await supabase
        .from('profit_claims')
        .select('*')
        .eq('user_id', userId)
        .eq('daily_profit_id', dailyProfit.id)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profit claim:', error)
      }
      
      if (data) {
        setProfitClaim(data)
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    fetchProfitClaim()
  }, [fetchProfitClaim])

  const handleClaim = async () => {
    if (!profitClaim || profitClaim.status !== 'available') return
    
    // Check if it's claim time
    const now = new Date()
    const hours = now.getHours()
    if (hours < 10 || hours > 23) {
      setError('Claim time is 10:00 AM - 11:59 PM only')
      return
    }
    
    setClaiming(true)
    setError(null)

    try {
      const response = await fetch('/api/profit/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId: profitClaim.id, userId: userId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to claim profit')
      }

      // Store claimed amount for success modal
      setClaimedAmount(profitClaim.amount)
      setClaimedRates({
        base: profitClaim.base_percentage,
        booster: profitClaim.booster_percentage,
        total: profitClaim.total_percentage
      })
      
      // Show success celebration modal
      setShowSuccessModal(true)

      // Refresh data
      await fetchProfitClaim()
      onClaim?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim profit')
    } finally {
      setClaiming(false)
    }
  }

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false)
  }

  const handleContinueToDashboard = () => {
    setShowSuccessModal(false)
    router.push('/dashboard')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (loading) {
    return (
      <Card className="border-muted">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Before 10 AM - Waiting for profit generation
  if (timeInfo.status === 'waiting' && !profitClaim) {
    return (
      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-blue-600/10">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Daily Profit
            </span>
            <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-sm font-normal text-blue-500">
              <Clock className="h-3 w-3" />
              Opens in {timeInfo.timeLeft}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Daily profit will be available at <span className="font-semibold text-foreground">10:00 AM</span>
            </p>
            {assetBalance > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium text-muted-foreground">Your capital:</p>
                <p className="text-xl font-bold text-primary">
                  ${assetBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Daily profit rate is random 1% - 2% each day, 50% goes to you
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // No profit claim available (no deposit or not generated yet)
  if (!profitClaim) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-muted-foreground" />
            Daily Profit
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assetBalance > 0 ? (
            <p className="text-muted-foreground">
              Profit will be generated at 10:00 AM. Please check back later.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Make a deposit to start earning daily profits!
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Already claimed
  if (profitClaim.status === 'claimed') {
    return (
      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-blue-600/10">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-blue-500" />
            Daily Profit Claimed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-blue-500">{formatCurrency(profitClaim.amount)}</p>
              <p className="text-sm text-muted-foreground">
                {(profitClaim.total_percentage).toFixed(2)}% ({(profitClaim.base_percentage).toFixed(2)}% base + {(profitClaim.booster_percentage).toFixed(2)}% booster)
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              Claimed at {profitClaim.claimed_at ? new Date(profitClaim.claimed_at).toLocaleTimeString() : '-'}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Expired
  if (profitClaim.status === 'expired') {
    return (
      <Card className="border-red-500/30 bg-gradient-to-br from-red-500/5 to-red-600/10">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <XCircle className="h-5 w-5 text-red-500" />
            Profit Expired
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-lg font-semibold text-red-500 line-through">{formatCurrency(profitClaim.amount)}</p>
            <p className="mt-2 text-muted-foreground">
              {"Today's"} profit has expired. {"Don't"} forget to claim between 10:00 AM - 11:59 PM tomorrow!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Available to claim
  return (
    <Card className="border-slate-1000/30 bg-gradient-to-br from-slate-1000/5 to-blue-500/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-slate-1000" />
            Daily Profit Available
          </span>
          <span className="flex items-center gap-1 rounded-full bg-slate-1000/10 px-3 py-1 text-sm font-normal text-slate-500">
            <Clock className="h-3 w-3" />
            Expires in {timeInfo.timeLeft}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-3xl font-bold">{formatCurrency(profitClaim.amount)}</p>
          <p className="text-sm text-muted-foreground">
            {(profitClaim.total_percentage).toFixed(2)}% daily return ({(profitClaim.base_percentage).toFixed(2)}% base + {(profitClaim.booster_percentage).toFixed(2)}% booster)
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            50% of gross profit (company gets 50%)
          </p>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        
        <Button 
          onClick={handleClaim} 
          disabled={claiming || !timeInfo.isClaimTime}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
          size="lg"
        >
          {claiming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Claiming...
            </>
          ) : (
            'Claim Profit'
          )}
        </Button>
        
        <div className="rounded-lg bg-muted/50 p-3 text-center text-xs text-muted-foreground">
          <p>Claim window: <span className="font-semibold text-foreground">10:00 AM - 11:59 PM</span></p>
          <p className="mt-1">Unclaimed profit will expire at midnight</p>
        </div>
      </CardContent>

      {/* Success Celebration Modal */}
      <ProfitSuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        amount={claimedAmount}
        basePercentage={claimedRates.base}
        boosterPercentage={claimedRates.booster}
        totalPercentage={claimedRates.total}
        onContinue={handleContinueToDashboard}
      />
    </Card>
  )
}
