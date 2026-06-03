import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Bitget API endpoints
const BITGET_BASE = 'https://api.bitget.com'

export async function GET() {
  const apiKey = process.env.BITGET_API_KEY
  const secretKey = process.env.BITGET_SECRET_KEY
  const passphrase = process.env.BITGET_PASSPHRASE

  const results: any = {
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!apiKey,
    secretKeyConfigured: !!secretKey,
    passphraseConfigured: !!passphrase,
    apiKeyPreview: apiKey ? apiKey.substring(0, 8) + '...' : null,
    connectionTest: null,
    balanceCheck: null,
    summary: ''
  }

  if (!apiKey || !secretKey || !passphrase) {
    results.summary = 'Bitget API credentials not configured'
    return NextResponse.json(results)
  }

  try {
    // Test connection - get account assets
    const timestamp = Date.now().toString()
    const method = 'GET'
    const requestPath = '/api/v2/spot/account/assets'
    
    // Bitget signature: timestamp + method + requestPath + body
    const signPayload = timestamp + method + requestPath
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(signPayload)
      .digest('base64')

    const response = await fetch(`${BITGET_BASE}${requestPath}`, {
      method: 'GET',
      headers: {
        'ACCESS-KEY': apiKey,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': passphrase,
        'Content-Type': 'application/json',
        'locale': 'en-US'
      }
    })

    const text = await response.text()
    console.log('[v0 Bitget] Raw response:', text.substring(0, 300))

    // Check if blocked (HTML response)
    if (!text.startsWith('{')) {
      results.connectionTest = {
        status: 'blocked',
        error: 'Endpoint returned HTML - likely geo-blocked',
        preview: text.substring(0, 100)
      }
      results.summary = 'Bitget BLOCKED from this server'
      return NextResponse.json(results)
    }

    const data = JSON.parse(text)
    
    if (data.code === '00000') {
      // Success - find USDT balance
      const assets = data.data || []
      const usdt = assets.find((a: any) => a.coin === 'USDT')
      
      results.connectionTest = { status: 'connected', code: data.code }
      results.balanceCheck = {
        success: true,
        usdt: usdt ? parseFloat(usdt.available) : 0,
        allAssets: assets.slice(0, 5) // Show first 5 assets
      }
      results.summary = 'Bitget API CONNECTED successfully!'
    } else {
      results.connectionTest = { status: 'error', code: data.code, message: data.msg }
      results.summary = `Bitget API error: ${data.msg}`
    }

  } catch (error: any) {
    results.connectionTest = { status: 'exception', error: error.message }
    results.summary = `Connection failed: ${error.message}`
  }

  return NextResponse.json(results)
}
