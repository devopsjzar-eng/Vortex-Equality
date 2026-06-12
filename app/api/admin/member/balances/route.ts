import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/require-admin'

export async function GET() {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('financial_wallets')
    .select('user_id, active_deposit, network_bonus_balance')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ balances: data || [] })
}
