import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key)
}

function mapFilterStatus(status: string) {
  if (status === 'success') return ['completed']
  if (status === 'rejected') return ['cancelled']
  if (status === 'all') return null
  return [status]
}

function toLegacyStatus(status: string) {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'rejected'
  return status
}

export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const mappedStatuses = mapFilterStatus(status)

    let query = supabaseAdmin
      .from('financial_withdrawals')
      .select('*')
      .order('created_at', { ascending: false })

    if (mappedStatuses) {
      query = query.in('status', mappedStatuses)
    }

    const { data: withdrawals, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const transactions = (withdrawals || []).map((withdrawal) => ({
      id: withdrawal.id,
      user_id: withdrawal.user_id,
      amount: Number(withdrawal.gross_amount || 0),
      fee: Number(withdrawal.fee_amount || 0),
      net_amount: Number(withdrawal.net_amount || 0),
      status: toLegacyStatus(withdrawal.status),
      raw_status: withdrawal.status,
      type: 'withdrawal',
      wallet_type: withdrawal.wallet_source || withdrawal.metadata?.wallet_source || 'main',
      wallet_source: withdrawal.wallet_source || withdrawal.metadata?.wallet_source || 'main',
      crypto_address: withdrawal.wallet_address,
      external_ref: withdrawal.provider_payout_id || withdrawal.id,
      receipt_data: withdrawal.metadata,
      admin_notes: withdrawal.metadata?.admin_notes || null,
      created_at: withdrawal.created_at,
      updated_at: withdrawal.processed_at || withdrawal.created_at,
    }))

    return NextResponse.json({
      success: true,
      transactions,
      withdrawals: transactions,
    })
  } catch (error: any) {
    console.error('Admin withdrawal compatibility error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  try {
    const body = await request.json()
    const action = body.action

    if (action === 'approve') {
      const response = await fetch(new URL('/api/admin/withdrawal/approve', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: body.transactionId,
          adminNotes: body.adminNotes,
        }),
      })
      return NextResponse.json(await response.json(), { status: response.status })
    }

    if (action === 'reject') {
      const response = await fetch(new URL('/api/admin/withdrawal/reject', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: body.transactionId,
          adminNotes: body.adminNotes,
        }),
      })
      return NextResponse.json(await response.json(), { status: response.status })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
