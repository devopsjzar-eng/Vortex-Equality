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

    // Fetch deposits from transactions table
    let query = supabaseAdmin
      .from('transactions')
      .select(`
        id,
        user_id,
        amount,
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
      .eq('type', 'deposit')
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: deposits, error } = await query

    if (error) {
      console.error('Error fetching deposits:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate stats
    const allDeposits = deposits || []
    const pendingDeposits = allDeposits.filter(d => d.status === 'pending')
    const successDeposits = allDeposits.filter(d => d.status === 'success')

    const stats = {
      pendingCount: pendingDeposits.length,
      pendingAmount: pendingDeposits.reduce((sum, d) => sum + (d.amount || 0), 0),
      successCount: successDeposits.length,
      successAmount: successDeposits.reduce((sum, d) => sum + (d.amount || 0), 0),
    }

    return NextResponse.json({ 
      deposits: deposits || [],
      stats
    })

  } catch (error: any) {
    console.error('Admin deposits error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
