'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Bell, Gift, AlertTriangle, Info, PartyPopper } from 'lucide-react'

type BroadcastType = 'info' | 'warning' | 'success' | 'event' | 'promo'

interface Broadcast {
  id: string
  title: string
  message: string
  type: BroadcastType
}

const typeConfig: Record<BroadcastType, { icon: any; bgColor: string; borderColor: string; textColor: string }> = {
  info: { 
    icon: Info, 
    bgColor: 'bg-gradient-to-r from-blue-500/10 to-blue-600/5', 
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-600'
  },
  warning: { 
    icon: AlertTriangle, 
    bgColor: 'bg-gradient-to-r from-slate-1000/10 to-slate-500/5', 
    borderColor: 'border-slate-1000/30',
    textColor: 'text-slate-500'
  },
  success: { 
    icon: Bell, 
    bgColor: 'bg-gradient-to-r from-blue-500/10 to-blue-600/5', 
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-600'
  },
  event: { 
    icon: PartyPopper, 
    bgColor: 'bg-gradient-to-r from-purple-500/10 to-pink-500/5', 
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-600'
  },
  promo: { 
    icon: Gift, 
    bgColor: 'bg-gradient-to-r from-pink-500/10 to-rose-500/5', 
    borderColor: 'border-pink-500/30',
    textColor: 'text-pink-600'
  },
}

export function BroadcastBanner() {
  return null; // Component completely disabled per Owner's request
}