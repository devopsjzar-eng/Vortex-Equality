import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key)
}

export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    const includePending = status === 'pending' || status === 'all'
    const includeSuccess = status === 'success' || status === 'all'
    const deposits: any[] = []

    if (includePending) {
      const { data: orders, error: ordersError } = await supabaseAdmin
        .from('crypto_deposit_orders')
        .select('*')
        .in('status', ['pending', 'confirming'])
        .order('created_at', { ascending: false })

      if (ordersError) {
        return NextResponse.json({ error: ordersError.message }, { status: 500 })
      }

      deposits.push(
        ...(orders || []).map((order) => ({
          id: order.id,
          user_id: order.user_id,
          amount: Number(order.expected_amount || 0),
          status: 'pending',
          raw_status: order.status,
          type: 'deposit',
          wallet_type: 'active_deposit',
          crypto_address: order.pay_address,
          external_ref: order.provider_payment_id,
          receipt_data: order.metadata,
          admin_notes: null,
          created_at: order.created_at,
          updated_at: order.confirmed_at || order.created_at,
          source_table: 'crypto_deposit_orders',
        }))
      )
    }

    if (includeSuccess) {
      const { data: financialDeposits, error: depositsError } = await supabaseAdmin
        .from('financial_deposits')
        .select('*')
        .order('created_at', { ascending: false })

      if (depositsError) {
        return NextResponse.json({ error: depositsError.message }, { status: 500 })
      }

      deposits.push(
        ...(financialDeposits || []).map((deposit) => ({
          id: deposit.id,
          user_id: deposit.user_id,
          amount: Number(deposit.amount || 0),
          status: 'success',
          raw_status: deposit.status,
          type: 'deposit',
          wallet_type: 'active_deposit',
          crypto_address: null,
          external_ref: deposit.external_id,
          receipt_data: deposit.metadata,
          admin_notes: null,
          created_at: deposit.created_at,
          updated_at: deposit.confirmed_at || deposit.created_at,
          source_table: 'financial_deposits',
        }))
      )
    }

    deposits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const userIds = Array.from(new Set(deposits.map((deposit) => deposit.user_id).filter(Boolean)))
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', userIds)
      : { data: [] }
    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]))

    const normalized = deposits.map((deposit) => {
      const profile = profileById.get(deposit.user_id) || null
      return {
        ...deposit,
        profiles: profile,
        profile,
      }
    })

    const pendingDeposits = normalized.filter((deposit) => deposit.status === 'pending')
    const successDeposits = normalized.filter((deposit) => deposit.status === 'success')

    const stats = {
      pendingCount: pendingDeposits.length,
      pendingAmount: pendingDeposits.reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0),
      successCount: successDeposits.length,
      successAmount: successDeposits.reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0),
    }

    return NextResponse.json({
      success: true,
      deposits: normalized,
      stats,
    })
  } catch (error: any) {
    console.error('Admin deposits error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
