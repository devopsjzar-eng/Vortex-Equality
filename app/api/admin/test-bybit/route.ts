import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Test endpoint untuk verifikasi koneksi Bybit API
const BYBIT_ENDPOINTS = ['https://api.bytick.com', 'https://api.bybit.com']

export async function GET() {
  const apiKey = process.env.BYBIT_API_KEY
  const secretKey = process.env.BYBIT_SECRET_KEY
  
  const results: any = {
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!apiKey,
    secretKeyConfigured: !!secretKey,
    apiKeyPreview: apiKey ? apiKey.substring(0, 8) + '...' : 'MISSING',
    endpoints: []
  }

  if (!apiKey || !secretKey) {
    return NextResponse.json({
      ...results,
      error: 'API keys not configured'
    })
  }

  // Test each endpoint with wallet balance check
  for (const base of BYBIT_ENDPOINTS) {
    const endpointResult: any = { url: base, status: 'testing' }
    
    try {
      const recvWindow = '20000'
      const timestamp = Date.now().toString()
      const params = 'accountType=UNIFIED'
      const signPayload = timestamp + apiKey + recvWindow + params
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(signPayload)
        .digest('hex')

      const res = await fetch(`${base}/v5/account/wallet-balance?${params}`, {
        headers: {
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow,
          'X-BAPI-SIGN': signature,
        },
      })

      const text = await res.text()
      
      if (!text.startsWith('{')) {
        endpointResult.status = 'blocked'
        endpointResult.error = text.substring(0, 100)
      } else {
        const data = JSON.parse(text)
        endpointResult.status = data.retCode === 0 ? 'connected' : 'error'
        endpointResult.retCode = data.retCode
        endpointResult.retMsg = data.retMsg
        
        if (data.retCode === 0) {
          const coins = data.result?.list?.[0]?.coin ?? []
          const usdt = coins.find((c: any) => c.coin === 'USDT')
          endpointResult.usdtBalance = usdt?.walletBalance ?? '0'
          endpointResult.usdtAvailable = usdt?.availableToWithdraw ?? '0'
        }
      }
    } catch (e: any) {
      endpointResult.status = 'exception'
      endpointResult.error = e.message
    }
    
    results.endpoints.push(endpointResult)
  }

  // Summary
  const connected = results.endpoints.find((e: any) => e.status === 'connected')
  results.summary = connected 
    ? `Bybit CONNECTED via ${connected.url}. USDT Balance: ${connected.usdtBalance}, Available: ${connected.usdtAvailable}`
    : 'Bybit NOT CONNECTED - All endpoints failed'

  return NextResponse.json(results)
}
