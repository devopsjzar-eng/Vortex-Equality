import { NextRequest, NextResponse } from 'next/server'

// Rank salaries are claimed by users through claim_monthly_rank_reward().
// This compatibility route intentionally does not auto-credit rewards because
// auto-payment would bypass the 30-day lock, rank-up unlock, and suspension rules.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    processed: 0,
    totalRewardsPaid: 0,
    message: 'Monthly rank salary is claim-based. No automatic payout was executed.',
  })
}
