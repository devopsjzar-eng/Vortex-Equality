'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BoosterSlotsProps {
  boosterPercentage: number
}

export function BoosterSlots({ boosterPercentage }: BoosterSlotsProps) {
  const maxSlots = 15
  const activeSlots = Math.floor(boosterPercentage / 0.2)
  const slots = Array.from({ length: maxSlots }, (_, i) => i < activeSlots)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            Strategic Booster
          </span>
          <span className="text-warning">+{boosterPercentage.toFixed(1)}%</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Earn +0.2% for each qualifying referral (max 3.0%)
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-15 md:grid-cols-15">
          {slots.map((active, index) => (
            <div
              key={index}
              className={cn(
                'flex aspect-square items-center justify-center rounded-lg border-2 text-xs font-bold transition-all',
                active
                  ? 'border-warning bg-warning/20 text-warning'
                  : 'border-border bg-muted/50 text-muted-foreground'
              )}
            >
              {active ? <Zap className="h-4 w-4" /> : `${(index + 1) * 0.2}%`}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {activeSlots} of {maxSlots} slots activated ({maxSlots - activeSlots} remaining)
        </p>
      </CardContent>
    </Card>
  )
}
