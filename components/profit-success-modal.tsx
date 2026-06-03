'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { CheckCircle, Sparkles, TrendingUp, ArrowRight, Home, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProfitSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  amount: number
  basePercentage: number
  boosterPercentage: number
  totalPercentage: number
  onContinue?: () => void
}

export function ProfitSuccessModal({
  isOpen,
  onClose,
  amount,
  basePercentage,
  boosterPercentage,
  totalPercentage,
  onContinue,
}: ProfitSuccessModalProps) {
  const [showContent, setShowContent] = useState(false)
  const confettiTriggered = useRef(false)

  useEffect(() => {
    if (isOpen && !confettiTriggered.current) {
      confettiTriggered.current = true
      
      // Delay content for dramatic effect
      setTimeout(() => setShowContent(true), 300)
      
      // Fire confetti from multiple angles
      const duration = 3000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          clearInterval(interval)
          return
        }

        const particleCount = 50 * (timeLeft / duration)

        // Confetti from both sides
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#0071E3', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'],
        })
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#0071E3', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'],
        })
      }, 250)

      // Center burst
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0071E3', '#3B82F6', '#60A5FA'],
          zIndex: 9999,
        })
      }, 500)

      return () => clearInterval(interval)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      confettiTriggered.current = false
      setShowContent(false)
    }
  }, [isOpen])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl"
          >
            {/* Premium gradient background */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-slate-1000/20" />
              
              {/* Inner card */}
              <div className="relative rounded-[22px] bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl">
                
                {/* Decorative elements */}
                <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-slate-1000/10 blur-3xl" />
                
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 z-20 rounded-full p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Content */}
                <div className="relative px-8 pb-8 pt-10">
                  
                  {/* Success Icon with animation */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="mx-auto mb-6 flex h-24 w-24 items-center justify-center"
                  >
                    <div className="relative">
                      {/* Glow effect */}
                      <div className="absolute inset-0 animate-pulse rounded-full bg-blue-500/30 blur-xl" />
                      
                      {/* Outer ring */}
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.3, duration: 0.6, type: 'spring' }}
                        className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/30"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
                        >
                          <CheckCircle className="h-12 w-12 text-white" strokeWidth={2.5} />
                        </motion.div>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Success text */}
                  <AnimatePresence>
                    {showContent && (
                      <>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="text-center"
                        >
                          <h2 className="mb-2 text-2xl font-bold text-white">
                            Profit Claimed!
                          </h2>
                          <p className="text-slate-400">
                            Your daily profit has been added to your wallet
                          </p>
                        </motion.div>

                        {/* Amount - THE HERO */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3, type: 'spring' }}
                          className="my-8"
                        >
                          <div className="relative mx-auto max-w-xs rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-transparent p-6 backdrop-blur">
                            {/* Sparkle decorations */}
                            <Sparkles className="absolute -right-2 -top-2 h-6 w-6 text-slate-400" />
                            <Sparkles className="absolute -bottom-2 -left-2 h-5 w-5 text-blue-400" />
                            
                            <p className="mb-1 text-center text-sm font-medium uppercase tracking-wider text-blue-400">
                              You Received
                            </p>
                            <p className="bg-gradient-to-r from-blue-300 via-blue-400 to-slate-400 bg-clip-text text-center text-5xl font-bold text-transparent">
                              {formatCurrency(amount)}
                            </p>
                            
                            {/* Rate breakdown */}
                            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
                              <TrendingUp className="h-4 w-4 text-blue-400" />
                              <span>
                                {totalPercentage.toFixed(2)}% daily
                                <span className="text-slate-500"> (</span>
                                <span className="text-blue-400">{basePercentage.toFixed(2)}%</span>
                                {boosterPercentage > 0 && (
                                  <>
                                    <span className="text-slate-500"> + </span>
                                    <span className="text-slate-400">{boosterPercentage.toFixed(2)}%</span>
                                  </>
                                )}
                                <span className="text-slate-500">)</span>
                              </span>
                            </div>
                          </div>
                        </motion.div>

                        {/* Date & Time */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="mb-8 text-center"
                        >
                          <p className="text-sm text-slate-500">{today}</p>
                          <p className="text-xs text-slate-600">Claimed at {currentTime}</p>
                        </motion.div>

                        {/* Action Buttons */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                          className="space-y-3"
                        >
                          <Button
                            onClick={onContinue || onClose}
                            className="group relative h-14 w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-lg font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
                          >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              <Home className="h-5 w-5" />
                              Continue to Dashboard
                              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 opacity-0 transition-opacity group-hover:opacity-100" />
                          </Button>
                          
                          <p className="text-center text-xs text-slate-500">
                            Screenshot this moment and share your success!
                          </p>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom decorative bar */}
                <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-slate-1000 to-blue-500" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
