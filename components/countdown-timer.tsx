'use client'

import { useState, useEffect } from 'react'
import { Clock, Zap, AlertTriangle } from 'lucide-react'

interface CountdownTimerProps {
  type: 'until-available' | 'until-expires'
  targetHour: number // Hour when profit becomes available (e.g., 10) or expires (e.g., 24)
  onComplete?: () => void
}

export function CountdownTimer({ type, targetHour, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const target = new Date()
      
      if (type === 'until-available') {
        // Time until profit becomes available (10:00 AM)
        target.setHours(targetHour, 0, 0, 0)
        if (now.getHours() >= targetHour) {
          // Already past target, show next day
          target.setDate(target.getDate() + 1)
        }
      } else {
        // Time until profit expires (midnight / 23:59:59)
        target.setHours(23, 59, 59, 999)
      }

      const diff = target.getTime() - now.getTime()

      if (diff <= 0) {
        setIsComplete(true)
        onComplete?.()
        return { hours: 0, minutes: 0, seconds: 0 }
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      return { hours, minutes, seconds }
    }

    setTimeLeft(calculateTimeLeft())

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(interval)
  }, [type, targetHour, onComplete])

  const formatNumber = (n: number) => n.toString().padStart(2, '0')

  if (isComplete && type === 'until-available') {
    return (
      <div className="flex items-center gap-2 text-blue-500">
        <Zap className="h-4 w-4" />
        <span className="text-sm font-medium">Available Now!</span>
      </div>
    )
  }

  const isUrgent = type === 'until-expires' && timeLeft.hours < 2

  return (
    <div className={`flex items-center gap-2 ${isUrgent ? 'text-red-500' : 'text-muted-foreground'}`}>
      {isUrgent ? (
        <AlertTriangle className="h-4 w-4 animate-pulse" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <div className="flex items-center gap-1 font-mono text-sm">
        <span className={`rounded px-1.5 py-0.5 ${isUrgent ? 'bg-red-500/20' : 'bg-muted'}`}>
          {formatNumber(timeLeft.hours)}
        </span>
        <span>:</span>
        <span className={`rounded px-1.5 py-0.5 ${isUrgent ? 'bg-red-500/20' : 'bg-muted'}`}>
          {formatNumber(timeLeft.minutes)}
        </span>
        <span>:</span>
        <span className={`rounded px-1.5 py-0.5 ${isUrgent ? 'bg-red-500/20' : 'bg-muted'}`}>
          {formatNumber(timeLeft.seconds)}
        </span>
      </div>
      <span className="text-xs">
        {type === 'until-available' ? 'until available' : 'left to claim'}
      </span>
    </div>
  )
}

// Compact version for cards
export function CompactCountdown({ type, targetHour }: { type: 'until-available' | 'until-expires', targetHour: number }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const target = new Date()
      
      if (type === 'until-available') {
        target.setHours(targetHour, 0, 0, 0)
        if (now.getHours() >= targetHour) {
          target.setDate(target.getDate() + 1)
        }
      } else {
        target.setHours(23, 59, 59, 999)
      }

      const diff = target.getTime() - now.getTime()

      if (diff <= 0) {
        return { hours: 0, minutes: 0, seconds: 0 }
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      return { hours, minutes, seconds }
    }

    setTimeLeft(calculateTimeLeft())
    const interval = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
    return () => clearInterval(interval)
  }, [type, targetHour])

  const formatNumber = (n: number) => n.toString().padStart(2, '0')
  const isUrgent = type === 'until-expires' && timeLeft.hours < 2

  return (
    <span className={`font-mono text-xs ${isUrgent ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
      {formatNumber(timeLeft.hours)}:{formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
    </span>
  )
}
