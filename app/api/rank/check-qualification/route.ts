import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Fungsi untuk menghitung omset grup (semua downline)
async function calculateGroupOmset(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, userId: string, visited: Set<string> = new Set()): Promise<number> {
  if (visited.has(userId)) return 0
  visited.add(userId)
  
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('total_deposit')
    .eq('id', userId)
    .single()
  
  let total = parseFloat(profile?.total_deposit || '0')
  
  const { data: downlines } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('referred_by', userId)
  
  if (downlines) {
    for (const downline of downlines) {
      total += await calculateGroupOmset(supabaseAdmin, downline.id, visited)
    }
  }
  
  return total
}

// Fungsi untuk menghitung omset per jalur (per direct downline)
async function calculateLegOmsets(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, userId: string): Promise<number[]> {
  const { data: directDownlines } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('referred_by', userId)
  
  if (!directDownlines || directDownlines.length === 0) return []
  
  const legOmsets: number[] = []
  
  for (const direct of directDownlines) {
    const omset = await calculateGroupOmset(supabaseAdmin, direct.id)
    legOmsets.push(omset)
  }
  
  return legOmsets.sort((a, b) => b - a)
}

// Fungsi untuk cek kualifikasi rank
async function checkRankQualification(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, total_deposit, rank')
    .eq('id', userId)
    .single()
  
  if (!profile) return null
  
  const { data: wallet } = await supabaseAdmin
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .eq('wallet_type', 'asset')
    .single()
  
  const personalAsset = parseFloat(wallet?.balance || '0')
  
  const { count: directCount } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', userId)
  
  const legOmsets = await calculateLegOmsets(supabaseAdmin, userId)
  
  let groupOmset = 0
  for (const omset of legOmsets) {
    groupOmset += omset
  }
  
  const { data: rankConfigs } = await supabaseAdmin
    .from('rank_config')
    .select('*')
    .order('reward_amount', { ascending: false })
  
  if (!rankConfigs) return null
  
  let qualifiedRank = null
  
  for (const config of rankConfigs) {
    let qualified = true
    
    if (personalAsset < parseFloat(config.personal_asset)) {
      qualified = false
    }
    
    if (groupOmset < parseFloat(config.group_amount)) {
      qualified = false
    }
    
    if (config.direct_required > 0 && (directCount || 0) < config.direct_required) {
      qualified = false
    }
    
    if (config.min_legs > 0) {
      const qualifiedLegs = legOmsets.filter(omset => omset >= parseFloat(config.leg_amount)).length
      if (qualifiedLegs < config.min_legs) {
        qualified = false
      }
    }
    
    if (qualified) {
      qualifiedRank = config
      break
    }
  }
  
  return {
    userId,
    fullName: profile.full_name,
    currentRank: profile.rank,
    personalAsset,
    directCount: directCount || 0,
    groupOmset,
    legOmsets: legOmsets.slice(0, 5),
    qualifiedRank: qualifiedRank ? {
      code: qualifiedRank.rank_code,
      name: qualifiedRank.rank_name,
      reward: parseFloat(qualifiedRank.reward_amount)
    } : null
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabaseAdmin = getSupabaseAdmin()
    
    const qualification = await checkRankQualification(supabaseAdmin, user.id)
    
    if (!qualification) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    const { data: pendingReward } = await supabaseAdmin
      .from('rank_rewards')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const { data: claimedThisMonth } = await supabaseAdmin
      .from('rank_rewards')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'claimed')
      .gte('claimed_at', startOfMonth.toISOString())
      .maybeSingle()
    
    let newRankAvailable = false
    if (qualification.qualifiedRank) {
      const rankOrder = ['Bronze', 'P1', 'P2', 'P3', 'P4', 'P5']
      const currentIdx = rankOrder.indexOf(qualification.currentRank || 'Bronze')
      const qualifiedIdx = rankOrder.indexOf(qualification.qualifiedRank.code)
      
      if (qualifiedIdx > currentIdx) {
        newRankAvailable = true
        
        if (!pendingReward || pendingReward.rank_code !== qualification.qualifiedRank.code) {
          if (pendingReward) {
            await supabaseAdmin
              .from('rank_rewards')
              .update({ status: 'expired', updated_at: new Date().toISOString() })
              .eq('id', pendingReward.id)
          }
          
          const expiresAt = new Date()
          expiresAt.setMonth(expiresAt.getMonth() + 1)
          
          await supabaseAdmin
            .from('rank_rewards')
            .insert({
              user_id: user.id,
              rank_code: qualification.qualifiedRank.code,
              rank_name: qualification.qualifiedRank.name,
              reward_amount: qualification.qualifiedRank.reward,
              status: 'pending',
              eligible_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString()
            })
          
          await supabaseAdmin
            .from('profiles')
            .update({ rank: qualification.qualifiedRank.code, updated_at: new Date().toISOString() })
            .eq('id', user.id)
        }
      }
    }
    
    const { data: currentPendingReward } = await supabaseAdmin
      .from('rank_rewards')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    const canClaim = currentPendingReward && !claimedThisMonth
    
    return NextResponse.json({
      ...qualification,
      pendingReward: currentPendingReward,
      claimedThisMonth: claimedThisMonth || null,
      canClaim,
      newRankAvailable
    })
    
  } catch (error) {
    console.error('Error checking rank qualification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
