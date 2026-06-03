import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This cron job runs at midnight WIB (00:00 = 17:00 UTC) to expire unclaimed profits
// Vercel Cron: 0 17 * * *

function getSupabaseAdmin() { return createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
) }

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const now = new Date()
    
    // Expire ALL 'available' profits (karena cron ini jalan jam 00:00 WIB)
    // Semua profit yang belum diklaim hari ini akan expired
    const { data, error } = await supabaseAdmin
      .from('profit_claims')
      .update({ 
        status: 'expired'
      })
      .eq('status', 'available')
      .select('id')

    if (error) throw error

    const expiredCount = data?.length || 0

    // Log for tracking
    console.log(`[Cron] Expired ${expiredCount} unclaimed profits at ${now.toISOString()}`)

    return NextResponse.json({
      success: true,
      message: `Expired ${expiredCount} unclaimed profits at midnight WIB`,
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error('Error expiring profits:', error)
    return NextResponse.json({ error: 'Failed to expire profits' }, { status: 500 })
  }
}
