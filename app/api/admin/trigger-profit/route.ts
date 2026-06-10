import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'

async function triggerProfit(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const supabase = await createClient()

  const body: { percentage?: number | string; runDate?: string } =
    request.method === 'POST' ? await request.json().catch(() => ({})) : {}
  const url = new URL(request.url)
  const rawPercentage = body.percentage ?? url.searchParams.get('percentage')
  const percentage = Number(rawPercentage)
  const runDate = body.runDate || url.searchParams.get('runDate') || new Date().toISOString().split('T')[0]

  if (!Number.isFinite(percentage) || percentage < 1 || percentage > 2) {
    return NextResponse.json(
      { success: false, error: 'Daily profit percentage must be between 1% and 2%.' },
      { status: 400 },
    )
  }

  const { data: profitRunId, error } = await supabase.rpc('trigger_daily_profit', {
    p_percentage: percentage,
    p_run_date: runDate,
  })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    message: 'Daily profit triggered successfully.',
    profitRunId,
    percentage,
    runDate,
  })
}

export async function POST(request: NextRequest) {
  return triggerProfit(request)
}

export async function GET(request: NextRequest) {
  return triggerProfit(request)
}
