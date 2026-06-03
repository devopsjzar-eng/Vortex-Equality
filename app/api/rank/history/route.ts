import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabaseAdmin = getSupabaseAdmin()
    
    // Get claimed rewards history
    const { data: rewards, error } = await supabaseAdmin
      .from('rank_rewards')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'claimed')
      .order('claimed_at', { ascending: false })
      .limit(20)
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ rewards: rewards || [] })
    
  } catch (error) {
    console.error('Error fetching rank history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
