'use client'

import { useState, useEffect } from 'react'
import { X, Megaphone, AlertTriangle, Info, Gift, Bell, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Announcement {
  id: string
  type: 'info' | 'warning' | 'promo' | 'update'
  title: string
  message: string
  link?: string
  linkText?: string
  dismissible: boolean
  priority: number
  expiresAt?: string
}

// Demo announcements - in production, fetch from database
const DEMO_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'welcome-2024',
    type: 'promo',
    title: 'Welcome Bonus',
    message: 'New members get +0.25% extra daily profit for the first 30 days!',
    link: '/dashboard/deposit',
    linkText: 'Deposit Now',
    dismissible: true,
    priority: 1
  },
  {
    id: 'maintenance-notice',
    type: 'info',
    title: 'Scheduled Maintenance',
    message: 'System maintenance on Sunday 2:00-4:00 AM UTC. Withdrawals may be delayed.',
    dismissible: true,
    priority: 2
  }
]

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    // Load dismissed announcements from localStorage
    const savedDismissed = localStorage.getItem('vortex-dismissed-announcements')
    if (savedDismissed) {
      setDismissed(new Set(JSON.parse(savedDismissed)))
    }

    // In production, fetch from API/database
    // For now, use demo announcements
    setAnnouncements(DEMO_ANNOUNCEMENTS.sort((a, b) => a.priority - b.priority))
  }, [])

  // Filter out dismissed announcements
  const activeAnnouncements = announcements.filter(a => !dismissed.has(a.id))

  // Auto-rotate announcements
  useEffect(() => {
    if (activeAnnouncements.length <= 1) return
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeAnnouncements.length)
    }, 8000)

    return () => clearInterval(interval)
  }, [activeAnnouncements.length])

  const handleDismiss = (id: string) => {
    const newDismissed = new Set(dismissed)
    newDismissed.add(id)
    setDismissed(newDismissed)
    localStorage.setItem('vortex-dismissed-announcements', JSON.stringify([...newDismissed]))
    
    // Move to next announcement
    if (currentIndex >= activeAnnouncements.length - 1) {
      setCurrentIndex(0)
    }
  }

  if (activeAnnouncements.length === 0) return null

  const current = activeAnnouncements[currentIndex]

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-slate-1000/20 via-blue-500/20 to-slate-1000/20 border-slate-1000/30',
          icon: AlertTriangle,
          iconColor: 'text-slate-1000'
        }
      case 'promo':
        return {
          bg: 'bg-gradient-to-r from-blue-500/20 via-blue-500/20 to-blue-500/20 border-blue-500/30',
          icon: Gift,
          iconColor: 'text-blue-500'
        }
      case 'update':
        return {
          bg: 'bg-gradient-to-r from-blue-500/20 via-blue-500/20 to-blue-500/20 border-blue-500/30',
          icon: Bell,
          iconColor: 'text-blue-500'
        }
      default:
        return {
          bg: 'bg-gradient-to-r from-slate-500/20 via-slate-400/20 to-slate-500/20 border-slate-500/30',
          icon: Info,
          iconColor: 'text-slate-400'
        }
    }
  }

  const styles = getTypeStyles(current.type)
  const Icon = styles.icon

  return (
    <div className={`relative overflow-hidden border-b ${styles.bg} px-4 py-2`}>
      <div className="container mx-auto flex items-center justify-between gap-4">
        {/* Content */}
        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          <div className={`hidden shrink-0 rounded-full bg-background/50 p-1.5 sm:block ${styles.iconColor}`}>
            <Icon className="h-4 w-4" />
          </div>
          
          <div className="flex flex-1 items-center gap-2 overflow-hidden">
            <span className="shrink-0 font-semibold text-sm">{current.title}:</span>
            <span className="truncate text-sm text-muted-foreground">{current.message}</span>
          </div>

          {current.link && (
            <Link href={current.link}>
              <Button size="sm" variant="ghost" className="shrink-0 gap-1 text-xs h-7">
                {current.linkText || 'Learn More'}
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>

        {/* Indicators & Dismiss */}
        <div className="flex items-center gap-2">
          {/* Dot indicators */}
          {activeAnnouncements.length > 1 && (
            <div className="hidden items-center gap-1 sm:flex">
              {activeAnnouncements.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 w-1.5 rounded-full transition-all ${
                    idx === currentIndex ? 'bg-foreground w-3' : 'bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Dismiss */}
          {current.dismissible && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => handleDismiss(current.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
