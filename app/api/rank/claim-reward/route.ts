import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('claim_monthly_rank_reward')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully claimed ${data.rankName} salary.`,
      amount: Number(data.amount || 0),
      rank: data.rank,
      rankName: data.rankName,
      claimId: data.claimId,
      nextClaimAvailableAt: data.nextClaimAvailableAt,
    })
  } catch (error) {
    console.error('Error claiming rank reward:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
