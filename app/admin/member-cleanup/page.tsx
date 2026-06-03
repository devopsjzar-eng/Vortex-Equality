'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { 
  AlertTriangle, 
  Search, 
  Trash2, 
  Eye,
  Calendar,
  Wallet,
  TrendingUp,
  History
} from 'lucide-react'

interface MemberData {
  id: string
  email: string
  fullName: string
  joinedAt: string
  totalDeposit: number
  wallets: {
    asset: { balance: number; totalProfit: number }
    bonus: { balance: number }
  }
  records: {
    deposits: number
    bonusTransactions: number
    profitClaims: number
  }
}

interface DeletionResult {
  success: boolean
  message: string
  memberInfo: { id: string; email: string; fullName: string }
  deletedSummary: any
  auditLog: any
}

export default function MemberCleanupPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [memberData, setMemberData] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedRecordType, setSelectedRecordType] = useState<string>('deposits')
  const [amountToReduce, setAmountToReduce] = useState<string>('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletionResult, setDeletionResult] = useState<DeletionResult | null>(null)
  const supabase = createClient()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter an email or username')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    setMemberData(null)

    try {
      const response = await fetch(
        `/api/admin/member/delete-records?search=${encodeURIComponent(searchQuery)}`
      )
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to search member')
        return
      }

      if (data.results && data.results.length > 0) {
        setMemberData(data.results[0])
      } else {
        setError('Member not found')
      }
    } catch (err: any) {
      setError(err.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecords = async () => {
    if (!memberData) return

    // Validate amount if reducing bonus/asset wallet
    if ((selectedRecordType === 'bonus_wallet' || selectedRecordType === 'asset_wallet') && !amountToReduce) {
      setError('Please enter the amount to reduce')
      return
    }

    setDeleting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/member/delete-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: memberData.id,
          recordType: selectedRecordType,
          amountToRemove: selectedRecordType === 'bonus_wallet' || selectedRecordType === 'asset_wallet' 
            ? parseFloat(amountToReduce) 
            : 0,
          adminNotes: `Admin manual deletion: ${selectedRecordType}`
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Deletion failed')
        return
      }

      setDeletionResult(data)
      setSuccess('Records deleted successfully!')
      setDeleteConfirmOpen(false)
      setMemberData(null)
      setSearchQuery('')
      setAmountToReduce('')
    } catch (err: any) {
      setError(err.message || 'Deletion failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Member Record Cleanup</h1>
        <p className="text-muted-foreground">
          Search and delete member transaction history and balance records
        </p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Member
          </CardTitle>
          <CardDescription>Enter email or username to find member records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter email or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
              {loading ? <Spinner className="h-4 w-4 mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-success bg-success/10">
              <AlertDescription className="text-success">{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Member Data Preview */}
      {memberData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Member Preview
            </CardTitle>
            <CardDescription>Review member information before deletion</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Member Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{memberData.email}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{memberData.fullName || 'N/A'}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="font-medium">{formatDate(memberData.joinedAt)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Total Deposit</p>
                <p className="font-medium">{formatCurrency(memberData.totalDeposit)}</p>
              </div>
            </div>

            {/* Wallet Balances */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Current Balances
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Asset Wallet</p>
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-2 text-2xl font-bold">
                    {formatCurrency(memberData.wallets.asset.balance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total Profit Earned: {formatCurrency(memberData.wallets.asset.totalProfit)}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Bonus Wallet</p>
                    <TrendingUp className="h-4 w-4 text-success" />
                  </div>
                  <p className="mt-2 text-2xl font-bold">
                    {formatCurrency(memberData.wallets.bonus.balance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    From referrals & bonuses
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction Records */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                Transaction Records
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Deposit Records</p>
                  <p className="text-2xl font-bold">{memberData.records.deposits}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Bonus Transactions</p>
                  <p className="text-2xl font-bold">{memberData.records.bonusTransactions}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Profit Claims</p>
                  <p className="text-2xl font-bold">{memberData.records.profitClaims}</p>
                </div>
              </div>
            </div>

            {/* Delete Options */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                Delete Options
              </h3>

              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Deleted records cannot be recovered. This action is permanent and will be logged.
                </AlertDescription>
              </Alert>

              <Tabs value={selectedRecordType} onValueChange={setSelectedRecordType} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="deposits">Deposits</TabsTrigger>
                  <TabsTrigger value="bonus_wallet">Reduce Bonus</TabsTrigger>
                  <TabsTrigger value="asset_wallet">Reduce Asset</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>

                <TabsContent value="deposits">
                  <div className="space-y-2">
                    <p className="text-sm">Delete all deposit records and adjust asset wallet accordingly</p>
                    <p className="text-xs text-muted-foreground">
                      This will remove {memberData.records.deposits} deposit records
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="bonus_wallet">
                  <div className="space-y-4">
                    <p className="text-sm">Reduce bonus wallet by amount and remove matching transactions</p>
                    <p className="text-xs text-muted-foreground">
                      Current balance: {formatCurrency(memberData.wallets.bonus.balance)}
                    </p>
                    <div className="space-y-2">
                      <Label>Amount to Reduce</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={amountToReduce}
                          onChange={(e) => setAmountToReduce(e.target.value)}
                          min="0"
                          step="0.01"
                        />
                        <div className="rounded-lg bg-muted/50 p-3 flex-1">
                          <p className="text-xs text-muted-foreground">After:</p>
                          <p className="font-bold">
                            {formatCurrency(Math.max(0, memberData.wallets.bonus.balance - (parseFloat(amountToReduce) || 0)))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="asset_wallet">
                  <div className="space-y-4">
                    <p className="text-sm">Reduce asset wallet by amount and remove matching transactions</p>
                    <p className="text-xs text-muted-foreground">
                      Current balance: {formatCurrency(memberData.wallets.asset.balance)}
                    </p>
                    <div className="space-y-2">
                      <Label>Amount to Reduce</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={amountToReduce}
                          onChange={(e) => setAmountToReduce(e.target.value)}
                          min="0"
                          step="0.01"
                        />
                        <div className="rounded-lg bg-muted/50 p-3 flex-1">
                          <p className="text-xs text-muted-foreground">After:</p>
                          <p className="font-bold">
                            {formatCurrency(Math.max(0, memberData.wallets.asset.balance - (parseFloat(amountToReduce) || 0)))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="all">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-destructive">NUCLEAR OPTION</p>
                    <p className="text-sm">Delete ALL records and set all wallets to $0</p>
                    <p className="text-xs text-muted-foreground">
                      This will:
                    </p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 mt-2">
                      <li>Delete {memberData.records.deposits} deposit records</li>
                      <li>Clear bonus wallet ({formatCurrency(memberData.wallets.bonus.balance)}) to $0</li>
                      <li>Clear asset wallet ({formatCurrency(memberData.wallets.asset.balance)}) to $0</li>
                      <li>Delete {memberData.records.profitClaims} profit claims</li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                onClick={() => setDeleteConfirmOpen(true)}
                variant="destructive"
                className="w-full mt-4"
                disabled={deleting}
              >
                {deleting ? <Spinner className="h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                {deleting ? 'Deleting...' : `Delete ${selectedRecordType === 'all' ? 'Everything' : selectedRecordType}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deletion Result */}
      {deletionResult && (
        <Card className="border-success bg-success/5">
          <CardHeader>
            <CardTitle className="text-success">Deletion Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <p className="font-medium">Member: {deletionResult.memberInfo.email}</p>
              <p className="text-muted-foreground">{deletionResult.message}</p>
            </div>

            {deletionResult.deletedSummary.deposits && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium text-sm">Deposits Deleted</p>
                <p className="text-sm text-muted-foreground">
                  Count: {deletionResult.deletedSummary.deposits.count} | 
                  Amount: {formatCurrency(deletionResult.deletedSummary.deposits.totalAmount)}
                </p>
              </div>
            )}

            {deletionResult.deletedSummary.bonusWallet && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium text-sm">Bonus Wallet</p>
                <p className="text-sm text-muted-foreground">
                  Previous: {formatCurrency(deletionResult.deletedSummary.bonusWallet.previousBalance)} → 
                  New: {formatCurrency(deletionResult.deletedSummary.bonusWallet.newBalance)}
                </p>
              </div>
            )}

            {deletionResult.deletedSummary.assetWallet && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium text-sm">Asset Wallet</p>
                <p className="text-sm text-muted-foreground">
                  Previous: {formatCurrency(deletionResult.deletedSummary.assetWallet.previousBalance)} → 
                  New: {formatCurrency(deletionResult.deletedSummary.assetWallet.newBalance)}
                </p>
              </div>
            )}

            {deletionResult.deletedSummary.dailyProfit && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium text-sm">Daily Profit Deleted</p>
                <p className="text-sm text-muted-foreground">
                  Count: {deletionResult.deletedSummary.dailyProfit.count} | 
                  Amount: {formatCurrency(deletionResult.deletedSummary.dailyProfit.totalAmount)}
                </p>
              </div>
            )}

            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <p className="font-medium">Audit Log Timestamp</p>
              <p className="text-muted-foreground">{deletionResult.auditLog.timestamp}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
