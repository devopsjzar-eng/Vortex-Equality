import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key)
}

function toApiStatus(status: string) {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'rejected'
  return status
}

function fromFilterStatus(status: string) {
  if (status === 'success') return ['completed']
  if (status === 'rejected') return ['cancelled']
  if (status === 'all') return null
  return [status]
}

export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const mappedStatuses = fromFilterStatus(status)

    let query = supabaseAdmin
      .from('financial_withdrawals')
      .select('*')
      .order('created_at', { ascending: false })

    if (mappedStatuses) {
      query = query.in('status', mappedStatuses)
    }

    const { data: withdrawals, error } = await query

    if (error) {
      console.error('Error fetching financial withdrawals:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const userIds = Array.from(new Set((withdrawals || []).map((w) => w.user_id).filter(Boolean)))
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', userIds)
      : { data: [] }
    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]))

    const normalized = (withdrawals || []).map((withdrawal) => {
      const profile = profileById.get(withdrawal.user_id) || null
      return {
        ...withdrawal,
        amount: Number(withdrawal.gross_amount || 0),
        fee: Number(withdrawal.fee_amount || 0),
        net_amount: Number(withdrawal.net_amount || 0),
        status: toApiStatus(withdrawal.status),
        raw_status: withdrawal.status,
        type: 'withdrawal',
        wallet_type: withdrawal.wallet_source || withdrawal.metadata?.wallet_source || 'main',
        wallet_source: withdrawal.wallet_source || withdrawal.metadata?.wallet_source || 'main',
        crypto_address: withdrawal.wallet_address,
        external_ref: withdrawal.provider_payout_id || withdrawal.id,
        admin_notes: withdrawal.metadata?.admin_notes || withdrawal.metadata?.plisio_payout_error || null,
        updated_at: withdrawal.processed_at || withdrawal.created_at,
        profiles: profile,
        profile,
      }
    })

    const pendingWithdrawals = normalized.filter((w) => w.raw_status === 'pending')
    const approvedWithdrawals = normalized.filter((w) => ['completed', 'processing'].includes(w.raw_status))

    const stats = {
      pendingCount: pendingWithdrawals.length,
      pendingAmount: pendingWithdrawals.reduce((sum, w) => sum + (w.net_amount || w.amount || 0), 0),
      approvedCount: approvedWithdrawals.length,
      approvedAmount: approvedWithdrawals.reduce((sum, w) => sum + (w.net_amount || w.amount || 0), 0),
    }

    return NextResponse.json({
      success: true,
      withdrawals: normalized,
      stats,
    })
  } catch (error: any) {
    console.error('Admin withdrawals error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
