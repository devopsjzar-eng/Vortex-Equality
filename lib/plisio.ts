import crypto from 'crypto'

export const PLISIO_API_URL = process.env.PLISIO_API_BASE_URL || 'https://api.plisio.net/api/v1'

export const PLISIO_CURRENCY_MAP: Record<string, string> = {
  btc: 'BTC',
  bitcoin: 'BTC',
  eth: 'ETH',
  ethereum: 'ETH',
  usdttrc20: 'USDT_TRX',
  usdt_trx: 'USDT_TRX',
  usdttrx: 'USDT_TRX',
  usdtbsc: 'USDT_BSC',
  usdt_bsc: 'USDT_BSC',
  usdtbep20: 'USDT_BSC',
  usdt: 'USDT',
  usdterc20: 'USDT',
  bnb: 'BNB',
  bnbbsc: 'BNB',
  ltc: 'LTC',
  litecoin: 'LTC',
}

export function normalizePlisioCurrency(value: unknown) {
  const key = String(value || '').trim().toLowerCase().replace(/[\s-]/g, '')
  return PLISIO_CURRENCY_MAP[key] || String(value || '').trim().toUpperCase()
}

function byteLength(value: string) {
  return Buffer.byteLength(value, 'utf8')
}

function phpSerializeString(value: string) {
  return `s:${byteLength(value)}:"${value}";`
}

function phpSerializeValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `a:${value.length}:{${value.map((item, index) => `i:${index};${phpSerializeValue(item)}`).join('')}}`
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    return `a:${entries.length}:{${entries.map(([key, item]) => `${phpSerializeString(key)}${phpSerializeValue(item)}`).join('')}}`
  }

  return phpSerializeString(String(value ?? ''))
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

export function verifyPlisioCallback(payload: Record<string, unknown>, secretKey: string) {
  const verifyHash = String(payload.verify_hash || '')
  if (!verifyHash || !secretKey) return false

  const normalized = Object.keys(payload)
    .filter((key) => key !== 'verify_hash')
    .sort()
    .reduce((acc, key) => {
      const value = payload[key]
      acc[key] = key === 'tx_urls' && typeof value === 'string'
        ? decodeHtmlEntities(value)
        : String(value ?? '')
      return acc
    }, {} as Record<string, unknown>)

  if (normalized.expire_utc !== undefined) {
    normalized.expire_utc = String(normalized.expire_utc)
  }

  const serialized = phpSerializeValue(normalized)
  const checkHash = crypto
    .createHmac('sha1', secretKey)
    .update(serialized)
    .digest('hex')

  const expected = Buffer.from(checkHash)
  const received = Buffer.from(verifyHash)
  return expected.length === received.length && crypto.timingSafeEqual(expected, received)
}

export function mapPlisioStatus(status: string) {
  const normalized = status.toLowerCase().trim()

  switch (normalized) {
    case 'completed':
      return 'confirmed'
    case 'pending':
    case 'pending internal':
    case 'new':
      return 'confirming'
    case 'expired':
      return 'expired'
    case 'error':
    case 'cancelled':
    case 'cancelled duplicate':
      return 'failed'
    case 'mismatch':
      return 'confirming'
    default:
      return 'pending'
  }
}

export function mapLegacyDepositStatus(status: string) {
  const mapped = mapPlisioStatus(status)
  if (mapped === 'confirmed') return 'success'
  if (mapped === 'failed') return 'failed'
  if (mapped === 'expired') return 'expired'
  return 'pending'
}
