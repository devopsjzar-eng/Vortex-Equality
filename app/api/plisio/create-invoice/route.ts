import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { normalizePlisioCurrency, PLISIO_API_URL } from '@/lib/plisio'

function getMinimumDepositUsd() {
  return Number(process.env.NEXT_PUBLIC_MIN_DEPOSIT_USD || process.env.MIN_DEPOSIT_USD || 50)
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase admin credentials are not configured')
  }

  return createSupabaseAdminClient(url, key)
}

async function checkSupabaseAdminAccess(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const { error } = await admin
    .from('crypto_deposit_orders')
    .select('id')
    .limit(1)

  if (!error) return null

  console.error('[Plisio] Supabase admin preflight failed:', {
    message: error.message,
    hint: error.hint,
    code: error.code,
  })

  if (error.message.toLowerCase().includes('invalid api key')) {
    return 'Supabase service role key is invalid for the configured staging project.'
  }

  return 'Supabase admin access is not ready. Check service role key and database migrations.'
}

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.PLISIO_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: 'Plisio secret key is not configured' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const amount = Number(body.amount)
    const currency = normalizePlisioCurrency(body.currency)
    const minimumDeposit = getMinimumDepositUsd()

    if (!Number.isFinite(amount) || amount < minimumDeposit) {
      return NextResponse.json({ error: `Minimum deposit amount is $${minimumDeposit}` }, { status: 400 })
    }

    if (!currency) {
      return NextResponse.json({ error: 'Please select a cryptocurrency' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const adminError = await checkSupabaseAdminAccess(admin)
    if (adminError) {
      return NextResponse.json({ error: adminError }, { status: 500 })
    }

    const orderNumber = `VX-${user.id.replace(/-/g, '').slice(0, 12)}-${Date.now()}`
    const callbackBaseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const callbackUrl = `${callbackBaseUrl}/api/plisio/callback`

    const params = new URLSearchParams({
      source_currency: 'USD',
      source_amount: amount.toFixed(2),
      order_number: orderNumber,
      order_name: `Vortex Equality Deposit ${amount.toFixed(2)} USD`,
      description: `Vortex Equality active asset deposit`,
      currency,
      allowed_psys_cids: currency,
      callback_url: callbackUrl,
      success_callback_url: `${callbackBaseUrl}/dashboard/deposit?status=success&provider=plisio`,
      fail_callback_url: `${callbackBaseUrl}/dashboard/deposit?status=failed&provider=plisio`,
      expire_min: '15',
      api_key: secretKey,
    })

    const invoiceResponse = await fetch(`${PLISIO_API_URL}/invoices/new?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    const invoiceData = await invoiceResponse.json()

    if (!invoiceResponse.ok || invoiceData.status !== 'success') {
      console.error('[Plisio] Create invoice error:', invoiceData)
      const plisioMsg = invoiceData.data?.message || invoiceData.message || invoiceData.error
      let userMsg = 'Failed to create payment invoice. Please try again.'
      if (typeof plisioMsg === 'string') {
        try {
          const parsed = JSON.parse(plisioMsg)
          const firstVal = Object.values(parsed)[0]
          if (typeof firstVal === 'string') userMsg = firstVal
        } catch {
          userMsg = plisioMsg
        }
      }
      return NextResponse.json({ error: userMsg }, { status: 400 })
    }

    const invoice = invoiceData.data || {}
    const providerPaymentId = String(invoice.txn_id || invoice.id || orderNumber)
    const payAddress = invoice.wallet_hash || invoice.pay_address || invoice.address || invoice.invoice_url || null
    const payAmount = Number(invoice.amount || invoice.invoice_total_sum || invoice.invoice_sum || 0)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const metadata = {
      provider: 'plisio',
      order_number: orderNumber,
      source_amount: amount,
      source_currency: 'USD',
      currency,
      invoice_url: invoice.invoice_url || null,
      qr_code: invoice.qr_code || null,
      expires_at: expiresAt,
      plisio: invoiceData,
    }

    const { error: orderError } = await admin
      .from('crypto_deposit_orders')
      .upsert(
        {
          user_id: user.id,
          provider: 'plisio',
          provider_payment_id: providerPaymentId,
          coin: currency,
          pay_address: payAddress,
          expected_amount: amount,
          status: 'pending',
          metadata,
        },
        { onConflict: 'provider,provider_payment_id' }
      )

    if (orderError) {
      console.error('[Plisio] Failed to store crypto order:', orderError)
      return NextResponse.json({ error: 'Failed to save deposit order' }, { status: 500 })
    }

    const { error: legacyTxError } = await admin
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_type: 'asset',
        type: 'deposit',
        amount,
        fee: 0,
        net_amount: amount,
        status: 'pending',
        external_ref: providerPaymentId,
        crypto_address: payAddress,
        receipt_data: metadata,
      })

    if (legacyTxError) {
      console.warn('[Plisio] Legacy transaction insert skipped:', legacyTxError.message)
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: providerPaymentId,
        orderNumber,
        address: payAddress,
        invoiceUrl: invoice.invoice_url || null,
        qrCode: invoice.qr_code || null,
        amount: payAmount || amount,
        currency,
        amountUsd: amount,
        expiresAt,
        status: 'waiting',
      },
    })
  } catch (error) {
    console.error('[Plisio] Create invoice error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
