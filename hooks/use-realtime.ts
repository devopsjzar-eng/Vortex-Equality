'use client'

import { useEffect, useCallback, useRef } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'

interface SubscriptionConfig {
  table: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  onChange?: () => void
}

/**
 * Hook untuk subscribe ke real-time changes dari Supabase
 * Otomatis cleanup subscription saat component unmount
 */
export function useRealtimeSubscription(
  supabase: SupabaseClient,
  config: SubscriptionConfig
) {
  const subscriptionRef = useRef<ReturnType<SupabaseClient['channel']> | null>(null)

  useEffect(() => {
    if (!supabase || !config.table) return

    const channelName = `realtime-${config.table}-${config.event || '*'}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: config.event || '*',
          schema: 'public',
          table: config.table,
          filter: config.filter,
        },
        () => {
          if (config.onChange) {
            config.onChange()
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [supabase, config])
}

/**
 * Hook untuk auto-refresh dengan interval fallback
 */
export function useAutoRefresh(
  callback: () => Promise<void>,
  intervalMs: number = 30000
) {
  useEffect(() => {
    const interval = setInterval(() => {
      callback()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [callback, intervalMs])
}
