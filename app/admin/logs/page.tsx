'use client'

import { useEffect, useState } from 'react'
import { Activity, Database, Loader2, RefreshCw, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type AdminLogRow = {
  id: string
  source: 'ledger' | 'admin'
  action: string
  amount: number | null
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
  user: { full_name: string | null; email: string | null } | null
  related_user: { full_name: string | null; email: string | null } | null
  admin_user: { full_name: string | null; email: string | null } | null
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLogRow[]>([])
  const [stats, setStats] = useState({ ledgerCount: 0, adminLogCount: 0 })
  const [loading, setLoading] = useState(true)

  const loadLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/logs?limit=150')
      const data = await response.json()

      if (data.error) throw new Error(data.error)

      setLogs(data.logs || [])
      setStats(data.stats || { ledgerCount: 0, adminLogCount: 0 })
    } catch (error) {
      console.error('Failed to load admin logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const formatAmount = (amount: number | null) => {
    if (amount === null) return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const getUserLabel = (log: AdminLogRow) => {
    const user = log.user || log.related_user
    return user?.full_name || user?.email || 'System'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Logs</h1>
          <p className="text-muted-foreground">Financial ledger movements and admin actions</p>
        </div>
        <Button variant="outline" onClick={loadLogs} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-primary/10 p-3">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ledger Entries</p>
              <p className="text-2xl font-bold">{stats.ledgerCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-destructive/10 p-3">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admin Actions</p>
              <p className="text-2xl font-bold">{stats.adminLogCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="apple-matte-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">No logs found</p>
          ) : (
            <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.source === 'admin' ? 'destructive' : 'secondary'}>
                        {log.source === 'admin' ? 'Admin' : 'Ledger'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium capitalize">
                      {log.action.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{getUserLabel(log)}</p>
                        {log.user?.email && (
                          <p className="text-xs text-muted-foreground">{log.user.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={Number(log.amount) < 0 ? 'text-destructive' : 'text-primary'}>
                      {formatAmount(log.amount)}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
                      {log.description || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
