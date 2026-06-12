import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get('paymentId')
  if (!paymentId) {
    return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: order } = await admin
    .from('crypto_deposit_orders')
    .select('status, confirmed_amount, expected_amount, user_id')
    .eq('provider', 'plisio')
    .eq('provider_payment_id', paymentId)
    .maybeSingle()

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ status: 'unknown' })
  }

  return NextResponse.json({
    status: order.status,
    amount: order.confirmed_amount || order.expected_amount,
  })
}
