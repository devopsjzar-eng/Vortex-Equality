'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgeCheck, ChevronDown, ChevronRight, Copy, Loader2, Search, Share2, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QRCodeSVG } from 'qrcode.react'

type TreeNode = {
  user_id: string
  sponsor_id: string | null
  level: number
  active_deposit: number
  is_maxed_out: boolean
  full_name: string
  email: string | null
  username: string | null
  rank: string
}

type TreeResponse = {
  success: boolean
  rootUserId: string
  profile: {
    full_name?: string | null
    referral_code?: string | null
  } | null
  tree: TreeNode[]
  error?: string
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'M'
}

export function GenealogyTreeView() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TreeResponse | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)

  const loadTree = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/referral-tree', { cache: 'no-store' })
      const payload = await response.json()

      if (!response.ok || payload.error) {
        throw new Error(payload.error || 'Failed to load genealogy tree')
      }

      setData(payload)
      const directIds = new Set<string>((payload.tree || []).filter((node: TreeNode) => node.level === 1).map((node: TreeNode) => node.user_id))
      setExpanded(directIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load genealogy tree')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTree()
  }, [loadTree])

  const childrenBySponsor = useMemo(() => {
    const map = new Map<string, TreeNode[]>()
    for (const node of data?.tree || []) {
      const key = node.sponsor_id || data?.rootUserId || 'root'
      const children = map.get(key) || []
      children.push(node)
      map.set(key, children)
    }

    for (const [key, children] of map.entries()) {
      map.set(key, children.sort((a, b) => Number(b.active_deposit || 0) - Number(a.active_deposit || 0)))
    }

    return map
  }, [data])

  const subtreeVolume = useCallback((nodeId: string): number => {
    const children = childrenBySponsor.get(nodeId) || []
    return children.reduce((sum, child) => sum + Number(child.active_deposit || 0) + subtreeVolume(child.user_id), 0)
  }, [childrenBySponsor])

  const stats = useMemo(() => {
    const nodes = data?.tree || []
    const activeMembers = nodes.filter((node) => Number(node.active_deposit || 0) > 0).length
    const totalVolume = nodes.reduce((sum, node) => sum + Number(node.active_deposit || 0), 0)
    const direct = childrenBySponsor.get(data?.rootUserId || '') || []
    const topLegs = direct
      .map((node) => ({
        ...node,
        leg_volume: Number(node.active_deposit || 0) + subtreeVolume(node.user_id),
      }))
      .sort((a, b) => b.leg_volume - a.leg_volume)
      .slice(0, 3)

    return { activeMembers, totalVolume, topLegs }
  }, [childrenBySponsor, data, subtreeVolume])

  const referralLink = typeof window !== 'undefined' && data?.profile?.referral_code
    ? `${window.location.origin}/auth/sign-up?ref=${data.profile.referral_code}`
    : ''

  const copyReferralLink = async () => {
    if (!referralLink) return
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const toggleNode = (nodeId: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  const expandAll = () => setExpanded(new Set((data?.tree || []).map((node) => node.user_id)))
  const collapseAll = () => setExpanded(new Set())

  const query = search.trim().toLowerCase()

  const nodeMatches = useCallback((node: TreeNode): boolean => {
    if (!query) return true
    return [node.full_name, node.email, node.username, node.rank]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  }, [query])

  const descendantMatches = useCallback((nodeId: string): boolean => {
    return (childrenBySponsor.get(nodeId) || []).some((child) => nodeMatches(child) || descendantMatches(child.user_id))
  }, [childrenBySponsor, nodeMatches])

  const renderNode = (node: TreeNode) => {
    const children = childrenBySponsor.get(node.user_id) || []
    const isExpanded = expanded.has(node.user_id)
    const visibleBySearch = nodeMatches(node) || descendantMatches(node.user_id)

    if (!visibleBySearch) return null

    return (
      <div key={node.user_id} className="space-y-2">
        <div className="apple-matte-control p-3 sm:p-4">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => toggleNode(node.user_id)}
              className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-black/20 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={isExpanded ? 'Collapse member' : 'Expand member'}
              disabled={children.length === 0}
            >
              {children.length === 0 ? (
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              ) : isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {initials(node.full_name)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold">{node.full_name}</p>
                <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  Level {Math.min(node.level, 3)}
                </span>
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {node.rank || 'Starter'}
                </span>
              </div>
              <p className="truncate text-sm text-muted-foreground">{node.email || node.username || 'Member account'}</p>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Active Asset</p>
                  <p className="font-semibold">{formatCurrency(Number(node.active_deposit || 0))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Leg Volume</p>
                  <p className="font-semibold">{formatCurrency(Number(node.active_deposit || 0) + subtreeVolume(node.user_id))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className={node.is_maxed_out ? 'font-semibold text-red-300' : 'font-semibold text-emerald-300'}>
                    {node.is_maxed_out ? 'Maxed Out' : 'Active'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isExpanded && children.length > 0 && (
          <div className="ml-3 space-y-2 border-l border-border pl-3 sm:ml-7 sm:pl-5">
            {children.map(renderNode)}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="apple-matte-surface">
        <CardContent className="p-6 text-center text-muted-foreground">{error}</CardContent>
      </Card>
    )
  }

  const rootChildren = childrenBySponsor.get(data?.rootUserId || '') || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Genealogy Tree</h1>
          <p className="mt-1 text-muted-foreground">Track downline levels, active assets, and rank leg volume.</p>
        </div>
        <Button variant="outline" onClick={loadTree} className="w-full sm:w-auto">
          Refresh
        </Button>
      </div>

      <Card className="apple-matte-surface">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                <Share2 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">Referral Link</p>
                <p className="truncate text-sm text-muted-foreground">{referralLink || 'Referral code is loading'}</p>
              </div>
            </div>
            <Button onClick={copyReferralLink} disabled={!referralLink} className="w-full gap-2 lg:w-auto">
              <Copy className="h-4 w-4" />
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
          </div>
          {referralLink && (
            <div className="mt-4 flex flex-col items-center gap-2 border-t border-border pt-4">
              <p className="text-sm font-medium text-muted-foreground">Scan to Join</p>
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG value={referralLink} size={160} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="apple-matte-surface">
          <CardContent className="p-5">
            <Users className="mb-3 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{stats.activeMembers}</p>
            <p className="text-sm text-muted-foreground">Active Members</p>
          </CardContent>
        </Card>
        <Card className="apple-matte-surface">
          <CardContent className="p-5">
            <TrendingUp className="mb-3 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{formatCurrency(stats.totalVolume)}</p>
            <p className="text-sm text-muted-foreground">Total Group Volume</p>
          </CardContent>
        </Card>
        <Card className="apple-matte-surface">
          <CardContent className="p-5">
            <BadgeCheck className="mb-3 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{rootChildren.length}</p>
            <p className="text-sm text-muted-foreground">Direct Legs</p>
          </CardContent>
        </Card>
      </div>

      <Card className="apple-matte-surface">
        <CardHeader>
          <CardTitle className="text-lg">Three Biggest Legs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((index) => {
            const leg = stats.topLegs[index]
            return (
              <div key={leg?.user_id || index} className="apple-matte-control p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Leg {index + 1}</p>
                {leg ? (
                  <>
                    <p className="mt-2 truncate font-semibold">{leg.full_name}</p>
                    <p className="mt-1 text-xl font-bold text-primary">{formatCurrency(leg.leg_volume)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(Number(leg.active_deposit || 0))} personal active asset</p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-muted-foreground">Not available</p>
                    <p className="mt-1 text-xl font-bold">$0</p>
                  </>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="apple-matte-surface">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Expandable Tree</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, username, or rank..."
              className="pl-10"
            />
          </div>

          {rootChildren.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              No downline members yet.
            </div>
          ) : (
            <div className="space-y-3">
              {rootChildren.map(renderNode)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
