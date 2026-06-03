'use client'

import { useState, useRef } from 'react'
import { format } from 'date-fns'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Download, Share2, CheckCircle2, XCircle, Clock, Sparkles, TrendingUp, Gift, ArrowUpCircle, ArrowDownCircle, Award, Wallet, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ReceiptData {
  type: string
  amount: number
  status: string
  date?: string
  receipt_number?: string
  rate?: string
  wallet?: string
  fee?: number
  net_amount?: number
  note?: string
  crypto_address?: string
  external_ref?: string
}

interface ReceiptModalProps {
  isOpen?: boolean
  open?: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
  data?: ReceiptData | null
  transaction?: any | null
}

export function ReceiptModal({ isOpen, open, onClose, onOpenChange, data, transaction }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const router = useRouter()

  // Support both prop formats
  const isDialogOpen = isOpen ?? open ?? false
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onClose?.()
    }
    onOpenChange?.(newOpen)
  }

  // Normalize data from either source
  const receiptData: ReceiptData | null = data ?? (transaction ? {
    type: transaction.type,
    amount: transaction.amount,
    status: transaction.status,
    date: transaction.created_at,
    receipt_number: transaction.id,
    wallet: transaction.wallet_type,
    fee: transaction.fee,
    net_amount: transaction.net_amount,
    crypto_address: transaction.crypto_address,
    external_ref: transaction.external_ref,
  } : null)

  if (!receiptData) return null

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'success' || s === 'completed') {
      return <CheckCircle2 className="h-8 w-8 text-white" />
    } else if (s === 'failed' || s === 'rejected') {
      return <XCircle className="h-8 w-8 text-white" />
    }
    return <Clock className="h-8 w-8 text-white" />
  }

  const getStatusConfig = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'success' || s === 'completed') {
      return { 
        label: 'SUCCESS', 
        bgClass: 'bg-gradient-to-r from-blue-500 to-blue-600',
        glowClass: 'shadow-blue-500/50'
      }
    } else if (s === 'failed' || s === 'rejected') {
      return { 
        label: 'FAILED', 
        bgClass: 'bg-gradient-to-r from-red-500 to-rose-600',
        glowClass: 'shadow-red-500/50'
      }
    }
    return { 
      label: 'PENDING', 
      bgClass: 'bg-gradient-to-r from-slate-1000 to-blue-600',
      glowClass: 'shadow-slate-1000/50'
    }
  }

  const getTypeConfig = (type: string) => {
    const t = type.toLowerCase().replace(/[_\s]/g, '')
    const configs: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
      deposit: { label: 'Deposit', icon: ArrowUpCircle, color: 'text-blue-500', bgColor: 'bg-blue-500' },
      withdrawal: { label: 'Withdrawal', icon: ArrowDownCircle, color: 'text-red-500', bgColor: 'bg-red-500' },
      withdraw: { label: 'Withdrawal', icon: ArrowDownCircle, color: 'text-red-500', bgColor: 'bg-red-500' },
      dailyprofit: { label: 'Daily Profit', icon: TrendingUp, color: 'text-blue-500', bgColor: 'bg-blue-500' },
      profitclaim: { label: 'Daily Profit', icon: TrendingUp, color: 'text-blue-500', bgColor: 'bg-blue-500' },
      sponsorbonus: { label: 'Sponsor Bonus', icon: Gift, color: 'text-purple-500', bgColor: 'bg-purple-500' },
      rankreward: { label: 'Rank Reward', icon: Award, color: 'text-slate-1000', bgColor: 'bg-slate-1000' },
      admincredit: { label: 'Admin Credit', icon: Wallet, color: 'text-blue-500', bgColor: 'bg-blue-500' },
    }
    return configs[t] || { label: type, icon: Sparkles, color: 'text-slate-500', bgColor: 'bg-slate-500' }
  }

  const handleDownload = async () => {
    if (!receiptRef.current) return

    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
      })
      
      const link = document.createElement('a')
      link.download = `vortex-receipt-${receiptData.receipt_number?.slice(0, 12) || Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Failed to download receipt:', error)
    }
  }

  const handleShare = async () => {
    setSharing(true)
    try {
      const text = `VORTEX EQUALITY - Official Receipt\n` +
        `================================\n` +
        `Type: ${typeConfig.label}\n` +
        `Amount: $${receiptData.amount.toFixed(2)}\n` +
        `Status: ${statusConfig.label}\n` +
        `Date: ${receiptData.date || format(new Date(), 'PPpp')}\n` +
        `Receipt: ${receiptData.receipt_number || 'N/A'}\n` +
        `================================\n` +
        `Thank you for trading with Vortex Equality!`

      if (navigator.share) {
        await navigator.share({
          title: 'Vortex Equality - Transaction Receipt',
          text: text,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(text)
        alert('Receipt copied to clipboard!')
      }
    } catch (error) {
      console.error('Failed to share:', error)
    }
    setSharing(false)
  }

  const statusConfig = getStatusConfig(receiptData.status)
  const typeConfig = getTypeConfig(receiptData.type)
  const TypeIcon = typeConfig.icon

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Transaction Receipt</DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="bg-white">
          {/* Premium Header with Animated Background */}
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-6 text-center overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border border-white/5" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full border border-white/10" />
            </div>
            
            <div className="relative flex flex-col items-center gap-4">
              {/* Logo & Brand */}
              <div className="flex items-center justify-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 blur-lg opacity-50 rounded-2xl" />
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-xl ring-2 ring-white/20">
                    <Image 
                      src="/logo.jpg" 
                      alt="Vortex" 
                      width={36} 
                      height={36}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="text-left">
                  <h1 className="text-xl font-bold text-white tracking-tight leading-none">VORTEX</h1>
                  <p className="text-xs text-blue-400 font-medium tracking-widest mt-0.5">EQUALITY</p>
                </div>
              </div>
              
              {/* Transaction Type Badge */}
              <div className={`inline-flex items-center gap-2 ${typeConfig.bgColor} rounded-full px-4 py-1.5 shadow-lg`}>
                <TypeIcon className="h-4 w-4 text-white" />
                <span className="text-xs font-bold text-white uppercase tracking-wide">{typeConfig.label}</span>
              </div>
              
              {/* Amount - Hero Display */}
              <div className="flex flex-col items-center gap-1">
                <div className="text-5xl font-bold text-white tracking-tight leading-none">
                  <span className="text-blue-400">+</span>${receiptData.amount.toFixed(2)}
                </div>
                {receiptData.rate && (
                  <p className="text-xs text-blue-300 mt-1">Rate: {receiptData.rate}</p>
                )}
              </div>
              
              {/* Status Badge */}
              <div className={`inline-flex items-center gap-2 ${statusConfig.bgClass} rounded-xl px-5 py-2.5 shadow-lg ${statusConfig.glowClass}`}>
                {getStatusIcon(receiptData.status)}
                <span className="text-base font-bold text-white tracking-wide">{statusConfig.label}</span>
              </div>
            </div>
          </div>

          {/* Receipt Body */}
          <div className="px-5 py-5 bg-gradient-to-b from-slate-50 to-white">
            {/* Fee breakdown - only if fee > 0 AND net_amount exists */}
            {receiptData.fee != null && receiptData.fee > 0 && receiptData.net_amount != null && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-slate-500">Gross Amount</span>
                  <span className="font-semibold text-slate-900">${receiptData.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-slate-500">Fee</span>
                  <span className="font-semibold text-red-500">-${receiptData.fee.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">Net Amount</span>
                  <span className="text-base font-bold text-blue-600">${receiptData.net_amount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Transaction Details Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
                <span className="text-sm text-slate-500 shrink-0">Receipt No.</span>
                <span className="text-sm font-mono font-semibold text-slate-800 text-right ml-2">
                  {receiptData.receipt_number || 'VX-' + Date.now().toString(36).toUpperCase()}
                </span>
              </div>
              
              {receiptData.wallet && (
                <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 shrink-0">Wallet</span>
                  <span className="text-sm font-semibold text-slate-800">{receiptData.wallet}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
                <span className="text-sm text-slate-500 shrink-0 mr-4">Date & Time</span>
                <span className="text-sm text-slate-800 text-right whitespace-nowrap">
                  {receiptData.date
                    ? format(new Date(receiptData.date), 'MMM dd, yyyy, hh:mm aa')
                    : format(new Date(), 'MMM dd, yyyy, hh:mm aa')}
                </span>
              </div>
              
              {receiptData.external_ref && (
                <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 shrink-0">Reference</span>
                  <span className="text-sm font-mono text-slate-800 text-right ml-2 break-all">{receiptData.external_ref}</span>
                </div>
              )}
              
              {receiptData.crypto_address && (
                <div className="px-4 py-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500 block mb-1.5">Address</span>
                  <span className="text-xs font-mono text-slate-700 break-all bg-slate-50 px-2 py-1.5 rounded-lg block">
                    {receiptData.crypto_address}
                  </span>
                </div>
              )}

              {receiptData.note && (
                <div className="px-4 py-3">
                  <span className="text-sm text-slate-500 block mb-1">Note</span>
                  <span className="text-sm text-slate-700">{receiptData.note}</span>
                </div>
              )}
            </div>

            {/* Verified Footer */}
            <div className="mt-5 text-center">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-2 mb-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-semibold">Verified Transaction</span>
              </div>
              <p className="text-xs text-slate-400">
                Official receipt from Vortex Equality Trading Platform
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Generated: {format(new Date(), 'MMMM dd, yyyy • HH:mm:ss')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 p-4 bg-slate-100 border-t">
          <div className="flex gap-3">
            <Button onClick={handleDownload} variant="outline" className="flex-1 bg-white hover:bg-slate-50">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={handleShare} disabled={sharing} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg">
              <Share2 className="h-4 w-4 mr-2" />
              {sharing ? 'Sharing...' : 'Share'}
            </Button>
          </div>
          <Button 
            onClick={() => { onClose?.(); onOpenChange?.(false); router.push('/dashboard') }} 
            variant="ghost" 
            className="w-full text-slate-600 hover:text-slate-900 hover:bg-slate-200"
          >
            <Home className="h-4 w-4 mr-2" />
            Kembali ke Beranda
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
