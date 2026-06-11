import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tree, error } = await supabase.rpc('get_referral_tree', {
      p_root_user_id: user.id,
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    const rows = tree || []
    const userIds = Array.from(new Set([user.id, ...rows.map((row: any) => row.user_id).filter(Boolean)]))

    const adminClient = getSupabaseAdmin()
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, full_name, email, username, referral_code, rank')
      .in('id', userIds)

    const profileById = new Map((profiles || []).map((profile: any) => [profile.id, profile]))
    const rootProfile = profileById.get(user.id) || null

    const enrichedTree = rows.map((row: any) => {
      const profile = profileById.get(row.user_id) || {}
      return {
        ...row,
        full_name: profile.full_name || (profile.email ? profile.email.split('@')[0] : 'Member'),
        email: profile.email || null,
        username: profile.username || null,
        rank: profile.rank || 'Starter',
      }
    })

    return NextResponse.json({
      success: true,
      rootUserId: user.id,
      profile: rootProfile,
      tree: enrichedTree,
    })
  } catch (error) {
    console.error('Referral tree error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
