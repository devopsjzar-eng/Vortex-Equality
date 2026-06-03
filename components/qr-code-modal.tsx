'use client'

import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Download, 
  Copy, 
  Check, 
  Share2,
  QrCode,
  X
} from 'lucide-react'
import { toast } from 'sonner'

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  referralCode: string
  userName?: string
}

export function QRCodeModal({ isOpen, onClose, referralCode, userName }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)
  
  const referralLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/invite?ref=${referralCode}`
    : `https://vortex-equality.vercel.app/invite?ref=${referralCode}`

  if (!isOpen) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success('Referral link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    
    canvas.width = 400
    canvas.height = 500
    
    img.onload = () => {
      if (!ctx) return
      
      // Background
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Logo text
      ctx.fillStyle = '#0071E3'
      ctx.font = 'bold 28px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('VORTEX EQUALITY', canvas.width / 2, 45)
      
      // QR Code with white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(50, 70, 300, 300)
      ctx.drawImage(img, 75, 95, 250, 250)
      
      // Referral code
      ctx.fillStyle = '#94a3b8'
      ctx.font = '14px system-ui'
      ctx.fillText('Scan to join with referral code:', canvas.width / 2, 400)
      
      ctx.fillStyle = '#0071E3'
      ctx.font = 'bold 20px monospace'
      ctx.fillText(referralCode, canvas.width / 2, 430)
      
      // Invited by
      if (userName) {
        ctx.fillStyle = '#64748b'
        ctx.font = '12px system-ui'
        ctx.fillText(`Invited by: ${userName}`, canvas.width / 2, 470)
      }
      
      // Download
      const link = document.createElement('a')
      link.download = `vortex-referral-${referralCode}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      
      toast.success('QR Code downloaded!')
    }
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Vortex Equality',
          text: `Join me on Vortex Equality and start earning daily profits! Use my referral code: ${referralCode}`,
          url: referralLink
        })
      } catch (err) {
        // User cancelled or error
      }
    } else {
      handleCopy()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-900 shadow-2xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <QrCode className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-bold">Your Referral QR Code</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* QR Code */}
          <div 
            ref={qrRef}
            className="mx-auto mb-6 flex flex-col items-center rounded-2xl bg-white p-6"
          >
            <QRCodeSVG
              value={referralLink}
              size={200}
              level="H"
              includeMargin={false}
              fgColor="#0f172a"
              bgColor="#ffffff"
            />
          </div>

          {/* Referral Code */}
          <div className="mb-6 rounded-xl bg-slate-800/50 p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">Your Referral Code</p>
            <p className="text-2xl font-bold font-mono text-slate-1000">{referralCode}</p>
            {userName && (
              <p className="text-xs text-slate-500 mt-1">Shared by: {userName}</p>
            )}
          </div>

          {/* Referral Link */}
          <div className="mb-6">
            <p className="text-sm text-slate-400 mb-2">Referral Link</p>
            <div className="flex items-center gap-2 rounded-lg bg-slate-800 p-3">
              <code className="flex-1 text-xs text-slate-300 truncate">{referralLink}</code>
              <Button size="sm" variant="ghost" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-blue-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="flex-col gap-1 h-auto py-3 border-slate-700"
              onClick={handleCopy}
            >
              <Copy className="h-5 w-5" />
              <span className="text-xs">Copy Link</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex-col gap-1 h-auto py-3 border-slate-700"
              onClick={handleDownload}
            >
              <Download className="h-5 w-5" />
              <span className="text-xs">Download</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex-col gap-1 h-auto py-3 border-slate-700"
              onClick={handleShare}
            >
              <Share2 className="h-5 w-5" />
              <span className="text-xs">Share</span>
            </Button>
          </div>

          {/* Bonus Info */}
          <div className="mt-6 rounded-xl bg-gradient-to-r from-slate-1000/10 to-blue-500/10 p-4 text-center">
            <p className="text-sm text-slate-400 font-medium">Earn 8% from direct referrals!</p>
            <p className="text-xs text-slate-400 mt-1">Plus 5% from level 2 and 2% from level 3</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
