import { NextResponse } from 'next/server'
import { PLISIO_API_URL } from '@/lib/plisio'
import { requireAdmin } from '@/lib/require-admin'

export async function GET() {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const secretKey = process.env.PLISIO_SECRET_KEY

  const results: any = {
    timestamp: new Date().toISOString(),
    provider: 'plisio',
    secretConfigured: Boolean(secretKey),
    secretPreview: secretKey ? `${secretKey.slice(0, 6)}...` : null,
    apiBaseUrl: PLISIO_API_URL,
    endpoints: [],
    summary: '',
  }

  if (!secretKey) {
    results.summary = 'Plisio secret key is not configured'
    return NextResponse.json(results)
  }

  try {
    const params = new URLSearchParams({ api_key: secretKey })
    const response = await fetch(`${PLISIO_API_URL}/currencies?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    })
    const data = await response.json().catch(() => ({}))
    results.endpoints.push({
      name: 'Currencies',
      status: response.ok ? 'success' : 'failed',
      data,
    })
  } catch (error: any) {
    results.endpoints.push({
      name: 'Currencies',
      status: 'exception',
      error: error.message,
    })
  }

  const successCount = results.endpoints.filter((endpoint: any) => endpoint.status === 'success').length
  results.summary = successCount > 0
    ? 'Plisio API connected.'
    : 'Plisio API test failed. Check the secret key and Plisio shop settings.'

  return NextResponse.json(results)
}
