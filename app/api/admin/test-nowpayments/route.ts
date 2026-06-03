import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.NOWPAYMENTS_API_KEY
  
  const results: any = {
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!apiKey,
    apiKeyPreview: apiKey ? apiKey.substring(0, 8) + '...' : null,
    endpoints: [],
    summary: ''
  }

  if (!apiKey) {
    results.summary = 'NOWPayments API Key NOT configured'
    return NextResponse.json(results)
  }

  // Test 1: Get API status
  try {
    const statusRes = await fetch('https://api.nowpayments.io/v1/status', {
      headers: { 'x-api-key': apiKey }
    })
    const statusText = await statusRes.text()
    results.endpoints.push({
      name: 'API Status',
      url: 'https://api.nowpayments.io/v1/status',
      status: statusRes.ok ? 'success' : 'failed',
      response: statusText.substring(0, 200)
    })
  } catch (e: any) {
    results.endpoints.push({
      name: 'API Status',
      status: 'exception',
      error: e.message
    })
  }

  // Test 2: Get available currencies
  try {
    const currRes = await fetch('https://api.nowpayments.io/v1/currencies', {
      headers: { 'x-api-key': apiKey }
    })
    const currData = await currRes.json()
    const hasUSDT = currData.currencies?.includes('usdttrc20') || currData.currencies?.includes('usdtbsc')
    results.endpoints.push({
      name: 'Currencies',
      status: currRes.ok ? 'success' : 'failed',
      hasUSDT_TRC20: currData.currencies?.includes('usdttrc20'),
      hasUSDT_BSC: currData.currencies?.includes('usdtbsc'),
      totalCurrencies: currData.currencies?.length || 0
    })
  } catch (e: any) {
    results.endpoints.push({
      name: 'Currencies',
      status: 'exception',
      error: e.message
    })
  }

  // Test 3: Get minimum payout amount
  try {
    const minRes = await fetch('https://api.nowpayments.io/v1/min-amount?currency_from=usdttrc20', {
      headers: { 'x-api-key': apiKey }
    })
    const minData = await minRes.json()
    results.endpoints.push({
      name: 'Min Payout Amount',
      status: minRes.ok ? 'success' : 'failed',
      data: minData
    })
  } catch (e: any) {
    results.endpoints.push({
      name: 'Min Payout Amount',
      status: 'exception',
      error: e.message
    })
  }

  // Test 4: Check payout API availability (get balance)
  try {
    const balRes = await fetch('https://api.nowpayments.io/v1/balance', {
      headers: { 'x-api-key': apiKey }
    })
    const balData = await balRes.json()
    results.endpoints.push({
      name: 'Account Balance',
      status: balRes.ok ? 'success' : 'failed',
      data: balData
    })
    results.balance = balData
  } catch (e: any) {
    results.endpoints.push({
      name: 'Account Balance',
      status: 'exception',
      error: e.message
    })
  }

  // Summary
  const successCount = results.endpoints.filter((e: any) => e.status === 'success').length
  if (successCount === results.endpoints.length) {
    results.summary = 'NOWPayments API CONNECTED - All endpoints working!'
  } else if (successCount > 0) {
    results.summary = `NOWPayments PARTIAL - ${successCount}/${results.endpoints.length} endpoints working`
  } else {
    results.summary = 'NOWPayments NOT CONNECTED - All endpoints failed'
  }

  return NextResponse.json(results)
}
