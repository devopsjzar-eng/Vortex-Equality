'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  AlertTriangle, Search, Trash2, Loader2,
  ShieldAlert, CheckCircle, XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type MemberWallet = {
  main_balance: number
  active_deposit: number
  network_bonus_balance: number
  unclaimed_profit: number
  total_claimed_profit: number
  total_withdrawn: number
  is_bep_reached: boolean
  is_maxed_out: boolean
}

type MemberInfo = {
  id: string
  email: string
  full_name: string | null
  joined_at: string
  wallet: MemberWallet | null
  records: { deposits: number; profit_claims: number; withdrawals: number }
}

type Action = {
  key: string
  label: string
  description: string
  needsAmount: boolean
  field?: keyof MemberWallet
  destructive?: boolean
}

const ACTIONS: Action[] = [
  {
    key: 'deduct_main',
    label: 'Deduct Main Balance',
    description: 'Remove funds from the member\'s main wallet (earned/claimed funds).',
    needsAmount: true,
    field: 'main_balance',
  },
  {
    key: 'deduct_deposit',
    label: 'Deduct Active Deposit',
    description: 'Reduce the member\'s active deposit capital (reduces daily profit eligibility).',
    needsAmount: true,
    field: 'active_deposit',
  },
  {
    key: 'deduct_bonus',
    label: 'Deduct Network Bonus',
    description: 'Remove funds from the member\'s referral/network bonus balance.',
    needsAmount: true,
    field: 'network_bonus_balance',
  },
  {
    key: 'cancel_unclaimed',
    label: 'Cancel Unclaimed Profit',
    description: 'Zero out the member\'s pending unclaimed profit before they claim it.',
    needsAmount: false,
  },
  {
    key: 'delete_profit_claims',
    label: 'Delete Profit Claim History',
    description: 'Hard-delete all profit claims and reverse total_claimed_profit counter.',
    needsAmount: false,
  },
  {
    key: 'delete_deposits',
    label: 'Delete Deposit Records',
    description: 'Hard-delete all deposit records and their ledger entries.',
    needsAmount: false,
  },
  {
    key: 'nuke_all',
    label: '☢ NUKE ALL — Reset to Zero',
    description: 'IRREVERSIBLE: Zero all balances and delete all financial records for this member.',
    needsAmount: false,
    destructive: true,
  },
]

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function MemberCleanupPage() {
  const [search, setSearch] = useState('')
  const [member, setMember] = useState<MemberInfo | null>(null)
  const [searching, setSearching] = useState(false)
  const [selectedAction, setSelectedAction] = useState<Action | null>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSearch = async () => {
    if (!search.trim()) return
    setSearching(true)
    setMember(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/member/adjust-balance?search=${encodeURIComponent(search)}`)
      const data = await res.json()
      if (!res.ok) { setMessage({ type: 'error', text: data.error }); return }
      if (data.results?.length > 0) setMember(data.results[0])
      else setMessage({ type: 'error', text: 'Member not found.' })
    } catch {
      setMessage({ type: 'error', text: 'Search failed.' })
    } finally {
      setSearching(false)
    }
  }

  const handleConfirm = async () => {
    if (!member || !selectedAction) return
    setProcessing(true)
    setConfirmOpen(false)
    try {
      const res = await fetch('/api/admin/member/adjust-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: member.id,
          action: selectedAction.key,
          amount: selectedAction.needsAmount ? parseFloat(amount) : 0,
          reason: reason || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setMessage({ type: 'error', text: data.error }); return }
      setMessage({ type: 'success', text: `Done. Member: ${data.member}` })
      setMember(null)
      setSearch('')
      setAmount('')
      setReason('')
      setSelectedAction(null)
    } catch {
      setMessage({ type: 'error', text: 'Request failed.' })
    } finally {
      setProcessing(false)
    }
  }

  const canProceed = selectedAction &&
    (!selectedAction.needsAmount || (parseFloat(amount) > 0))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Member Balance Control</h1>
        <p className="text-muted-foreground">
          Deduct balances, cancel profits, and scrub financial records in the live system.
        </p>
      </div>

      {message && (
        <Card className={cn(
          'border',
          message.type === 'success' ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/10'
        )}>
          <CardContent className="flex items-center gap-3 p-4">
            {message.type === 'success'
              ? <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
              : <XCircle className="h-5 w-5 text-red-400 shrink-0" />}
            <p className={cn('text-sm font-medium',
              message.type === 'success' ? 'text-emerald-300' : 'text-red-300'
            )}>
              {message.text}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" /> Find Member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Email or full name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching || !search.trim()}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {member && (
        <>
          <Card className="border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-base">{member.email}</CardTitle>
              <CardDescription>{member.full_name} · Joined {new Date(member.joined_at).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
              {member.wallet ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Main Balance', value: member.wallet.main_balance },
                    { label: 'Active Deposit', value: member.wallet.active_deposit },
                    { label: 'Network Bonus', value: member.wallet.network_bonus_balance },
                    { label: 'Unclaimed Profit', value: member.wallet.unclaimed_profit },
                    { label: 'Total Claimed', value: member.wallet.total_claimed_profit },
                    { label: 'Total Withdrawn', value: member.wallet.total_withdrawn },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 font-bold">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No financial wallet found for this member.</p>
              )}
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>{member.records.deposits} deposits</span>
                <span>{member.records.profit_claims} profit claims</span>
                <span>{member.records.withdrawals} withdrawals</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                Select Action
              </CardTitle>
              <CardDescription>All actions are permanent and logged to admin audit trail.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                {ACTIONS.map(action => (
                  <button
                    key={action.key}
                    onClick={() => { setSelectedAction(action); setAmount('') }}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left transition-colors',
                      selectedAction?.key === action.key
                        ? action.destructive
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30',
                      action.destructive && 'border-red-500/30'
                    )}
                  >
                    <p className={cn('text-sm font-medium', action.destructive && 'text-red-400')}>
                      {action.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                  </button>
                ))}
              </div>

              {selectedAction?.needsAmount && (
                <div className="space-y-2 pt-2">
                  <Label>
                    Amount to deduct from{' '}
                    <span className="text-primary">
                      {fmt(member.wallet?.[selectedAction.field!] as number ?? 0)}
                    </span>
                  </Label>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        min="0.01"
                        step="0.01"
                        className="pl-7"
                      />
                    </div>
                    {amount && parseFloat(amount) > 0 && selectedAction.field && member.wallet && (
                      <div className="rounded border border-border px-3 py-2 text-sm">
                        New: <span className="font-bold text-amber-400">
                          {fmt(Math.max(0, Number(member.wallet[selectedAction.field]) - parseFloat(amount)))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedAction && (
                <div className="space-y-2 pt-1">
                  <Label>Reason (optional, for audit log)</Label>
                  <Input
                    placeholder="e.g. Cheating detected, duplicate account..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                </div>
              )}

              <Button
                variant="destructive"
                className="w-full mt-2"
                disabled={!canProceed || processing}
                onClick={() => setConfirmOpen(true)}
              >
                {processing
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                  : <><Trash2 className="mr-2 h-4 w-4" /> Execute: {selectedAction?.label || 'Select action'}</>}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Irreversible Action
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>You are about to execute:</p>
                <p className="font-semibold text-foreground">{selectedAction?.label}</p>
                <p>on member: <span className="font-semibold text-foreground">{member?.email}</span></p>
                {selectedAction?.needsAmount && amount && (
                  <p>Amount: <span className="font-semibold text-destructive">{fmt(parseFloat(amount))}</span></p>
                )}
                <p className="text-destructive font-medium">This cannot be undone. Continue?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Execute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
