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
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    fetchBroadcasts()
    
    // Load dismissed broadcasts from localStorage
    const savedDismissed = localStorage.getItem('dismissed_broadcasts')
    if (savedDismissed) {
      setDismissed(JSON.parse(savedDismissed))
    }
  }, [])

  const fetchBroadcasts = async () => {
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('broadcast_messages')
      .select('id, title, message, type')
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (data) setBroadcasts(data)
  }

  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissed, id]
    setDismissed(newDismissed)
    localStorage.setItem('dismissed_broadcasts', JSON.stringify(newDismissed))
  }

  // Filter out dismissed broadcasts
  const activeBroadcasts = broadcasts.filter(b => !dismissed.includes(b.id))

  // Auto-rotate broadcasts every 5 seconds if more than one
  useEffect(() => {
    if (activeBroadcasts.length <= 1) return
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeBroadcasts.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [activeBroadcasts.length])

  if (activeBroadcasts.length === 0) return null

  const broadcast = activeBroadcasts[currentIndex] || activeBroadcasts[0]
  if (!broadcast) return null

  const config = typeConfig[broadcast.type]
  const Icon = config.icon

  return (
    <div className={`relative overflow-hidden rounded-lg border ${config.borderColor} ${config.bgColor} mb-4`}>
      {/* Animated shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shine_3s_ease-in-out_infinite]" />
      
      <div className="relative flex items-center gap-3 px-4 py-2.5">
        {/* Icon with pulse animation */}
        <div className="relative">
          <Icon className={`h-4 w-4 ${config.textColor}`} />
          <div className={`absolute inset-0 ${config.textColor} opacity-40 animate-ping`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${config.textColor}`}>
              {broadcast.title}
            </span>
            {activeBroadcasts.length > 1 && (
              <span className="text-xs text-muted-foreground">
                {currentIndex + 1}/{activeBroadcasts.length}
              </span>
            )}
          </div>
          <p className="text-xs text-foreground/70 truncate">
            {broadcast.message}
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => handleDismiss(broadcast.id)}
          className="p-1 rounded-full hover:bg-foreground/10 transition-colors"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Progress indicator for multiple broadcasts */}
      {activeBroadcasts.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground/10">
          <div 
            className={`h-full ${config.textColor.replace('text-', 'bg-')} transition-all duration-300`}
            style={{ width: `${((currentIndex + 1) / activeBroadcasts.length) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
