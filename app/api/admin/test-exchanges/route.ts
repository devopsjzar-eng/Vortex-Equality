import { NextResponse } from 'next/server'

// Removed: Exchange connectivity tests were part of the old auto-withdrawal flow.
// All payouts now go through the Plisio API exclusively.
export async function GET() {
  return NextResponse.json({ error: 'This endpoint has been removed. Payouts are handled via Plisio.' }, { status: 410 })
}
