'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowDownToLine, Copy, CheckCircle, Loader2, AlertCircle, QrCode, ExternalLink } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface PaymentData {
  id: string
  orderNumber?: string
  address: string | null
  invoiceUrl?: string | null
  qrCode?: string | null
  amount: number
  currency: string
  amountUsd: number
  expiresAt: string
  status: string
}

const cryptos = [
  { symbol: 'BTC', name: 'Bitcoin', logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=029' },
  { symbol: 'ETH', name: 'Ethereum', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=029' },
  { symbol: 'USDT_TRX', name: 'USDT (TRC20)', logo: 'https://cryptologos.cc/logos/tether-usdt-logo.svg?v=029' },
  { symbol: 'USDT_BSC', name: 'USDT (BEP20)', logo: 'https://cryptologos.cc/logos/tether-usdt-logo.svg?v=029' },
  { symbol: 'BNB', name: 'BNB (BSC)', logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=029' },
  { symbol: 'LTC', name: 'Litecoin', logo: 'https://cryptologos.cc/logos/litecoin-ltc-logo.svg?v=029' },
]

const MIN_DEPOSIT_USD = Number(process.env.NEXT_PUBLIC_MIN_DEPOSIT_USD || 50)

export default function DepositPage() {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [selectedCrypto, setSelectedCrypto] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payment, setPayment] = useState<PaymentData | null>(null)
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [depositStatus, setDepositStatus] = useState<'waiting' | 'confirmed' | 'failed'>('waiting')

  // Countdown timer
  useEffect(() => {
    if (!payment) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [payment])

  // Auto-redirect to dashboard 3 seconds after confirmed
  useEffect(() => {
    if (depositStatus !== 'confirmed') return
    const t = window.setTimeout(() => router.push('/dashboard'), 3000)
    return () => window.clearTimeout(t)
  }, [depositStatus, router])

  // Poll order status every 8 seconds while waiting
  useEffect(() => {
    if (!payment || depositStatus !== 'waiting') return

    const poll = async () => {
      try {
        const res = await fetch(`/api/plisio/status?paymentId=${encodeURIComponent(payment.id)}`)
        const data = await res.json()
        if (data.status === 'confirmed') {
          setDepositStatus('confirmed')
        } else if (data.status === 'failed' || data.status === 'expired') {
          setDepositStatus('failed')
        }
      } catch {
        // silent — keep polling
      }
    }

    poll() // immediate first check
    const interval = window.setInterval(poll, 8000)
    return () => window.clearInterval(interval)
  }, [payment, depositStatus])

  const countdown = useMemo(() => {
    if (!payment?.expiresAt) return { label: '15:00', expired: false }

    const remaining = Math.max(0, new Date(payment.expiresAt).getTime() - now)
    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)

    return {
      label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      expired: remaining === 0,
    }
  }, [now, payment])

  const handleQuickSelect = (value: number) => setAmount(value.toString())

  const handleCreateInvoice = async () => {
    if (!amount) {
      setError('Please enter deposit amount')
      return
    }
    if (parseFloat(amount) < MIN_DEPOSIT_USD) {
      setError(`Minimum deposit is $${MIN_DEPOSIT_USD}`)
      return
    }
    if (!selectedCrypto) {
      setError('Please select a cryptocurrency')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/plisio/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: selectedCrypto,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create Plisio invoice')
      }

      setPayment(data.payment)
    } catch (err: any) {
      setError(err.message || 'Failed to create Plisio invoice')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (payment) {
    const paymentReference = payment.address || payment.invoiceUrl || payment.id

    return (
      <div className="w-full text-foreground">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Complete Your Deposit</h1>
              <p className="mt-1 text-muted-foreground">Complete payment through your Plisio invoice.</p>
            </div>
            <div className={`apple-matte-control px-4 py-3 text-sm ${countdown.expired ? 'border-red-500/40 text-red-300' : 'text-muted-foreground'}`}>
              <span className="mr-2 font-medium text-foreground">{countdown.label}</span>
              {countdown.expired ? 'Expired' : 'remaining'}
            </div>
          </div>

          <Card className="apple-matte-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                {countdown.expired ? 'Invoice Expired' : 'Plisio Invoice Created'}
              </CardTitle>
              <CardDescription>
                {countdown.expired
                  ? 'Create a new invoice before sending funds.'
                  : 'Funds are credited automatically after Plisio confirms payment.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center rounded-lg bg-white p-4 sm:p-6">
                {payment.qrCode ? (
                  <img src={payment.qrCode} alt="Payment QR code" className="h-[200px] w-[200px] rounded-lg object-contain" />
                ) : (
                  <QRCodeSVG
                    value={paymentReference}
                    size={200}
                    level="H"
                    includeMargin
                    className="rounded-lg"
                  />
                )}
                <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600">
                  <QrCode className="h-4 w-4" />
                  Scan QR to pay
                </p>
              </div>

              <div className="apple-matte-control p-4">
                <p className="mb-1 text-sm text-muted-foreground">Amount to Send</p>
                <p className="break-words text-2xl font-bold">
                  {payment.amount} {payment.currency}
                </p>
                <p className="text-sm text-muted-foreground">Approximately ${payment.amountUsd} USD</p>
              </div>

              <div className="apple-matte-control p-4">
                <p className="mb-2 text-sm text-muted-foreground">Payment Reference</p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded-lg bg-black/30 p-3 text-xs text-primary">
                    {paymentReference}
                  </code>
                  <button
                    onClick={() => copyToClipboard(paymentReference)}
                    className="rounded-lg bg-white p-3 font-semibold text-black transition-colors hover:bg-slate-200"
                  >
                    {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
                {copied && <p className="mt-2 text-center text-sm text-primary">Copied.</p>}
              </div>

              {payment.invoiceUrl && (
                <a
                  href={payment.invoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Open Plisio Invoice
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}

              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Important:</strong> Use only {payment.currency} for this invoice. Sending a different coin or network may result in permanent loss.
                </p>
              </div>

              {depositStatus === 'confirmed' ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-emerald-500/40 bg-emerald-900/20 p-6 text-center">
                  <CheckCircle className="h-10 w-10 text-emerald-400" />
                  <p className="text-lg font-semibold text-emerald-300">Payment Confirmed!</p>
                  <p className="text-sm text-muted-foreground">Your Active Asset has been credited. Redirecting to dashboard...</p>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 p-4">
                  {countdown.expired ? (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  <span className="text-muted-foreground">
                    {countdown.expired ? 'Invoice expired. Create a new deposit.' : 'Waiting for Plisio confirmation...'}
                  </span>
                </div>
              )}

              <Button
                onClick={() => {
                  setPayment(null)
                  setAmount('')
                  setSelectedCrypto('')
                }}
                variant="outline"
                className="w-full"
              >
                Create New Deposit
              </Button>

              <Button
                onClick={() => router.push('/dashboard')}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full text-foreground">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Deposit Funds</h1>
          <p className="mt-1 text-muted-foreground">Create a Plisio invoice to add funds to your Active Asset.</p>
        </div>

        <Card className="apple-matte-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <ArrowDownToLine className="h-5 w-5 text-primary" />
              </div>
              New Deposit
            </CardTitle>
            <CardDescription>
              Minimum {`$${MIN_DEPOSIT_USD}`}. Payment is confirmed automatically through Plisio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-600/50 bg-red-900/30 p-3">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}

            <div>
              <label className="mb-2 block font-medium text-white">Quick Select Amount ($)</label>
              <div className="grid grid-cols-3 gap-2">
                {[MIN_DEPOSIT_USD, 50, 100, 250, 500, 1000].filter((value, index, values) => values.indexOf(value) === index).map((amountValue) => (
                  <button
                    key={amountValue}
                    onClick={() => handleQuickSelect(amountValue)}
                className={`rounded-lg border p-3 font-semibold transition-colors sm:p-4 ${
                      amount === amountValue.toString()
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-muted text-muted-foreground hover:border-primary/60 hover:text-foreground'
                    }`}
                  >
                    ${amountValue}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="amount" className="mb-2 block font-medium text-white">
                Or Enter Custom Amount (USD)
              </label>
              <input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted p-3 text-lg text-foreground focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-sm text-slate-400">Minimum deposit: ${MIN_DEPOSIT_USD}</p>
            </div>

            <div>
              <label className="mb-3 block font-semibold text-[#F5F5F7]">Select Cryptocurrency</label>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {cryptos.map((crypto) => (
                  <button
                    key={crypto.symbol}
                    onClick={() => setSelectedCrypto(crypto.symbol)}
                  className={`flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors sm:p-4 ${
                      selectedCrypto === crypto.symbol
                        ? 'border-primary bg-muted'
                        : 'border-border bg-card hover:border-primary/60'
                    }`}
                  >
                    <div className="shrink-0 rounded-full bg-white p-1.5 shadow-sm">
                      <img src={crypto.logo} alt={crypto.symbol} className="h-6 w-6 object-contain sm:h-8 sm:w-8" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold sm:text-base ${selectedCrypto === crypto.symbol ? 'text-[#F5F5F7]' : 'text-[#A1A1A6]'}`}>
                        {crypto.symbol.replace('_TRX', '').replace('_BSC', '')}
                      </p>
                      <p className={`text-[10px] sm:text-xs ${selectedCrypto === crypto.symbol ? 'text-[#86868B]' : 'text-[#55555A]'}`}>
                        {crypto.name}
                      </p>
                    </div>
                    {selectedCrypto === crypto.symbol && (
                      <div className="ml-auto">
                        <div className="rounded-full bg-emerald-500 p-0.5">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Button
                type="button"
                onClick={handleCreateInvoice}
                disabled={loading}
                className="h-12 w-full bg-[#0071E3] text-sm font-semibold text-white shadow-lg hover:bg-[#0077ED] sm:h-14 sm:text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" />
                    <span>Creating Invoice...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="mr-2 h-5 w-5 shrink-0" />
                    <span>Create Plisio Invoice</span>
                  </>
                )}
              </Button>
              {(!amount || !selectedCrypto) && (
                <p className="text-center text-sm text-slate-400">
                  {!amount && !selectedCrypto
                    ? 'Please enter amount and select cryptocurrency'
                    : !amount
                      ? 'Please enter deposit amount'
                      : 'Please select cryptocurrency'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
