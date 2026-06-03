import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Bybit mirror endpoints - try each in order to bypass geo-restrictions
const BYBIT_ENDPOINTS = [
  'https://api.bytick.com',
  'https://api.bybit.com',
]

async function bybitFetch(path: string, params: string, apiKey: string, secretKey: string) {
  const recvWindow = '20000'
  const timestamp = Date.now().toString()
  const signPayload = timestamp + apiKey + recvWindow + params
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(signPayload)
    .digest('hex')

  const headers = {
    'X-BAPI-API-KEY': apiKey,
    'X-BAPI-TIMESTAMP': timestamp,
    'X-BAPI-RECV-WINDOW': recvWindow,
    'X-BAPI-SIGN': signature,
  }

  for (const base of BYBIT_ENDPOINTS) {
    try {
      const res = await fetch(`${base}${path}?${params}`, { headers })
      const text = await res.text()
      // Skip if it's an HTML/CloudFront error
      if (text.startsWith('{')) {
        return JSON.parse(text)
      }
      console.log(`[v0] Bybit ${base} blocked:`, text.substring(0, 80))
    } catch (e: any) {
      console.log(`[v0] Bybit ${base} error:`, e.message)
    }
  }
  return null
}

export async function GET() {
  const apiKey = process.env.BYBIT_API_KEY
  const secretKey = process.env.BYBIT_SECRET_KEY

  if (!apiKey || !secretKey) {
    return NextResponse.json({
      success: false, usdt: 0,
      error: 'BYBIT_API_KEY or BYBIT_SECRET_KEY not configured'
    })
  }

  try {
    // Get USDT balance
    const balanceData = await bybitFetch(
      '/v5/account/wallet-balance',
      'accountType=UNIFIED',
      apiKey, secretKey
    )

    if (!balanceData) {
      return NextResponse.json({
        success: false, usdt: 0,
        error: 'Semua endpoint Bybit diblokir dari server ini. Saldo tidak dapat ditampilkan namun auto-payout tetap berfungsi.'
      })
    }

    if (balanceData.retCode !== 0) {
      return NextResponse.json({
        success: false, usdt: 0,
        error: `Bybit: ${balanceData.retMsg}`
      })
    }

    const coins: any[] = balanceData.result?.list?.[0]?.coin ?? []
    const usdtCoin = coins.find((c: any) => c.coin === 'USDT')
    const usdt = parseFloat(usdtCoin?.walletBalance ?? '0')

    // Get deposit address
    const addrData = await bybitFetch(
      '/v5/asset/deposit/query-address',
      'coin=USDT&chainType=TRC20',
      apiKey, secretKey
    )

    const chains: any[] = addrData?.result?.chains ?? []
    const trc20 = chains.find((c: any) => c.chain === 'TRX' || c.chain === 'TRC20') || chains[0]

    return NextResponse.json({
      success: true,
      usdt,
      depositAddress: trc20?.addressDeposit ?? null,
      chain: trc20?.chain ?? 'TRC20',
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, usdt: 0, error: error.message })
  }
}
