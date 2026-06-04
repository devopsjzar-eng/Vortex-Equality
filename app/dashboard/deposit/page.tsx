'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowDownToLine, Copy, CheckCircle, Loader2, AlertCircle, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface PaymentData {
  id: string
  address: string
  amount: number
  currency: string
  amountUsd: number
  expiresAt: string
  status: string
}

export default function DepositPage() {
  const router = useRouter()
  const [amount, setAmount] = useState<string>('')
  const [selectedCrypto, setSelectedCrypto] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payment, setPayment] = useState<PaymentData | null>(null)
  const [copied, setCopied] = useState(false)

  const handleQuickSelect = (value: number) => {
    setAmount(value.toString())
  }

  const handleGenerateAddress = async () => {
    // Validation
    if (!amount) {
      setError('Please enter deposit amount')
      return
    }
    if (parseFloat(amount) < 50) {
      setError('Minimum deposit is $50')
      return
    }
    if (!selectedCrypto) {
      setError('Please select a cryptocurrency')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/nowpayments/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: selectedCrypto.toLowerCase(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment')
      }

      setPayment(data.payment)
    } catch (err: any) {
      setError(err.message || 'Failed to generate deposit address')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Show payment details if generated
  if (payment) {
    return (
      <div className="min-h-screen w-full p-4 bg-slate-950 text-white">
        <div className="max-w-lg mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Complete Your Deposit</h1>
            <p className="text-slate-400">Send the exact amount to the address below</p>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle className="h-5 w-5 text-blue-500" />
                Payment Address Generated
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR Code */}
              <div className="flex flex-col items-center p-6 bg-white rounded-xl">
                <QRCodeSVG 
                  value={payment.address}
                  size={200}
                  level="H"
                  includeMargin={true}
                  className="rounded-lg"
                />
                <p className="mt-3 text-slate-600 text-sm font-medium flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Scan QR untuk deposit
                </p>
              </div>

              {/* Amount to send */}
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-sm text-slate-400 mb-1">Amount to Send</p>
                <p className="text-2xl font-bold text-slate-1000">
                  {payment.amount} {payment.currency}
                </p>
                <p className="text-sm text-slate-400">≈ ${payment.amountUsd} USD</p>
              </div>

              {/* Address */}
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-sm text-slate-400 mb-2">Atau salin alamat {payment.currency}:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-slate-900 rounded text-xs text-blue-400 break-all">
                    {payment.address}
                  </code>
                  <button
                    onClick={() => copyToClipboard(payment.address)}
                    className="p-3 bg-slate-1000 hover:bg-slate-500 rounded text-black font-semibold transition-colors"
                  >
                    {copied ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-blue-400 text-sm mt-2 text-center">Alamat berhasil disalin!</p>
                )}
              </div>

              {/* Warning */}
              <div className="p-4 bg-slate-800/30 border border-slate-500/50 rounded-lg">
                <p className="text-sm text-slate-400">
                  <strong>Important:</strong> Send only {payment.currency} to this address. Sending any other coin may result in permanent loss.
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center justify-center gap-2 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-slate-400">Waiting for payment confirmation...</span>
              </div>

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
                className="w-full text-slate-400 hover:text-white"
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
    <div className="min-h-screen w-full p-4 bg-slate-950 text-white">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Deposit Funds</h1>
          <p className="text-slate-400">Add funds to your account to start earning</p>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-1000/20">
                <ArrowDownToLine className="h-5 w-5 text-slate-1000" />
              </div>
              New Deposit
            </CardTitle>
            <CardDescription className="text-slate-400">
              Send cryptocurrency to your deposit address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-600/50 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}

            {/* Quick Amount Buttons */}
            <div>
              <label className="text-white font-medium mb-2 block">Quick Select Amount ($)</label>
              <div className="grid grid-cols-3 gap-2">
                {[50, 100, 250, 500, 1000, 2500].map((amountValue) => (
                  <button
                    key={amountValue}
                    onClick={() => handleQuickSelect(amountValue)}
                    className={`p-4 rounded-lg font-semibold transition-all duration-200 border-2 ${
                      amount === amountValue.toString()
                        ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/50 scale-105 hover:bg-blue-700'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-blue-500 hover:bg-slate-700/80 hover:text-white'
                    }`}
                  >
                    ${amountValue}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label htmlFor="amount" className="text-white font-medium mb-2 block">
                Or Enter Custom Amount (USD)
              </label>
              <input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-lg focus:border-slate-1000 focus:outline-none"
              />
              <p className="text-slate-400 text-sm mt-1">Minimum deposit: $50</p>
            </div>

            {/* Crypto Selection */}
            <div>
              <label className="text-white font-medium mb-2 block">Select Cryptocurrency</label>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[
                  { symbol: 'BTC', name: 'Bitcoin', logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=029' },
                  { symbol: 'ETH', name: 'Ethereum', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=029' },
                  { symbol: 'USDTTRC20', name: 'USDT (TRC20)', logo: 'https://cryptologos.cc/logos/tether-usdt-logo.svg?v=029' },
                  { symbol: 'USDTBSC', name: 'USDT (BEP20)', logo: 'https://cryptologos.cc/logos/tether-usdt-logo.svg?v=029' },
                  { symbol: 'BNB', name: 'BNB (BSC)', logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=029' },
                  { symbol: 'LTC', name: 'Litecoin', logo: 'https://cryptologos.cc/logos/litecoin-ltc-logo.svg?v=029' }
                ].map((crypto) => (
                  <button
                    key={crypto.symbol}
                    onClick={() => setSelectedCrypto(crypto.symbol)}
                    className={`relative flex items-center gap-3 p-3 sm:p-4 rounded-xl text-left transition-all duration-300 border-2 overflow-hidden ${
                      selectedCrypto === crypto.symbol
                        ? 'bg-gradient-to-br from-blue-900/40 to-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-[1.02]'
                        : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:border-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    {/* Glowing effect inside selected button */}
                    {selectedCrypto === crypto.symbol && (
                      <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-xl" />
                    )}
                    
                    <div className="flex-shrink-0 bg-white/10 p-1.5 sm:p-2 rounded-full z-10">
                      <img src={crypto.logo} alt={crypto.symbol} className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div className="z-10">
                      <p className={`font-bold ${selectedCrypto === crypto.symbol ? 'text-white' : 'text-slate-300'}`}>
                        {crypto.symbol.replace('TRC20', '').replace('BSC', '')}
                      </p>
                      <p className={`text-[10px] sm:text-xs ${selectedCrypto === crypto.symbol ? 'text-blue-200' : 'text-slate-500'}`}>
                        {crypto.name}
                      </p>
                    </div>
                    
                    {/* Checkmark for selected */}
                    {selectedCrypto === crypto.symbol && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                        <div className="bg-blue-500 rounded-full p-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Button - ALWAYS VISIBLE */}
            <div className="space-y-2">
              <Button
                type="button"
                onClick={handleGenerateAddress}
                disabled={loading}
                className="w-full h-12 sm:h-14 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-sm sm:text-base shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin flex-shrink-0" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>Generate Address</span>
                  </>
                )}
              </Button>
              {(!amount || !selectedCrypto) && (
                <p className="text-center text-slate-400 text-sm">
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
