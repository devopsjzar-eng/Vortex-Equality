import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key)
}

export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') || 100), 250)

    const [{ data: ledgerEntries, error: ledgerError }, { data: adminLogs, error: adminError }] =
      await Promise.all([
        supabaseAdmin
          .from('ledger_entries')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit),
        supabaseAdmin
          .from('admin_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit),
      ])

    if (ledgerError) {
      return NextResponse.json({ error: ledgerError.message }, { status: 500 })
    }

    if (adminError) {
      return NextResponse.json({ error: adminError.message }, { status: 500 })
    }

    const userIds = Array.from(
      new Set([
        ...(ledgerEntries || []).flatMap((entry) => [entry.user_id, entry.related_user_id, entry.created_by]),
        ...(adminLogs || []).flatMap((entry) => [entry.admin_user_id, entry.target_user_id]),
      ].filter(Boolean))
    )

    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', userIds)
      : { data: [] }
    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]))

    const logs = [
      ...(ledgerEntries || []).map((entry) => ({
        id: `ledger:${entry.id}`,
        source: 'ledger',
        action: entry.entry_type,
        amount: Number(entry.amount || 0),
        description: entry.description,
        metadata: entry.metadata || {},
        created_at: entry.created_at,
        user: entry.user_id ? profileById.get(entry.user_id) || null : null,
        related_user: entry.related_user_id ? profileById.get(entry.related_user_id) || null : null,
        admin_user: entry.created_by ? profileById.get(entry.created_by) || null : null,
      })),
      ...(adminLogs || []).map((entry) => ({
        id: `admin:${entry.id}`,
        source: 'admin',
        action: entry.action,
        amount: null,
        description: entry.action.replace(/_/g, ' '),
        metadata: entry.metadata || {},
        created_at: entry.created_at,
        user: entry.target_user_id ? profileById.get(entry.target_user_id) || null : null,
        related_user: null,
        admin_user: entry.admin_user_id ? profileById.get(entry.admin_user_id) || null : null,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      success: true,
      logs: logs.slice(0, limit),
      stats: {
        ledgerCount: ledgerEntries?.length || 0,
        adminLogCount: adminLogs?.length || 0,
      },
    })
  } catch (error: any) {
    console.error('Admin logs error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
