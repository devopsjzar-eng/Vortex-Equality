'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wallet, Profile } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ArrowUpFromLine, 
  Wallet as WalletIcon, 
  AlertCircle, 
  Loader2, 
  CheckCircle,
  Clock,
  Shield,
  BadgeCheck,
  PiggyBank
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MIN_WITHDRAWAL = 10

const networkOptions = [
  { id: 'bep20',     name: 'BEP20 (BSC)',       desc: 'Binance Smart Chain', logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=029' },
  { id: 'trc20',     name: 'TRC20 (TRON)',      desc: 'TRON Network',        logo: 'https://cryptologos.cc/logos/tron-trx-logo.svg?v=029' },
  { id: 'erc20',     name: 'ERC20 (Ethereum)',  desc: 'Ethereum Network',    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=029' },
  { id: 'polygon',   name: 'Polygon (MATIC)',   desc: 'Polygon Network',     logo: 'https://cryptologos.cc/logos/polygon-matic-logo.svg?v=029' },
  { id: 'arbitrum',  name: 'Arbitrum',          desc: 'Arbitrum One',        logo: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg?v=029' },
  { id: 'optimism',  name: 'Optimism',          desc: 'Optimism Network',    logo: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg?v=029' },
]

export default function WithdrawPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [assetWallet, setAssetWallet] = useState<Wallet | null>(null)
  const [bonusWallet, setBonusWallet] = useState<Wallet | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [selectedWallet, setSelectedWallet] = useState<'asset' | 'bonus'>('asset')
  const [selectedNetwork, setSelectedNetwork] = useState('bep20')
  const [amount, setAmount] = useState('')
  const [cryptoAddress, setCryptoAddress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profileData) {
      setProfile(profileData)
      if (profileData.crypto_address) setCryptoAddress(profileData.crypto_address)
    }

    const { data: wallets } = await supabase.from('wallets').select('*').eq('user_id', user.id)
    if (wallets) {
      setAssetWallet(wallets.find(w => w.wallet_type === 'asset') || null)
      setBonusWallet(wallets.find(w => w.wallet_type === 'bonus') || null)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const getRoiPercentage = () => {
    if (!assetWallet) return 0
    const initialCapital = assetWallet.initial_capital || 0
    const totalProfitEarned = assetWallet.total_profit_earned || 0
    // ROI = profit earned / initial capital * 100
    return initialCapital > 0 ? (totalProfitEarned / initialCapital) * 100 : 0
  }

  // Asset Wallet: 20% if ROI < 100%, 5% if ROI >= 100%
  // Bonus Wallet: flat 5% always
  const getFeePercentage = () => {
    if (selectedWallet === 'bonus') return 5 // flat 5%
    return getRoiPercentage() >= 100 ? 5 : 20 // 5% or 20%
  }

  // Get breakdown for display (no admin fee, just withdrawal fee)
  const getFeeBreakdown = () => {
    if (selectedWallet === 'bonus') {
      return { withdrawalFee: 5, total: 5 }
    }
    const hasBreakeven = getRoiPercentage() >= 100
    return {
      withdrawalFee: hasBreakeven ? 5 : 20,
      total: hasBreakeven ? 5 : 20
    }
  }

  const calculateFee = () => {
    if (!amount || isNaN(parseFloat(amount))) return 0
    return parseFloat(amount) * (getFeePercentage() / 100)
  }

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount)
    const wallet = selectedWallet === 'asset' ? assetWallet : bonusWallet

    setError(null)

    if (!wallet || !profile) { setError('Wallet not found'); return }
    if (isNaN(withdrawAmount) || withdrawAmount < MIN_WITHDRAWAL) {
      setError(`Minimum withdrawal is $${MIN_WITHDRAWAL}`)
      return
    }
    if (withdrawAmount > wallet.balance) { setError('Insufficient balance'); return }
    if (!cryptoAddress || cryptoAddress.length < 20) {
      setError('Please enter a valid wallet address')
      return
    }

    setSubmitting(true)

    try {
      // Use API route to bypass RLS
      const response = await fetch('/api/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: withdrawAmount,
          walletType: selectedWallet,
          cryptoAddress: cryptoAddress,
          cryptoNetwork: selectedNetwork,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to submit withdrawal')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit withdrawal')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (success) {
    const fee = calculateFee()
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card className="border-blue-500/30 bg-slate-900">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20">
              <CheckCircle className="h-8 w-8 text-blue-400" />
            </div>
            <CardTitle className="text-white">Request Submitted!</CardTitle>
            <CardDescription>Your withdrawal is pending admin approval.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-slate-800 p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Amount</span>
                <span className="font-medium text-white">{formatCurrency(parseFloat(amount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fee ({getFeePercentage()}%)</span>
                <span className="text-red-400">-{formatCurrency(fee)}</span>
              </div>
              <div className="border-t border-slate-700 pt-2">
                <div className="flex justify-between">
                  <span className="font-medium text-white">You will receive</span>
                  <span className="font-bold text-blue-400">{formatCurrency(parseFloat(amount) - fee)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-blue-500/10 p-4">
              <Clock className="h-5 w-5 text-blue-400 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-white">Processing Time</p>
                <p className="text-slate-400">Typically within 24-48 hours after admin approval</p>
              </div>
            </div>
            <Button className="w-full" onClick={() => window.location.href = '/dashboard'}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const activeWallet = selectedWallet === 'asset' ? assetWallet : bonusWallet
  const fee = calculateFee()
  const netAmount = amount ? parseFloat(amount) - fee : 0
  const roi = getRoiPercentage()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white lg:text-3xl">Withdraw Funds</h1>
        <p className="mt-1 text-slate-400">Request withdrawal to your crypto wallet. No lock period.</p>
      </div>

      {/* Info badges */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
          <div className="rounded-lg bg-blue-500/20 p-2"><Shield className="h-4 w-4 text-blue-400" /></div>
          <div><p className="text-xs font-medium text-white">Secure</p><p className="text-[10px] text-slate-500">Protected</p></div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
          <div className="rounded-lg bg-blue-500/20 p-2"><Clock className="h-4 w-4 text-blue-400" /></div>
          <div><p className="text-xs font-medium text-white">24-48 Hours</p><p className="text-[10px] text-slate-500">Admin Process</p></div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
          <div className="rounded-lg bg-purple-500/20 p-2"><BadgeCheck className="h-4 w-4 text-purple-400" /></div>
          <div><p className="text-xs font-medium text-white">No Lock</p><p className="text-[10px] text-slate-500">Withdraw Anytime</p></div>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ArrowUpFromLine className="h-5 w-5 text-primary" />
            Withdrawal Form
          </CardTitle>
          <CardDescription>Select wallet and enter amount</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Wallet Selection - Premium Apple Matte Style */}
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => setSelectedWallet('asset')}
              className={cn(
                'relative flex flex-col gap-4 rounded-[20px] p-5 text-left transition-all duration-200 overflow-hidden',
                selectedWallet === 'asset'
                  ? 'bg-[#0071E3] border border-[#0071E3] shadow-lg shadow-blue-900/20'
                  : 'bg-[#1D1D1F] border border-[#333336] hover:bg-[#2C2C2E]'
              )}
            >
              <div className="flex items-start justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "rounded-full p-2.5",
                    selectedWallet === 'asset' ? "bg-white/20" : "bg-[#2C2C2E]"
                  )}>
                    <WalletIcon className={cn("h-5 w-5", selectedWallet === 'asset' ? "text-white" : "text-[#A1A1A6]")} />
                  </div>
                  <div>
                    <p className={cn("font-medium text-sm", selectedWallet === 'asset' ? "text-blue-50" : "text-[#A1A1A6]")}>
                      Asset Wallet
                    </p>
                    <p className={cn("text-2xl font-bold tracking-tight", selectedWallet === 'asset' ? "text-white" : "text-[#F5F5F7]")}>
                      {formatCurrency(assetWallet?.balance || 0)}
                    </p>
                  </div>
                </div>
                {selectedWallet === 'asset' && (
                  <div className="bg-white rounded-full p-0.5 shadow-sm">
                    <CheckCircle2 className="h-4 w-4 text-[#0071E3]" />
                  </div>
                )}
              </div>
              
              <div className={cn(
                "rounded-xl p-3 text-xs space-y-1.5 w-full",
                selectedWallet === 'asset' ? "bg-black/10 text-blue-50" : "bg-black/20 text-[#86868B]"
              )}>
                <div className="flex justify-between items-center">
                  <span>Your ROI:</span>
                  <span className="font-semibold">{roi.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Admin fee:</span>
                  <span className="font-semibold">{roi >= 100 ? '5%' : '20%'}</span>
                </div>
                {roi < 100 && (
                  <p className={cn("text-[10px] mt-2", selectedWallet === 'asset' ? "text-blue-200/70" : "text-[#55555A]")}>
                    Fee drops to 5% after 100% ROI
                  </p>
                )}
              </div>
            </button>

            <button
              onClick={() => setSelectedWallet('bonus')}
              className={cn(
                'relative flex flex-col gap-4 rounded-[20px] p-5 text-left transition-all duration-200 overflow-hidden',
                selectedWallet === 'bonus'
                  ? 'bg-[#0071E3] border border-[#0071E3] shadow-lg shadow-blue-900/20'
                  : 'bg-[#1D1D1F] border border-[#333336] hover:bg-[#2C2C2E]'
              )}
            >
              <div className="flex items-start justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "rounded-full p-2.5",
                    selectedWallet === 'bonus' ? "bg-white/20" : "bg-[#2C2C2E]"
                  )}>
                    <Gift className={cn("h-5 w-5", selectedWallet === 'bonus' ? "text-white" : "text-[#A1A1A6]")} />
                  </div>
                  <div>
                    <p className={cn("font-medium text-sm", selectedWallet === 'bonus' ? "text-blue-50" : "text-[#A1A1A6]")}>
                      Bonus Wallet
                    </p>
                    <p className={cn("text-2xl font-bold tracking-tight", selectedWallet === 'bonus' ? "text-white" : "text-[#F5F5F7]")}>
                      {formatCurrency(bonusWallet?.balance || 0)}
                    </p>
                  </div>
                </div>
                {selectedWallet === 'bonus' && (
                  <div className="bg-white rounded-full p-0.5 shadow-sm">
                    <CheckCircle2 className="h-4 w-4 text-[#0071E3]" />
                  </div>
                )}
              </div>
              
              <div className={cn(
                "rounded-xl p-3 text-xs space-y-1.5 w-full",
                selectedWallet === 'bonus' ? "bg-black/10 text-blue-50" : "bg-black/20 text-[#86868B]"
              )}>
                <div className="flex justify-between items-center">
                  <span>Source:</span>
                  <span className="font-semibold">Sponsor + Reward</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Admin fee:</span>
                  <span className="font-semibold">5% (Flat)</span>
                </div>
                <p className={cn("text-[10px] mt-2", selectedWallet === 'bonus' ? "text-blue-200/70" : "text-[#55555A]")}>
                  Withdraw anytime
                </p>
              </div>
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label className="text-slate-300">Withdrawal Amount (USD)</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">$</span>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(null) }}
                className="h-14 border-slate-700 bg-slate-800 pl-10 text-2xl font-bold text-white"
                min={MIN_WITHDRAWAL}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Minimum: ${MIN_WITHDRAWAL}</span>
              <button
                onClick={() => setAmount((activeWallet?.balance || 0).toString())}
                className="text-primary hover:underline"
              >
                Max: {formatCurrency(activeWallet?.balance || 0)}
              </button>
            </div>
          </div>

          {/* Network */}
          <div className="space-y-3">
            <Label className="text-[#F5F5F7] font-semibold mb-1 block">Select Network</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {networkOptions.map((net) => (
                <button
                  key={net.id}
                  onClick={() => setSelectedNetwork(net.id)}
                  className={cn(
                    'flex flex-col items-center text-center justify-center rounded-xl border p-4 transition-all duration-200',
                    selectedNetwork === net.id
                      ? 'bg-[#2C2C2E] border-[#0071E3]'
                      : 'bg-[#1D1D1F] border-[#333336] hover:border-[#55555A]'
                  )}
                >
                  <div className="bg-white p-2 rounded-full mb-2 relative shadow-sm">
                    <img src={net.logo} alt={net.name} className="w-6 h-6 object-contain" />
                    
                    {selectedNetwork === net.id && (
                      <div className="absolute -top-1 -right-1 bg-[#34C759] rounded-full p-0.5 border-2 border-[#2C2C2E] shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                    )}
                  </div>
                  
                  <span className={cn(
                    'text-xs sm:text-sm font-semibold mt-1',
                    selectedNetwork === net.id ? 'text-[#F5F5F7]' : 'text-[#A1A1A6]'
                  )}>
                    {net.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label className="text-slate-300">
              Destination Wallet Address &nbsp;
              <span className="font-mono text-xs text-primary">
                ({networkOptions.find(n => n.id === selectedNetwork)?.name})
              </span>
            </Label>
            <Input
              placeholder="Enter your USDT wallet address"
              value={cryptoAddress}
              onChange={(e) => { setCryptoAddress(e.target.value); setError(null) }}
              className="border-slate-700 bg-slate-800 font-mono text-sm text-white"
            />
          </div>

          {/* Fee Info */}
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-400">
                  Admin Fee: {getFeePercentage()}%
                  {selectedWallet === 'asset' && roi < 100 && ' (ROI below 100%)'}
                  {selectedWallet === 'asset' && roi >= 100 && ' (ROI reached 100%+)'}
                  {selectedWallet === 'bonus' && ' (Bonus Wallet)'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {selectedWallet === 'asset'
                    ? 'Asset Wallet: 20% fee if profit below 100% | 5% fee if profit reached 100%+, max 400%'
                    : 'Bonus Wallet: flat 5% fee from sponsor bonus & rewards'}
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          {amount && parseFloat(amount) >= MIN_WITHDRAWAL && (
            <div className="rounded-xl bg-slate-800 border border-slate-700 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Withdrawal Amount</span>
                  <span className="text-white">{formatCurrency(parseFloat(amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Admin Fee ({getFeePercentage()}%)</span>
                  <span className="text-red-400">- {formatCurrency(fee)}</span>
                </div>
                <div className="border-t border-slate-700 pt-2 flex justify-between">
                  <span className="font-semibold text-white">You Will Receive</span>
                  <span className="text-xl font-bold text-blue-400">{formatCurrency(netAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button
            className="h-12 w-full text-base font-semibold"
            onClick={handleWithdraw}
            disabled={submitting || !amount || parseFloat(amount) < MIN_WITHDRAWAL || !cryptoAddress}
          >
            {submitting
              ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</>
              : <><ArrowUpFromLine className="mr-2 h-5 w-5" />Submit Withdrawal</>
            }
          </Button>

          <p className="text-center text-xs text-slate-500">
            Withdrawals are processed by admin within 24-48 hours. Funds will be deducted from your wallet immediately.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
