import { PLISIO_API_URL, normalizePlisioCurrency } from '@/lib/plisio'

export type PlisioPayoutRequest = {
  address: string
  amount: number
  currency: string
  withdrawalId?: string
}

export type PlisioPayoutResult =
  | {
      success: true
      provider: 'plisio'
      payoutId: string
      currency: string
      amount: number
      raw: unknown
    }
  | {
      success: false
      provider: 'plisio'
      error: string
      code?: string | number
      raw?: unknown
    }

export function mapWithdrawalNetworkToPlisioCurrency(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase()

  if (normalized.includes('trc') || normalized.includes('tron') || normalized.includes('trx')) {
    return 'USDT_TRX'
  }

  if (normalized.includes('bep') || normalized.includes('bsc') || normalized.includes('bnb')) {
    return 'USDT_BSC'
  }

  return normalizePlisioCurrency(value)
}

function extractPayoutId(data: any, fallback: string) {
  return String(
    data?.data?.txn_id ||
    data?.data?.id ||
    data?.data?.operation_id ||
    data?.data?.txid ||
    data?.txn_id ||
    data?.id ||
    data?.operation_id ||
    fallback
  )
}

export async function sendPlisioPayout(params: PlisioPayoutRequest): Promise<PlisioPayoutResult> {
  const secretKey = process.env.PLISIO_SECRET_KEY
  if (!secretKey) {
    return {
      success: false,
      provider: 'plisio',
      error: 'PLISIO_SECRET_KEY is not configured',
    }
  }

  const currency = mapWithdrawalNetworkToPlisioCurrency(params.currency)
  if (!['USDT_TRX', 'USDT_BSC'].includes(currency)) {
    return {
      success: false,
      provider: 'plisio',
      error: `Unsupported payout currency "${currency}". Use USDT TRC20 or USDT BEP20 for exact USD net payouts.`,
    }
  }

  if (!params.address || params.address.length < 20) {
    return {
      success: false,
      provider: 'plisio',
      error: 'Destination wallet address is invalid',
    }
  }

  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    return {
      success: false,
      provider: 'plisio',
      error: 'Payout amount is invalid',
    }
  }

  const payoutReference = params.withdrawalId || `VX-PAYOUT-${Date.now()}`
  const query = new URLSearchParams({
    api_key: secretKey,
    type: 'cash_out',
    currency,
    to: params.address,
    amount: params.amount.toFixed(2),
    order_number: payoutReference,
  })

  try {
    const response = await fetch(`${PLISIO_API_URL}/operations/withdraw?${query.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    const rawText = await response.text()
    console.log('[Plisio Payout] status:', response.status, 'body:', rawText.slice(0, 500))

    let data: any = {}
    try { data = rawText ? JSON.parse(rawText) : {} } catch { data = { _raw: rawText } }

    if (!response.ok || data.status !== 'success') {
      const errMsg =
        data?.data?.message ||
        data?.message ||
        data?.error ||
        (typeof data?._raw === 'string' ? data._raw : null) ||
        `Plisio payout failed with status ${response.status}`
      return {
        success: false,
        provider: 'plisio',
        error: errMsg,
        code: data.code || response.status,
        raw: data,
      }
    }

    return {
      success: true,
      provider: 'plisio',
      payoutId: extractPayoutId(data, payoutReference),
      currency,
      amount: params.amount,
      raw: data,
    }
  } catch (error) {
    return {
      success: false,
      provider: 'plisio',
      error: error instanceof Error ? error.message : 'Plisio payout request failed',
    }
  }
}
