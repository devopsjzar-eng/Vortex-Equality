'use client'

import { useEffect } from 'react'

export function PWARegister() {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker registered:', registration.scope)
            
            // Check for updates periodically
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] New version available')
                  }
                })
              }
            })
          })
          .catch((error) => {
            console.log('[PWA] Service Worker registration failed:', error)
          })
      })
    }
  }, [])

  return null
}
