'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, X, CheckCircle2, DollarSign, Gift, Award, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: 'profit_available' | 'withdrawal_approved' | 'deposit_success' | 'rank_upgrade' | 'referral_bonus'
  title: string
  message: string
  read: boolean
  created_at: string
  data?: Record<string, unknown>
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get recent transactions as notifications
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(10)

      // Get today's profit claim status
      const { data: todayProfit } = await supabase
        .from('daily_profits')
        .select('*')
        .eq('profit_date', new Date().toISOString().split('T')[0])
        .single()

      const { data: todayClaim } = await supabase
        .from('profit_claims')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'available')
        .limit(1)

      const notifs: Notification[] = []

      // Add profit available notification if not claimed
      if (todayProfit && todayClaim && todayClaim.length > 0) {
        notifs.push({
          id: 'profit-available',
          type: 'profit_available',
          title: 'Daily Profit Available',
          message: `Today's profit (${todayProfit.global_profit_percentage}%) is ready to claim!`,
          read: false,
          created_at: new Date().toISOString(),
        })
      }

      // Convert recent transactions to notifications
      transactions?.forEach(tx => {
        let title = ''
        let type: Notification['type'] = 'deposit_success'
        
        switch (tx.type) {
          case 'deposit':
            title = 'Deposit Successful'
            type = 'deposit_success'
            break
          case 'withdrawal':
            title = 'Withdrawal Approved'
            type = 'withdrawal_approved'
            break
          case 'profit_claim':
            title = 'Profit Claimed'
            type = 'profit_available'
            break
          case 'referral_bonus':
            title = 'Referral Bonus Received'
            type = 'referral_bonus'
            break
          case 'rank_reward':
            title = 'Rank Reward Received'
            type = 'rank_upgrade'
            break
          default:
            title = 'Transaction Completed'
        }

        notifs.push({
          id: tx.id,
          type,
          title,
          message: `$${tx.amount.toFixed(2)} has been ${tx.type === 'withdrawal' ? 'withdrawn' : 'credited'} to your ${tx.wallet_type} wallet`,
          read: true,
          created_at: tx.created_at,
        })
      })

      setNotifications(notifs)
      setUnreadCount(notifs.filter(n => !n.read).length)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchNotifications()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'profit_available':
        return <DollarSign className="h-4 w-4 text-blue-500" />
      case 'withdrawal_approved':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />
      case 'deposit_success':
        return <CreditCard className="h-4 w-4 text-primary" />
      case 'rank_upgrade':
        return <Award className="h-4 w-4 text-slate-1000" />
      case 'referral_bonus':
        return <Gift className="h-4 w-4 text-blue-500" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const clearAll = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-500"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={clearAll}>
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.slice(0, 8).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start gap-3 p-3 cursor-pointer ${
                  !notification.read ? 'bg-primary/5' : ''
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="mt-0.5">{getIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notification.read && (
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
