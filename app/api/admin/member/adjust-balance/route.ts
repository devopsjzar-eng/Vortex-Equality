import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/require-admin'

// POST /api/admin/member/adjust-balance
// action: 'deduct_main' | 'deduct_deposit' | 'deduct_bonus' | 'cancel_unclaimed' | 'delete_profit_claims' | 'delete_deposits' | 'nuke_all'
export async function POST(request: Request) {
  const { adminUser, errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { userId, action, amount, reason } = await request.json()

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 })
    }

    // Verify user exists
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('id, email, full_name').eq('id', userId).single()
    if (!profile) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    // Fetch current wallet
    const { data: wallet } = await supabaseAdmin
      .from('financial_wallets').select('*').eq('user_id', userId).single()
    if (!wallet) return NextResponse.json({ error: 'Financial wallet not found' }, { status: 404 })

    const now = new Date().toISOString()
    const note = reason || `Admin manual adjustment: ${action}`
    const summary: Record<string, any> = {}

    // ── DEDUCT MAIN BALANCE ──────────────────────────────────────────────────
    if (action === 'deduct_main' || action === 'nuke_all') {
      const deductAmt = action === 'nuke_all' ? Number(wallet.main_balance) : Number(amount)
      if (deductAmt > 0) {
        const newBal = Math.max(0, Number(wallet.main_balance) - deductAmt)
        await supabaseAdmin
          .from('financial_wallets')
          .update({ main_balance: newBal, updated_at: now })
          .eq('user_id', userId)

        await supabaseAdmin.from('ledger_entries').insert({
          user_id: userId,
          entry_type: 'admin_adjustment',
          amount: -deductAmt,
          balance_after: newBal,
          description: note,
          metadata: { action, admin_id: adminUser!.id },
          created_by: adminUser!.id,
        })
        summary.main_balance = { deducted: deductAmt, new_balance: newBal }
      }
    }

    // ── DEDUCT ACTIVE DEPOSIT ────────────────────────────────────────────────
    if (action === 'deduct_deposit' || action === 'nuke_all') {
      const refetchWallet = await supabaseAdmin
        .from('financial_wallets').select('active_deposit').eq('user_id', userId).single()
      const currentDeposit = Number(refetchWallet.data?.active_deposit ?? wallet.active_deposit)
      const deductAmt = action === 'nuke_all' ? currentDeposit : Number(amount)
      if (deductAmt > 0) {
        const newDep = Math.max(0, currentDeposit - deductAmt)
        await supabaseAdmin
          .from('financial_wallets')
          .update({ active_deposit: newDep, updated_at: now })
          .eq('user_id', userId)

        await supabaseAdmin.from('ledger_entries').insert({
          user_id: userId,
          entry_type: 'admin_adjustment',
          amount: -deductAmt,
          balance_after: newDep,
          description: note,
          metadata: { action, admin_id: adminUser!.id, field: 'active_deposit' },
          created_by: adminUser!.id,
        })
        summary.active_deposit = { deducted: deductAmt, new_balance: newDep }
      }
    }

    // ── DEDUCT NETWORK BONUS ─────────────────────────────────────────────────
    if (action === 'deduct_bonus' || action === 'nuke_all') {
      const refetchWallet = await supabaseAdmin
        .from('financial_wallets').select('network_bonus_balance').eq('user_id', userId).single()
      const currentBonus = Number(refetchWallet.data?.network_bonus_balance ?? wallet.network_bonus_balance)
      const deductAmt = action === 'nuke_all' ? currentBonus : Number(amount)
      if (deductAmt > 0) {
        const newBonus = Math.max(0, currentBonus - deductAmt)
        await supabaseAdmin
          .from('financial_wallets')
          .update({ network_bonus_balance: newBonus, updated_at: now })
          .eq('user_id', userId)

        await supabaseAdmin.from('ledger_entries').insert({
          user_id: userId,
          entry_type: 'admin_adjustment',
          amount: -deductAmt,
          balance_after: newBonus,
          description: note,
          metadata: { action, admin_id: adminUser!.id, field: 'network_bonus_balance' },
          created_by: adminUser!.id,
        })
        summary.network_bonus = { deducted: deductAmt, new_balance: newBonus }
      }
    }

    // ── CANCEL UNCLAIMED PROFIT ──────────────────────────────────────────────
    if (action === 'cancel_unclaimed' || action === 'nuke_all') {
      const refetchWallet = await supabaseAdmin
        .from('financial_wallets').select('unclaimed_profit').eq('user_id', userId).single()
      const currentUnclaimed = Number(refetchWallet.data?.unclaimed_profit ?? wallet.unclaimed_profit)
      if (currentUnclaimed > 0) {
        await supabaseAdmin
          .from('financial_wallets')
          .update({ unclaimed_profit: 0, updated_at: now })
          .eq('user_id', userId)

        await supabaseAdmin.from('ledger_entries').insert({
          user_id: userId,
          entry_type: 'admin_adjustment',
          amount: -currentUnclaimed,
          balance_after: 0,
          description: note,
          metadata: { action, admin_id: adminUser!.id, field: 'unclaimed_profit' },
          created_by: adminUser!.id,
        })
        summary.unclaimed_profit = { cancelled: currentUnclaimed }
      }
    }

    // ── DELETE PROFIT CLAIMS ─────────────────────────────────────────────────
    if (action === 'delete_profit_claims' || action === 'nuke_all') {
      const { data: claims } = await supabaseAdmin
        .from('financial_profit_claims')
        .select('id, amount')
        .eq('user_id', userId)

      if (claims && claims.length > 0) {
        const totalClaimed = claims.reduce((s, c) => s + Number(c.amount), 0)
        await supabaseAdmin
          .from('financial_profit_claims')
          .delete()
          .eq('user_id', userId)

        // Reverse total_claimed_profit on the wallet
        const { data: fw } = await supabaseAdmin
          .from('financial_wallets').select('total_claimed_profit').eq('user_id', userId).single()
        const newTCP = Math.max(0, Number(fw?.total_claimed_profit ?? 0) - totalClaimed)
        await supabaseAdmin
          .from('financial_wallets')
          .update({ total_claimed_profit: newTCP, updated_at: now })
          .eq('user_id', userId)

        // Also delete profit ledger entries
        await supabaseAdmin
          .from('ledger_entries')
          .delete()
          .eq('user_id', userId)
          .in('entry_type', ['profit_allocation', 'profit_claim'])

        summary.profit_claims = { deleted: claims.length, total_amount: totalClaimed }
      }
    }

    // ── DELETE DEPOSIT RECORDS ───────────────────────────────────────────────
    if (action === 'delete_deposits' || action === 'nuke_all') {
      const { data: deposits } = await supabaseAdmin
        .from('financial_deposits')
        .select('id, amount')
        .eq('user_id', userId)

      if (deposits && deposits.length > 0) {
        const totalDep = deposits.reduce((s, d) => s + Number(d.amount), 0)
        await supabaseAdmin
          .from('financial_deposits')
          .delete()
          .eq('user_id', userId)

        // Delete deposit ledger entries
        await supabaseAdmin
          .from('ledger_entries')
          .delete()
          .eq('user_id', userId)
          .in('entry_type', ['deposit', 'top_up'])

        summary.deposits = { deleted: deposits.length, total_amount: totalDep }
      }
    }

    // ── RECALCULATE WALLET STATE ─────────────────────────────────────────────
    await supabaseAdmin.rpc('recalculate_wallet_state', { p_user_id: userId })

    // ── AUDIT LOG ────────────────────────────────────────────────────────────
    await supabaseAdmin.from('admin_logs').insert({
      admin_user_id: adminUser!.id,
      action: 'manual_balance_adjustment',
      target_user_id: userId,
      metadata: { action, note, summary, timestamp: now },
    })

    return NextResponse.json({ success: true, summary, member: profile.email })
  } catch (err: any) {
    console.error('[AdjustBalance] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET — fetch member's current financial_wallets state for the UI
export async function GET(request: Request) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  if (!search) return NextResponse.json({ error: 'Missing search' }, { status: 400 })

  const supabaseAdmin = getSupabaseAdmin()
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, created_at')
    .or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    .limit(5)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  const results = await Promise.all(profiles.map(async (p) => {
    const { data: fw } = await supabaseAdmin
      .from('financial_wallets').select('*').eq('user_id', p.id).single()

    const { count: depositCount } = await supabaseAdmin
      .from('financial_deposits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', p.id)

    const { count: claimCount } = await supabaseAdmin
      .from('financial_profit_claims')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', p.id)

    const { count: withdrawalCount } = await supabaseAdmin
      .from('financial_withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', p.id)

    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      joined_at: p.created_at,
      wallet: fw ? {
        main_balance: Number(fw.main_balance),
        active_deposit: Number(fw.active_deposit),
        network_bonus_balance: Number(fw.network_bonus_balance),
        unclaimed_profit: Number(fw.unclaimed_profit),
        total_claimed_profit: Number(fw.total_claimed_profit),
        total_withdrawn: Number(fw.total_withdrawn),
        is_bep_reached: fw.is_bep_reached,
        is_maxed_out: fw.is_maxed_out,
      } : null,
      records: {
        deposits: depositCount ?? 0,
        profit_claims: claimCount ?? 0,
        withdrawals: withdrawalCount ?? 0,
      },
    }
  }))

  return NextResponse.json({ success: true, results })
}
