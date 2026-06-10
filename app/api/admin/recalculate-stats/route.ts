import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/require-admin'

// Service role client - bypasses ALL RLS
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Helper function to calculate group turnover recursively
async function calculateGroupTurnover(supabase: any, userId: string): Promise<number> {
  const { data: directReferrals } = await supabase
    .from('profiles')
    .select('id, total_deposit')
    .eq('referred_by', userId)

  if (!directReferrals || directReferrals.length === 0) return 0

  let totalTurnover = 0

  for (const referral of directReferrals) {
    totalTurnover += Number(referral.total_deposit) || 0
    const downlineTurnover = await calculateGroupTurnover(supabase, referral.id)
    totalTurnover += downlineTurnover
  }

  return totalTurnover
}

export async function POST(request: Request) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  try {
    const supabaseAdmin = getSupabaseAdmin()

    // Get all profiles
    const { data: allProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, total_direct_referrals, group_turnover')
      .order('created_at', { ascending: true })

    if (profilesError) throw profilesError

    const updates: any[] = []
    const results: any[] = []

    for (const profile of allProfiles || []) {
      // Count actual direct referrals
      const { count: actualDirectReferrals } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', profile.id)

      // Calculate actual group turnover
      const actualGroupTurnover = await calculateGroupTurnover(supabaseAdmin, profile.id)

      const storedDirect = profile.total_direct_referrals || 0
      const storedTurnover = Number(profile.group_turnover) || 0
      const actualDirect = actualDirectReferrals || 0

      // Check if update needed
      const needsUpdate = storedDirect !== actualDirect || Math.abs(storedTurnover - actualGroupTurnover) > 0.01

      if (needsUpdate) {
        // Update profile
        await supabaseAdmin
          .from('profiles')
          .update({
            total_direct_referrals: actualDirect,
            group_turnover: actualGroupTurnover,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id)

        results.push({
          name: profile.full_name,
          email: profile.email,
          changes: {
            direct_referrals: { old: storedDirect, new: actualDirect },
            group_turnover: { old: storedTurnover, new: actualGroupTurnover },
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Recalculated stats for ${results.length} profiles`,
      totalProfiles: allProfiles?.length || 0,
      updatedProfiles: results.length,
      updates: results,
    })

  } catch (error: any) {
    console.error('[Admin] Recalculate stats error:', error.message)
    return NextResponse.json(
      { error: 'Failed to recalculate stats' },
      { status: 500 }
    )
  }
}
