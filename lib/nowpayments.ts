// NOWPayments API Integration
// Documentation: https://documenter.getpostman.com/view/7907941/S1a32n38

const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1'

interface CreatePaymentParams {
  price_amount: number
  price_currency: string
  pay_currency: string
  order_id: string
  order_description?: string
  ipn_callback_url?: string
}

interface PaymentResponse {
  payment_id: string
  payment_status: string
  pay_address: string
  price_amount: number
  price_currency: string
  pay_amount: number
  pay_currency: string
  order_id: string
  order_description: string
  created_at: string
  updated_at: string
  purchase_id: string
}

interface PaymentStatusResponse {
  payment_id: number
  payment_status: string
  pay_address: string
  price_amount: number
  price_currency: string
  pay_amount: number
  actually_paid: number
  pay_currency: string
  order_id: string
  order_description: string
  purchase_id: string
  created_at: string
  updated_at: string
  outcome_amount: number
  outcome_currency: string
}

// Get available currencies
export async function getAvailableCurrencies(): Promise<string[]> {
  const response = await fetch(`${NOWPAYMENTS_API_URL}/currencies`, {
    headers: {
      'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
    },
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch currencies')
  }
  
  const data = await response.json()
  return data.currencies
}

// Get minimum payment amount for a currency
export async function getMinimumAmount(currency: string): Promise<number> {
  const response = await fetch(
    `${NOWPAYMENTS_API_URL}/min-amount?currency_from=${currency}&currency_to=usd`,
    {
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      },
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to fetch minimum amount')
  }
  
  const data = await response.json()
  return data.min_amount
}

// Get estimated price
export async function getEstimatedPrice(
  amount: number,
  currencyFrom: string,
  currencyTo: string
): Promise<number> {
  const response = await fetch(
    `${NOWPAYMENTS_API_URL}/estimate?amount=${amount}&currency_from=${currencyFrom}&currency_to=${currencyTo}`,
    {
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      },
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to get estimated price')
  }
  
  const data = await response.json()
  return data.estimated_amount
}

// Create a new payment
export async function createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
  const response = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...params,
      ipn_callback_url: params.ipn_callback_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/nowpayments/ipn`,
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create payment')
  }
  
  return response.json()
}

// Get payment status
export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
  const response = await fetch(`${NOWPAYMENTS_API_URL}/payment/${paymentId}`, {
    headers: {
      'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
    },
  })
  
  if (!response.ok) {
    throw new Error('Failed to get payment status')
  }
  
  return response.json()
}

// Verify IPN signature
export function verifyIPNSignature(
  payload: Record<string, unknown>,
  signature: string
): boolean {
  const crypto = require('crypto')
  
  // Sort payload keys alphabetically and create string
  const sortedPayload = Object.keys(payload)
    .sort()
    .reduce((acc, key) => {
      acc[key] = payload[key]
      return acc
    }, {} as Record<string, unknown>)
  
  const payloadString = JSON.stringify(sortedPayload)
  
  // Create HMAC SHA512 hash
  const hmac = crypto.createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET!)
  hmac.update(payloadString)
  const calculatedSignature = hmac.digest('hex')
  
  return calculatedSignature === signature
}

// Supported cryptocurrencies for display
export const SUPPORTED_CURRENCIES = [
  { symbol: 'btc', name: 'Bitcoin', icon: '₿' },
  { symbol: 'eth', name: 'Ethereum', icon: 'Ξ' },
  { symbol: 'usdtbep20', name: 'USDT (BEP20)', icon: '₮' },
  { symbol: 'usdterc20', name: 'USDT (ERC20)', icon: '₮' },
  { symbol: 'ltc', name: 'Litecoin', icon: 'Ł' },
  { symbol: 'bnbbsc', name: 'BNB (BSC)', icon: '◆' },
  { symbol: 'sol', name: 'Solana', icon: '◎' },
  { symbol: 'xrp', name: 'Ripple', icon: '✕' },
  { symbol: 'doge', name: 'Dogecoin', icon: 'Ð' },
]
