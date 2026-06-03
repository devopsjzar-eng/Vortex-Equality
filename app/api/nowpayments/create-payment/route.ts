import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { amount, currency } = body
    
    // Validate input
    if (!amount || amount < 50) {
      return NextResponse.json(
        { error: 'Minimum deposit amount is $50' },
        { status: 400 }
      )
    }
    
    if (!currency) {
      return NextResponse.json(
        { error: 'Please select a cryptocurrency' },
        { status: 400 }
      )
    }
    
    // Generate unique order ID
    const orderId = `${user.id}_${Date.now()}`
    
    // Create payment with NOWPayments
    const paymentResponse = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: 'usd',
        pay_currency: currency,
        order_id: orderId,
        order_description: `Vortex Equality Deposit - ${amount} USD`,
        ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://vortexequality.com'}/api/nowpayments/ipn`,
      }),
    })
    
    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json()
      console.error('[Create Payment] NOWPayments error:', errorData)
      return NextResponse.json(
        { error: errorData.message || 'Failed to create payment' },
        { status: 400 }
      )
    }
    
    const paymentData = await paymentResponse.json()
    
    // Create pending transaction in database
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_type: 'asset',
        type: 'deposit',
        amount: amount,
        fee: 0,
        net_amount: amount,
        status: 'pending',
        external_ref: paymentData.payment_id.toString(),
        crypto_address: paymentData.pay_address,
        receipt_data: {
          payment_id: paymentData.payment_id,
          pay_address: paymentData.pay_address,
          pay_amount: paymentData.pay_amount,
          pay_currency: currency,
          order_id: orderId,
        },
      })
    
    if (txError) {
      console.error('[Create Payment] Database error:', txError.message)
      return NextResponse.json(
        { error: 'Failed to save transaction: ' + txError.message },
        { status: 500 }
      )
    }
    
    // Return payment details to frontend
    return NextResponse.json({
      success: true,
      payment: {
        id: paymentData.payment_id,
        address: paymentData.pay_address,
        amount: paymentData.pay_amount,
        currency: paymentData.pay_currency.toUpperCase(),
        amountUsd: amount,
        expiresAt: paymentData.valid_until,
        status: 'waiting',
      },
    })
    
  } catch (error) {
    console.error('[Create Payment] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get payment status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('payment_id')
    
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID required' }, { status: 400 })
    }
    
    // Get payment status from NOWPayments
    const statusResponse = await fetch(`${NOWPAYMENTS_API_URL}/payment/${paymentId}`, {
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      },
    })
    
    if (!statusResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get payment status' },
        { status: 400 }
      )
    }
    
    const statusData = await statusResponse.json()
    
    return NextResponse.json({
      success: true,
      status: statusData.payment_status,
      actually_paid: statusData.actually_paid,
      pay_amount: statusData.pay_amount,
    })
    
  } catch (error) {
    console.error('[Payment Status] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
