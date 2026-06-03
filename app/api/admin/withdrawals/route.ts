import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service role to bypass RLS
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    // Fetch withdrawals from transactions table
    let query = supabaseAdmin
      .from('transactions')
      .select(`
        id,
        user_id,
        amount,
        fee,
        net_amount,
        status,
        type,
        wallet_type,
        crypto_address,
        external_ref,
        receipt_data,
        admin_notes,
        created_at,
        updated_at,
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .eq('type', 'withdrawal')
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: withdrawals, error } = await query

    if (error) {
      console.error('Error fetching withdrawals:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate stats
    const allWithdrawals = withdrawals || []
    const pendingWithdrawals = allWithdrawals.filter(w => w.status === 'pending')
    const approvedWithdrawals = allWithdrawals.filter(w => w.status === 'success' || w.status === 'approved')

    const stats = {
      pendingCount: pendingWithdrawals.length,
      pendingAmount: pendingWithdrawals.reduce((sum, w) => sum + (w.net_amount || w.amount || 0), 0),
      approvedCount: approvedWithdrawals.length,
      approvedAmount: approvedWithdrawals.reduce((sum, w) => sum + (w.net_amount || w.amount || 0), 0),
    }

    return NextResponse.json({ 
      withdrawals: withdrawals || [],
      stats
    })

  } catch (error: any) {
    console.error('Admin withdrawals error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
