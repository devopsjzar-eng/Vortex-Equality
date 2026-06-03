import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { transactionId } = await request.json()

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
    }

    // Get transaction details first to verify it exists and is pending
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .single()

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Pending deposit not found' }, { status: 404 })
    }

    // DELETE transaction record - no history will remain for member
    const { error: deleteError } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('id', transactionId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Deposit rejected and removed from history',
      amount: transaction.amount
    })

  } catch (error: any) {
    console.error('Admin deposit reject error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
