import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Force this function to run in Singapore region (not blocked by Bybit)
export const runtime = 'nodejs'
export const preferredRegion = ['sin1', 'hkg1'] // Singapore, Hong Kong

const BYBIT_ENDPOINTS = [
  'https://api.bybit.com',
  'https://api.bytick.com',
]

// Create Bybit signature
function createSignature(timestamp: string, apiKey: string, recvWindow: string, params: string, secretKey: string) {
  const signPayload = timestamp + apiKey + recvWindow + params
  return crypto.createHmac('sha256', secretKey).update(signPayload).digest('hex')
}

// Test Bybit connection
async function testBybitConnection(apiKey: string, secretKey: string) {
  const timestamp = Date.now().toString()
  const recvWindow = '20000'
  const params = 'accountType=UNIFIED'
  const signature = createSignature(timestamp, apiKey, recvWindow, params, secretKey)

  for (const base of BYBIT_ENDPOINTS) {
    try {
      const res = await fetch(`${base}/v5/account/wallet-balance?${params}`, {
        headers: {
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow,
          'X-BAPI-SIGN': signature,
        },
      })
      const text = await res.text()
      if (text.startsWith('{')) {
        const data = JSON.parse(text)
        if (data.retCode === 0) {
          const coins = data.result?.list?.[0]?.coin ?? []
          const usdt = coins.find((c: any) => c.coin === 'USDT')
          return { 
            success: true, 
            endpoint: base, 
            balance: parseFloat(usdt?.walletBalance ?? '0'),
            region: process.env.VERCEL_REGION || 'unknown'
          }
        }
      }
    } catch (e) {
      continue
    }
  }
  return { success: false, error: 'All endpoints failed', region: process.env.VERCEL_REGION || 'unknown' }
}

// Send withdrawal via Bybit
async function sendBybitWithdrawal(apiKey: string, secretKey: string, address: string, amount: number) {
  const timestamp = Date.now().toString()
  const recvWindow = '20000'
  
  // Detect chain
  const chain = address.startsWith('0x') ? 'BSC' : 'TRX'
  
  const params = {
    coin: 'USDT',
    chain: chain,
    address: address,
    amount: amount.toFixed(2),
    forceChain: 1,
    accountType: 'UNIFIED'
  }
  
  const body = JSON.stringify(params)
  const signature = createSignature(timestamp, apiKey, recvWindow, body, secretKey)

  for (const base of BYBIT_ENDPOINTS) {
    try {
      const res = await fetch(`${base}/v5/asset/withdraw/create`, {
        method: 'POST',
        headers: {
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow,
          'X-BAPI-SIGN': signature,
          'Content-Type': 'application/json',
        },
        body,
      })

      const text = await res.text()
      if (!text.startsWith('{')) continue

      const data = JSON.parse(text)
      if (data.retCode === 0 && data.result?.id) {
        return { success: true, withdrawId: data.result.id, endpoint: base }
      }
      return { success: false, error: `Bybit: ${data.retMsg}`, code: data.retCode }
    } catch (e) {
      continue
    }
  }
  return { success: false, error: 'All Bybit endpoints failed' }
}

// GET - Test connection
export async function GET() {
  const apiKey = process.env.BYBIT_API_KEY
  const secretKey = process.env.BYBIT_SECRET_KEY

  if (!apiKey || !secretKey) {
    return NextResponse.json({ 
      success: false, 
      error: 'BYBIT_API_KEY or BYBIT_SECRET_KEY not configured',
      region: process.env.VERCEL_REGION || 'unknown'
    })
  }

  const result = await testBybitConnection(apiKey, secretKey)
  return NextResponse.json(result)
}

// POST - Execute withdrawal
export async function POST(request: NextRequest) {
  const apiKey = process.env.BYBIT_API_KEY
  const secretKey = process.env.BYBIT_SECRET_KEY

  if (!apiKey || !secretKey) {
    return NextResponse.json({ success: false, error: 'Bybit credentials not configured' }, { status: 400 })
  }

  try {
    const { address, amount, transactionId } = await request.json()

    if (!address || !amount) {
      return NextResponse.json({ success: false, error: 'Missing address or amount' }, { status: 400 })
    }

    // Test connection first
    const connectionTest = await testBybitConnection(apiKey, secretKey)
    if (!connectionTest.success) {
      return NextResponse.json({ 
        success: false, 
        error: `Bybit connection failed: ${connectionTest.error}`,
        region: connectionTest.region
      }, { status: 500 })
    }

    // Check balance
    if (connectionTest.balance < amount) {
      return NextResponse.json({ 
        success: false, 
        error: `Saldo Bybit tidak cukup. Tersedia: $${connectionTest.balance}, Dibutuhkan: $${amount}`,
        balance: connectionTest.balance
      }, { status: 400 })
    }

    // Send withdrawal
    const result = await sendBybitWithdrawal(apiKey, secretKey, address, amount)
    
    return NextResponse.json({
      ...result,
      transactionId,
      region: process.env.VERCEL_REGION || 'unknown'
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
