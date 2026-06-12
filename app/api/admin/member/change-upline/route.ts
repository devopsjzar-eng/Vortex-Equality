import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/require-admin'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Collect all descendant IDs of a user to prevent circular references
async function getDescendantIds(supabase: any, userId: string): Promise<Set<string>> {
  const result = new Set<string>()
  const queue = [userId]
  while (queue.length > 0) {
    const current = queue.shift()!
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('referred_by', current)
    for (const row of data || []) {
      if (!result.has(row.id)) {
        result.add(row.id)
        queue.push(row.id)
      }
    }
  }
  return result
}

// Recalculate group_turnover + total_direct_referrals for a user and their upline chain
async function recalcChain(supabase: any, startUserId: string) {
  let currentId: string | null = startUserId
  while (currentId) {
    const { data: directRefs } = await supabase
      .from('profiles')
      .select('id, total_deposit')
      .eq('referred_by', currentId)

    const directCount = (directRefs || []).length

    // Recursive group turnover: sum of all descendant deposits
    const descendants = await getDescendantIds(supabase, currentId)
    let groupTurnover = 0
    if (descendants.size > 0) {
      const { data: depProfiles } = await supabase
        .from('profiles')
        .select('total_deposit')
        .in('id', Array.from(descendants))
      groupTurnover = (depProfiles || []).reduce(
        (sum: number, p: any) => sum + Number(p.total_deposit || 0),
        0
      )
    }

    await supabase
      .from('profiles')
      .update({
        total_direct_referrals: directCount,
        group_turnover: groupTurnover,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentId)

    // Move up chain
    const { data: parentRow } = await supabase
      .from('profiles')
      .select('referred_by')
      .eq('id', currentId)
      .single()
    currentId = (parentRow as { referred_by: string | null } | null)?.referred_by || null
  }
}

export async function POST(request: Request) {
  const { errorResponse, adminUser } = await requireAdmin()
  if (errorResponse) return errorResponse

  try {
    const { userId, newUplineId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Fetch user being moved
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name, referred_by')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const oldUplineId = user.referred_by

    // newUplineId null = remove from any upline (make root member)
    if (newUplineId) {
      if (newUplineId === userId) {
        return NextResponse.json({ error: 'User cannot be their own upline' }, { status: 400 })
      }

      // Verify new upline exists
      const { data: newUpline, error: uplineError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', newUplineId)
        .single()

      if (uplineError || !newUpline) {
        return NextResponse.json({ error: 'New upline user not found' }, { status: 404 })
      }

      // Prevent circular reference: newUplineId must not be in userId's downline
      const descendants = await getDescendantIds(supabase, userId)
      if (descendants.has(newUplineId)) {
        return NextResponse.json(
          { error: 'Cannot set a downline member as the upline — circular reference' },
          { status: 400 }
        )
      }
    }

    // Update profiles.referred_by
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ referred_by: newUplineId || null, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update referral_edges — this is what get_referral_tree actually reads
    if (newUplineId) {
      // Upsert the edge: userId is now sponsored by newUplineId
      const { error: edgeError } = await supabase
        .from('referral_edges')
        .upsert({ user_id: userId, sponsor_id: newUplineId }, { onConflict: 'user_id' })
      if (edgeError) {
        console.error('[change-upline] referral_edges upsert failed:', edgeError.message)
        return NextResponse.json({ error: edgeError.message }, { status: 500 })
      }
    } else {
      // Removing upline — delete the edge entirely
      await supabase.from('referral_edges').delete().eq('user_id', userId)
    }

    // Recalculate stats for old upline chain
    if (oldUplineId) {
      await recalcChain(supabase, oldUplineId)
    }

    // Recalculate stats for new upline chain
    if (newUplineId) {
      await recalcChain(supabase, newUplineId)
    }

    // Log the action
    await supabase.from('admin_logs').insert({
      action: 'upline_shifted',
      admin_user_id: adminUser!.id,
      target_user_id: userId,
      metadata: {
        user_email: user.email,
        old_upline_id: oldUplineId,
        new_upline_id: newUplineId || null,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Upline updated successfully for ${user.email}`,
      oldUplineId,
      newUplineId: newUplineId || null,
    })
  } catch (error: any) {
    console.error('[change-upline]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
