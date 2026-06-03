import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * RECONCILIATION ENDPOINT
 * Syncs profile.total_deposit with actual successful deposits from transactions
 * This ensures data integrity and fixes any out-of-sync issues
 * 
 * Should be called:
 * - On member profile load (one-time check)
 * - Via cron job periodically
 * - After successful deposit confirmation
 */
export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  
  try {
    const body = await request.json()
    const userId = body?.userId

    if (!userId) {
      return NextResponse.json({ 
        error: 'Missing userId' 
      }, { status: 400 })
    }

    console.log('[Reconciliation] Starting for user:', userId)

    // Get profile current state
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, total_deposit')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ 
        error: 'Profile not found' 
      }, { status: 404 })
    }

    // Calculate ACTUAL total_deposit from successful transactions
    const { data: deposits, error: depositsError } = await supabaseAdmin
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'deposit')
      .eq('status', 'success')

    if (depositsError) {
      console.error('[Reconciliation] Error fetching deposits:', depositsError)
      return NextResponse.json({ 
        error: 'Failed to fetch deposit data' 
      }, { status: 500 })
    }

    const actualTotalDeposit = deposits?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
    const profileTotalDeposit = Number(profile.total_deposit || 0)
    const isOutOfSync = Math.abs(actualTotalDeposit - profileTotalDeposit) > 0.01 // Allow 0.01 cent difference

    console.log('[Reconciliation] Profile deposit:', profileTotalDeposit, 'Actual:', actualTotalDeposit, 'OutOfSync:', isOutOfSync)

    if (isOutOfSync) {
      // SYNC THE DATA
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          total_deposit: actualTotalDeposit,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        console.error('[Reconciliation] Error updating profile:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update profile' 
        }, { status: 500 })
      }

      console.log('[Reconciliation] SYNCED - Updated from $' + profileTotalDeposit + ' to $' + actualTotalDeposit)

      return NextResponse.json({
        success: true,
        message: 'Data synced successfully',
        before: profileTotalDeposit,
        after: actualTotalDeposit,
        wasOutOfSync: true
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Data already in sync',
      totalDeposit: actualTotalDeposit,
      wasOutOfSync: false
    })

  } catch (error) {
    console.error('[Reconciliation] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * CRON JOB ENDPOINT - Reconcile ALL members (run periodically)
 * Keeps entire system in sync
 */
export async function GET(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    // Only allow from Vercel cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Reconciliation Cron] Starting full system reconciliation')

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('is_admin', false)

    if (profilesError || !profiles) {
      return NextResponse.json({ 
        error: 'Failed to fetch profiles' 
      }, { status: 500 })
    }

    let syncedCount = 0
    let skippedCount = 0

    // Reconcile each member
    for (const profile of profiles) {
      const { data: deposits } = await supabaseAdmin
        .from('transactions')
        .select('amount')
        .eq('user_id', profile.id)
        .eq('type', 'deposit')
        .eq('status', 'success')

      const actualDeposit = deposits?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0

      const { data: currentProfile } = await supabaseAdmin
        .from('profiles')
        .select('total_deposit')
        .eq('id', profile.id)
        .single()

      const isOutOfSync = currentProfile && 
        Math.abs(actualDeposit - Number(currentProfile.total_deposit || 0)) > 0.01

      if (isOutOfSync) {
        await supabaseAdmin
          .from('profiles')
          .update({ total_deposit: actualDeposit })
          .eq('id', profile.id)
        
        syncedCount++
      } else {
        skippedCount++
      }
    }

    console.log('[Reconciliation Cron] Complete - Synced:', syncedCount, 'Skipped:', skippedCount)

    return NextResponse.json({
      success: true,
      message: 'Full reconciliation complete',
      synced: syncedCount,
      skipped: skippedCount,
      total: profiles.length
    })

  } catch (error) {
    console.error('[Reconciliation Cron] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
