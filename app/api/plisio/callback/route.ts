import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mapLegacyDepositStatus, mapPlisioStatus, verifyPlisioCallback } from '@/lib/plisio'
import { sendAdminDepositNotification } from '@/lib/email'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase admin credentials are not configured')
  }

  return createClient(url, key)
}

async function parseCallbackPayload(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''
  console.log('[Plisio DEBUG] Content-Type:', contentType)

  if (contentType.includes('application/json')) {
    const text = await request.text()
    console.log('[Plisio DEBUG] Raw JSON body:', text.slice(0, 2000))
    const json = JSON.parse(text)
    const payload = (json.data && typeof json.data === 'object') ? json.data : json
    console.log('[Plisio DEBUG] Parsed JSON payload keys:', Object.keys(payload))
    console.log('[Plisio DEBUG] Payload types:', Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, typeof v])))
    return payload
  }

  const text = await request.text()
  console.log('[Plisio DEBUG] Raw form body:', text.slice(0, 2000))
  const payload = Object.fromEntries(new URLSearchParams(text).entries())
  console.log('[Plisio DEBUG] Parsed form payload keys:', Object.keys(payload))
  return payload
}

async function upsertLegacyTransaction(params: {
  userId: string
  paymentId: string
  amount: number
  legacyStatus: string
  payAddress: string | null
  receiptData: Record<string, unknown>
}) {
  const supabaseAdmin = getSupabaseAdmin()

  const { data: existingTx } = await supabaseAdmin
    .from('transactions')
    .select('id')
    .eq('user_id', params.userId)
    .eq('external_ref', params.paymentId)
    .eq('type', 'deposit')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingTx) {
    const { error } = await supabaseAdmin
      .from('transactions')
      .update({
        status: params.legacyStatus,
        receipt_data: params.receiptData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingTx.id)

    if (error) console.warn('[Plisio] Legacy transaction update skipped:', error.message)
    return
  }

  const { error } = await supabaseAdmin.from('transactions').insert({
    user_id: params.userId,
    wallet_type: 'asset',
    type: 'deposit',
    amount: params.amount,
    fee: 0,
    net_amount: params.amount,
    status: params.legacyStatus,
    external_ref: params.paymentId,
    crypto_address: params.payAddress,
    receipt_data: params.receiptData,
  })

  if (error) console.warn('[Plisio] Legacy transaction insert skipped:', error.message)
}

async function notifyAdmin(userId: string, amount: number, currency: string | null) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: userProfile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .maybeSingle()

  if (!userProfile) return

  sendAdminDepositNotification(
    userProfile.full_name || 'Unknown',
    userProfile.email || '',
    amount,
    `${currency || 'Crypto'} via Plisio`
  ).catch((error) => console.error('[Plisio] Email notification failed:', error))
}

export async function GET() {
  return NextResponse.json({ success: true })
}

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.PLISIO_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: 'Plisio secret key is not configured' }, { status: 500 })
    }

    const body = await parseCallbackPayload(request) as Record<string, unknown>

    if (!verifyPlisioCallback(body, secretKey)) {
      console.error('[Plisio] Invalid callback verify_hash')
      return NextResponse.json({ error: 'Invalid callback signature' }, { status: 401 })
    }

    const paymentId = String(body.txn_id || body.id || body.invoice_id || '')
    const orderNumber = String(body.order_number || '')
    const plisioStatus = String(body.status || 'pending')
    const cryptoStatus = mapPlisioStatus(plisioStatus)
    const legacyStatus = mapLegacyDepositStatus(plisioStatus)
    const sourceAmount = Number(body.source_amount || body.amount || body.invoice_total_sum || 0)
    const confirmedAmount = Number(body.amount || body.invoice_sum || body.invoice_total_sum || 0)
    const payAddress = body.wallet_hash ? String(body.wallet_hash) : null
    const currency = body.currency ? String(body.currency) : body.psys_cid ? String(body.psys_cid) : null

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing Plisio transaction id' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: existingOrder } = await supabaseAdmin
      .from('crypto_deposit_orders')
      .select('*')
      .eq('provider', 'plisio')
      .eq('provider_payment_id', paymentId)
      .maybeSingle()

    if (!existingOrder) {
      return NextResponse.json({ error: 'Unknown Plisio invoice' }, { status: 404 })
    }

    const amount = Number(existingOrder.expected_amount || sourceAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 })
    }

    if (existingOrder.status === 'confirmed') {
      await upsertLegacyTransaction({
        userId: existingOrder.user_id,
        paymentId,
        amount,
        legacyStatus: 'success',
        payAddress,
        receiptData: body,
      })

      return NextResponse.json({ success: true, message: 'Already processed' })
    }

    const receiptData = {
      ...body,
      normalized_status: cryptoStatus,
      legacy_status: legacyStatus,
      received_at: new Date().toISOString(),
    }

    const { error: orderError } = await supabaseAdmin
      .from('crypto_deposit_orders')
      .update({
        coin: String(currency || existingOrder.coin || 'crypto').toUpperCase(),
        pay_address: payAddress || existingOrder.pay_address,
        confirmed_amount: confirmedAmount || null,
        status: cryptoStatus,
        confirmed_at: cryptoStatus === 'confirmed' ? new Date().toISOString() : existingOrder.confirmed_at,
        metadata: {
          ...(existingOrder.metadata || {}),
          order_number: orderNumber || existingOrder.metadata?.order_number,
          callback: receiptData,
        },
      })
      .eq('id', existingOrder.id)

    if (orderError) {
      console.error('[Plisio] Failed to update deposit order:', orderError)
      return NextResponse.json({ error: 'Failed to update deposit order' }, { status: 500 })
    }

    await upsertLegacyTransaction({
      userId: existingOrder.user_id,
      paymentId,
      amount,
      legacyStatus,
      payAddress,
      receiptData,
    })

    if (cryptoStatus === 'confirmed') {
      const { error: topUpError } = await supabaseAdmin.rpc('apply_user_top_up', {
        p_user_id: existingOrder.user_id,
        p_amount: amount,
        p_source: 'plisio',
        p_external_id: paymentId,
        p_metadata: receiptData,
        p_referral_commission_percentage: 8,
      })

      if (topUpError) {
        console.error('[Plisio] Failed to apply top-up:', topUpError)
        return NextResponse.json({ error: topUpError.message }, { status: 500 })
      }

      await notifyAdmin(existingOrder.user_id, amount, currency)
    }

    return NextResponse.json({ success: true, status: cryptoStatus })
  } catch (error) {
    console.error('[Plisio] Callback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
