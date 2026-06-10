import { NextResponse } from 'next/server'

// Removed: Bitget integration was replaced by Plisio-only payout flow.
export async function GET() {
  return NextResponse.json({ error: 'This endpoint has been removed. Payouts are handled via Plisio.' }, { status: 410 })
}
