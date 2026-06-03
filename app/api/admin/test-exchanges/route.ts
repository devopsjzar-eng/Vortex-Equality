import { NextResponse } from 'next/server'

// Test multiple exchanges to find one that doesn't block Vercel
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    exchanges: []
  }

  // List of exchanges to test (public endpoints, no API key needed)
  const exchanges = [
    {
      name: 'OKX',
      url: 'https://www.okx.com/api/v5/public/time',
      check: (data: any) => data.code === '0'
    },
    {
      name: 'KuCoin',
      url: 'https://api.kucoin.com/api/v1/timestamp',
      check: (data: any) => data.code === '200000'
    },
    {
      name: 'Gate.io',
      url: 'https://api.gateio.ws/api/v4/spot/time',
      check: (data: any) => data.server_time !== undefined
    },
    {
      name: 'MEXC',
      url: 'https://api.mexc.com/api/v3/time',
      check: (data: any) => data.serverTime !== undefined
    },
    {
      name: 'Bitget',
      url: 'https://api.bitget.com/api/v2/public/time',
      check: (data: any) => data.code === '00000'
    },
    {
      name: 'Huobi/HTX',
      url: 'https://api.huobi.pro/v1/common/timestamp',
      check: (data: any) => data.status === 'ok'
    },
  ]

  for (const ex of exchanges) {
    try {
      const res = await fetch(ex.url, { 
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000)
      })
      const text = await res.text()
      
      // Check if blocked (HTML response)
      if (text.includes('CloudFront') || text.includes('blocked') || text.includes('<!DOCTYPE')) {
        results.exchanges.push({
          name: ex.name,
          status: 'BLOCKED',
          error: 'CloudFront/Geo block'
        })
        continue
      }

      const data = JSON.parse(text)
      const working = ex.check(data)
      
      results.exchanges.push({
        name: ex.name,
        status: working ? 'OK - AVAILABLE' : 'ERROR',
        response: working ? 'Connected successfully' : data
      })
    } catch (e: any) {
      results.exchanges.push({
        name: ex.name,
        status: 'ERROR',
        error: e.message
      })
    }
  }

  // Summary
  const available = results.exchanges.filter((e: any) => e.status === 'OK - AVAILABLE')
  results.summary = {
    total: exchanges.length,
    available: available.length,
    availableExchanges: available.map((e: any) => e.name)
  }

  return NextResponse.json(results, { status: 200 })
}
