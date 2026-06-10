import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('get_rank_progress', {
      p_user_id: user.id,
    })

    if (error) {
      throw error
    }

    const progress = data || {}
    const qualifiedRank = progress.qualifiedRank || null
    const canClaim = Boolean(progress.canClaim)

    return NextResponse.json({
      ...progress,
      userId: progress.userId || user.id,
      fullName: '',
      currentRank: progress.currentRank || 'Bronze',
      personalAsset: Number(progress.personalAsset || 0),
      directCount: Number(progress.directCount || 0),
      groupOmset: Number(progress.groupOmset || progress.groupVolume || 0),
      groupVolume: Number(progress.groupVolume || progress.groupOmset || 0),
      legOmsets: progress.legOmsets || [],
      legVolumes: progress.legVolumes || [],
      qualifiedRank,
      pendingReward: canClaim && qualifiedRank?.code !== 'Bronze'
        ? {
            id: 'available',
            rank_code: qualifiedRank.code,
            rank_name: qualifiedRank.name,
            reward_amount: String(qualifiedRank.reward),
            status: 'available',
            eligible_at: new Date().toISOString(),
            expires_at: progress.nextClaimAvailableAt || null,
          }
        : null,
      claimedThisMonth: null,
      canClaim,
      newRankAvailable: Boolean(progress.isRankUpgrade),
    })
  } catch (error) {
    console.error('Error checking rank qualification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
