import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { userId, recordType, amountToRemove, adminNotes } = await request.json()

    if (!userId || !recordType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, recordType' },
        { status: 400 }
      )
    }

    // Validate recordType
    const validTypes = ['deposits', 'bonus_wallet', 'asset_wallet', 'daily_profit', 'all']
    if (!validTypes.includes(recordType)) {
      return NextResponse.json(
        { error: `Invalid recordType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Get user profile first to verify exists
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const timestamp = new Date().toISOString()
    const deletionReason = adminNotes || `Bulk deletion - ${recordType}`
    let deletedSummary: any = {}

    // OPTION 1: Delete specific deposits (hard delete)
    if (recordType === 'deposits' || recordType === 'all') {
      const { data: deposits, error: fetchError } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'deposit')
        .eq('status', 'success')

      if (fetchError) {
        console.error('Fetch deposits error:', fetchError)
      }

      const totalDepositAmount = deposits?.reduce((sum, d) => sum + (d.net_amount || 0), 0) || 0

      if (deposits && deposits.length > 0) {
        // Hard delete deposits
        const depositIds = deposits.map(d => d.id)
        const { error: deleteError } = await supabaseAdmin
          .from('transactions')
          .delete()
          .in('id', depositIds)

        if (deleteError) {
          console.error('Delete error:', deleteError)
        }

        deletedSummary.deposits = {
          count: deposits.length,
          totalAmount: totalDepositAmount,
          reason: 'Deposit records removed'
        }

        // Deduct from asset wallet
        const { data: assetWallet } = await supabaseAdmin
          .from('wallets')
          .select('*')
          .eq('user_id', userId)
          .eq('wallet_type', 'asset')
          .single()

        if (assetWallet) {
          const newBalance = Math.max(0, assetWallet.balance - totalDepositAmount)
          await supabaseAdmin
            .from('wallets')
            .update({
              balance: newBalance,
              updated_at: timestamp
            })
            .eq('id', assetWallet.id)
        }

        // Deduct from profile total_deposit
        const newTotalDeposit = Math.max(0, profile.total_deposit - totalDepositAmount)
        await supabaseAdmin
          .from('profiles')
          .update({
            total_deposit: newTotalDeposit,
            updated_at: timestamp
          })
          .eq('id', userId)
      }
    }

    // OPTION 2: Reduce bonus wallet (partial or full deletion)
    if (recordType === 'bonus_wallet' || recordType === 'all') {
      const { data: bonusWallet } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('wallet_type', 'bonus')
        .single()

      if (bonusWallet) {
        const previousBalance = bonusWallet.balance
        const requestedAmount = recordType === 'bonus_wallet' ? amountToRemove : previousBalance
        const amountToReduceByNow = requestedAmount || previousBalance
        
        // Get all bonus transactions
        const { data: bonusTransactions } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .eq('wallet_type', 'bonus')
          .order('created_at', { ascending: false })

        // Delete transactions until we've removed the requested amount
        let amountRemoved = 0
        const txToDelete = []
        
        if (bonusTransactions && bonusTransactions.length > 0) {
          for (const tx of bonusTransactions) {
            if (amountRemoved >= amountToReduceByNow) break
            txToDelete.push(tx.id)
            amountRemoved += tx.net_amount || tx.amount
          }
          
          if (txToDelete.length > 0) {
            await supabaseAdmin
              .from('transactions')
              .delete()
              .in('id', txToDelete)
          }
        }

        // Update bonus wallet balance
        const newBalance = Math.max(0, previousBalance - amountToReduceByNow)
        await supabaseAdmin
          .from('wallets')
          .update({
            balance: newBalance,
            updated_at: timestamp
          })
          .eq('id', bonusWallet.id)

        deletedSummary.bonusWallet = {
          previousBalance,
          newBalance,
          amountRemoved: amountToReduceByNow,
          transactionsDeleted: txToDelete.length,
          reason: `Bonus wallet reduced by ${formatCurrency(amountToReduceByNow)}`
        }
      }
    }

    // OPTION 3: Reduce asset wallet (partial or full deletion)
    if (recordType === 'asset_wallet' || recordType === 'all') {
      const { data: assetWallet } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('wallet_type', 'asset')
        .single()

      if (assetWallet) {
        const previousBalance = assetWallet.balance
        const requestedAmount = recordType === 'asset_wallet' ? amountToRemove : previousBalance
        const amountToReduceByNow = requestedAmount || previousBalance

        // Get all asset transactions
        const { data: assetTransactions } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .eq('wallet_type', 'asset')
          .order('created_at', { ascending: false })

        // Delete transactions until we've removed the requested amount
        let amountRemoved = 0
        const txToDelete = []
        
        if (assetTransactions && assetTransactions.length > 0) {
          for (const tx of assetTransactions) {
            if (amountRemoved >= amountToReduceByNow) break
            txToDelete.push(tx.id)
            amountRemoved += tx.net_amount || tx.amount
          }
          
          if (txToDelete.length > 0) {
            await supabaseAdmin
              .from('transactions')
              .delete()
              .in('id', txToDelete)
          }
        }

        // Update asset wallet balance
        const newBalance = Math.max(0, previousBalance - amountToReduceByNow)
        await supabaseAdmin
          .from('wallets')
          .update({
            balance: newBalance,
            updated_at: timestamp
          })
          .eq('id', assetWallet.id)

        // Update profile total_deposit if we removed asset transactions
        if (txToDelete.length > 0) {
          const newTotalDeposit = Math.max(0, profile.total_deposit - amountToReduceByNow)
          await supabaseAdmin
            .from('profiles')
            .update({
              total_deposit: newTotalDeposit,
              updated_at: timestamp
            })
            .eq('id', userId)
        }

        deletedSummary.assetWallet = {
          previousBalance,
          newBalance,
          amountRemoved: amountToReduceByNow,
          transactionsDeleted: txToDelete.length,
          reason: `Asset wallet reduced by ${formatCurrency(amountToReduceByNow)}`
        }
      }
    }

    // OPTION 4: Delete daily profit claims (hard delete)
    if (recordType === 'daily_profit' || recordType === 'all') {
      const { data: profitTransactions } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'profit_claim')
        .eq('status', 'success')

      if (profitTransactions && profitTransactions.length > 0) {
        const totalProfitAmount = profitTransactions.reduce((sum, p) => sum + (p.net_amount || 0), 0)
        const txIds = profitTransactions.map(t => t.id)

        await supabaseAdmin
          .from('transactions')
          .delete()
          .in('id', txIds)

        // Deduct from asset wallet
        const { data: assetWallet } = await supabaseAdmin
          .from('wallets')
          .select('*')
          .eq('user_id', userId)
          .eq('wallet_type', 'asset')
          .single()

        if (assetWallet) {
          const newBalance = Math.max(0, assetWallet.balance - totalProfitAmount)
          await supabaseAdmin
            .from('wallets')
            .update({
              balance: newBalance,
              updated_at: timestamp
            })
            .eq('id', assetWallet.id)
        }

        deletedSummary.dailyProfit = {
          count: profitTransactions.length,
          totalAmount: totalProfitAmount,
          reason: 'Daily profit claims removed'
        }
      }
    }

    // Log deletion to audit trail
    const auditLog = {
      action: 'member_records_deleted',
      user_id: userId,
      deletion_type: recordType,
      summary: deletedSummary,
      timestamp: timestamp,
      notes: deletionReason
    }

    console.log('[Member Delete] Audit Log:', auditLog)

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${recordType} records for member ${profile.email}`,
      memberInfo: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name
      },
      deletedSummary,
      auditLog
    })

  } catch (error: any) {
    console.error('[Member Delete] Error:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}

// GET endpoint to preview what will be deleted
export async function GET(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search') // email or username

    if (!searchQuery) {
      return NextResponse.json(
        { error: 'Missing search query parameter (email or username)' },
        { status: 400 }
      )
    }

    // Search by email or username
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)

    if (profileError || !profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    if (profiles.length > 5) {
      return NextResponse.json(
        { error: 'Too many results. Please be more specific.' },
        { status: 400 }
      )
    }

    // Get detailed info for each matching profile
    const profilesWithDetails = await Promise.all(
      profiles.map(async (profile) => {
        // Get wallets
        const { data: wallets } = await supabaseAdmin
          .from('wallets')
          .select('*')
          .eq('user_id', profile.id)

        // Get deposit count
        const { count: depositCount } = await supabaseAdmin
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('type', 'deposit')
          .eq('status', 'success')

        // Get bonus transactions count
        const { count: bonusCount } = await supabaseAdmin
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('wallet_type', 'bonus')

        // Get profit claim count
        const { count: profitCount } = await supabaseAdmin
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('type', 'profit_claim')
          .eq('status', 'success')

        const assetWallet = wallets?.find(w => w.wallet_type === 'asset')
        const bonusWallet = wallets?.find(w => w.wallet_type === 'bonus')

        return {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          joinedAt: profile.created_at,
          totalDeposit: profile.total_deposit,
          wallets: {
            asset: {
              balance: assetWallet?.balance || 0,
              totalProfit: assetWallet?.total_profit_earned || 0
            },
            bonus: {
              balance: bonusWallet?.balance || 0
            }
          },
          records: {
            deposits: depositCount || 0,
            bonusTransactions: bonusCount || 0,
            profitClaims: profitCount || 0
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      results: profilesWithDetails
    })

  } catch (error: any) {
    console.error('[Member Search] Error:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}
