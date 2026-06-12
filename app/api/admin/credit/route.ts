import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'

export async function GET(request: Request) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const supabaseAdmin = getSupabaseAdmin()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')

  if (!search) {
    const { data, error } = await supabaseAdmin
      .from('financial_deposits')
      .select('id, user_id, amount_usd, source, created_at, profiles:user_id(full_name, email)')
      .eq('source', 'admin_credit')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ results: data })
  }

  const searchQuery = `%${search}%`
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name')
    .or(`email.ilike.${searchQuery},full_name.ilike.${searchQuery}`)
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ results: data })
}

export async function POST(request: Request) {
  const { adminUser, errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { userId, walletType, amount, reason, transferType = 'direct' } = await request.json()

    if (!userId || !walletType || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const creditAmount = parseFloat(amount)
    if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Verify member exists
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const externalId = `ADMIN-${Date.now()}-${userId.slice(0, 8)}`
    const metadata = {
      source: 'admin_credit',
      reason: reason || 'Admin direct credit',
      admin_id: adminUser?.id,
      wallet_type: walletType,
      transfer_type: transferType,
    }

    if (walletType === 'asset') {
      // Use apply_user_top_up which writes to financial_wallets.active_deposit
      // and optionally distributes sponsor commissions
      const commissionPct = (transferType === 'sponsor' || transferType === 'as_deposit') ? 8 : 0

      const { error: topUpError } = await supabaseAdmin.rpc('apply_user_top_up', {
        p_user_id: userId,
        p_amount: creditAmount,
        p_source: 'admin_credit',
        p_external_id: externalId,
        p_metadata: metadata,
        p_referral_commission_percentage: commissionPct,
      })

      if (topUpError) {
        return NextResponse.json({ error: topUpError.message }, { status: 500 })
      }
    } else {
      // Bonus wallet — directly credit network_bonus_balance in financial_wallets
      const { data: wallet, error: walletFetchErr } = await supabaseAdmin
        .from('financial_wallets')
        .select('network_bonus_balance')
        .eq('user_id', userId)
        .maybeSingle()

      if (walletFetchErr) {
        return NextResponse.json({ error: walletFetchErr.message }, { status: 500 })
      }

      const currentBonus = Number(wallet?.network_bonus_balance ?? 0)

      if (!wallet) {
        // Row doesn't exist — upsert to handle any race conditions
        const { error: upsertErr } = await supabaseAdmin
          .from('financial_wallets')
          .upsert({
            user_id: userId,
            network_bonus_balance: creditAmount,
            main_balance: 0,
            active_deposit: 0,
            unclaimed_profit: 0,
            total_claimed_profit: 0,
            total_withdrawn: 0,
            is_bep_reached: false,
            is_maxed_out: false,
          }, { onConflict: 'user_id' })
        if (upsertErr) {
          return NextResponse.json({ error: upsertErr.message }, { status: 500 })
        }
      } else {
        const { error: updateErr } = await supabaseAdmin
          .from('financial_wallets')
          .update({
            network_bonus_balance: currentBonus + creditAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
        if (updateErr) {
          return NextResponse.json({ error: updateErr.message }, { status: 500 })
        }
      }

      // Write ledger entry (non-fatal)
      try {
        await supabaseAdmin.from('ledger_entries').insert({
          user_id: userId,
          entry_type: 'admin_credit',
          amount: creditAmount,
          balance_after: currentBonus + creditAmount,
          description: reason || 'Admin bonus credit',
          metadata,
          created_by: adminUser?.id,
        })
      } catch { /* ledger failure is non-fatal */ }
    }

    return NextResponse.json({
      success: true,
      message: `$${creditAmount.toFixed(2)} credited to ${profile.email}`,
      transferType,
      sponsorBonus: walletType === 'asset' && (transferType === 'sponsor' || transferType === 'as_deposit'),
    })
  } catch (err) {
    console.error('[Credit] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process credit' },
      { status: 500 }
    )
  }
}
