import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabaseAdmin = getSupabaseAdmin()
    
    // Cek apakah ada pending reward
    const { data: pendingReward } = await supabaseAdmin
      .from('rank_rewards')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (!pendingReward) {
      return NextResponse.json({ error: 'No pending reward to claim' }, { status: 400 })
    }
    
    // Cek apakah sudah claim bulan ini
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
    
    if (claimedThisMonth) {
      return NextResponse.json({ 
        error: 'You have already claimed your rank reward this month',
        nextClaimDate: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1).toISOString()
      }, { status: 400 })
    }
    
    // Update reward status to claimed
    const { error: updateError } = await supabaseAdmin
      .from('rank_rewards')
      .update({ 
        status: 'claimed', 
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', pendingReward.id)
    
    if (updateError) {
      throw updateError
    }
    
    // Credit ke Bonus Wallet
    const { data: bonusWallet } = await supabaseAdmin
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .eq('wallet_type', 'bonus')
      .single()
    
    if (bonusWallet) {
      await supabaseAdmin
        .from('wallets')
        .update({ 
          balance: parseFloat(bonusWallet.balance) + parseFloat(pendingReward.reward_amount),
          updated_at: new Date().toISOString()
        })
        .eq('id', bonusWallet.id)
    }
    
    // Insert transaction
    const receiptNumber = 'VX-RR-' + Math.random().toString(36).substring(2, 10).toUpperCase()
    
    await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_type: 'bonus',
        type: 'rank_reward',
        amount: pendingReward.reward_amount,
        fee: 0,
        net_amount: pendingReward.reward_amount,
        status: 'success',
        admin_notes: `${pendingReward.rank_name} (${pendingReward.rank_code}) Monthly Reward`,
        external_ref: receiptNumber
      })
    
    // Buat pending reward baru untuk bulan depan
    const nextExpiresAt = new Date()
    nextExpiresAt.setMonth(nextExpiresAt.getMonth() + 1)
    
    await supabaseAdmin
      .from('rank_rewards')
      .insert({
        user_id: user.id,
        rank_code: pendingReward.rank_code,
        rank_name: pendingReward.rank_name,
        reward_amount: pendingReward.reward_amount,
        status: 'pending',
        eligible_at: new Date().toISOString(),
        expires_at: nextExpiresAt.toISOString()
      })
    
    return NextResponse.json({
      success: true,
      message: `Successfully claimed ${pendingReward.rank_name} reward!`,
      amount: parseFloat(pendingReward.reward_amount),
      rank: pendingReward.rank_code,
      receiptNumber
    })
    
  } catch (error) {
    console.error('Error claiming rank reward:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
