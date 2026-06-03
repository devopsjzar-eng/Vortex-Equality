'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronRight,
  TrendingUp,
  DollarSign,
  Clock,
  Share2,
  Link as LinkIcon,
  RefreshCw,
  QrCode,
  Search
} from 'lucide-react'
import { toast } from 'sonner'
import { QRCodeModal } from '@/components/qr-code-modal'

interface DirectSponsor {
  id: string
  full_name: string
  email: string
  created_at: string
  total_deposit: number
  rank: string
  active_count: number
  team_turnover: number
}

export default function TeamPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [directSponsors, setDirectSponsors] = useState<DirectSponsor[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [subDownlines, setSubDownlines] = useState<{ [key: string]: DirectSponsor[] }>({})
  const [loadingSubDownlines, setLoadingSubDownlines] = useState<string | null>(null)
  const [showQRCode, setShowQRCode] = useState(false)
  
  // Stats
  const [totalActiveMembers, setTotalActiveMembers] = useState(0)
  const [totalTeamTurnover, setTotalTeamTurnover] = useState(0)
  const [yesterdayTurnover, setYesterdayTurnover] = useState(0)
  const [top3Legs, setTop3Legs] = useState<DirectSponsor[]>([])
  
  const supabase = createClient()

  // Recursive function to get team count and turnover
  const getTeamRecursive = useCallback(async (userId: string, depth: number, maxDepth: number): Promise<{ count: number; turnover: number; activeCount: number }> => {
    if (depth >= maxDepth) return { count: 0, turnover: 0, activeCount: 0 }
    
    const { data: children } = await supabase
      .from('profiles')
      .select('id, total_deposit')
      .eq('referred_by', userId)
    
    if (!children || children.length === 0) return { count: 0, turnover: 0, activeCount: 0 }
    
    let totalCount = children.length
    let totalTurnover = 0
    let activeCount = 0
    
    for (const child of children) {
      const deposit = Number(child.total_deposit || 0)
      totalTurnover += deposit
      if (deposit > 0) activeCount++
      
      const subResult = await getTeamRecursive(child.id, depth + 1, maxDepth)
      totalCount += subResult.count
      totalTurnover += subResult.turnover
      activeCount += subResult.activeCount
    }
    
    return { count: totalCount, turnover: totalTurnover, activeCount }
  }, [supabase])

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (profileData) setProfile(profileData)

      // Fetch direct sponsors (Level 1)
      const { data: level1 } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at, rank, total_deposit')
        .eq('referred_by', user.id)
      
      if (level1 && level1.length > 0) {
        // For each direct sponsor, calculate their team stats
        const sponsorsWithStats = await Promise.all(level1.map(async (sponsor) => {
          const personalDeposit = Number(sponsor.total_deposit || 0)
          
          // Get all downlines recursively for this sponsor (limit depth for performance)
          const teamData = await getTeamRecursive(sponsor.id, 0, 10)
          
          return {
            ...sponsor,
            total_deposit: personalDeposit,
            active_count: teamData.activeCount + (personalDeposit > 0 ? 1 : 0),
            team_turnover: teamData.turnover + personalDeposit
          }
        }))

        // Sort by team_turnover descending
        const sorted = sponsorsWithStats.sort((a, b) => b.team_turnover - a.team_turnover)
        setDirectSponsors(sorted)
        
        // Set top 3 legs
        setTop3Legs(sorted.slice(0, 3))
        
        // Calculate total stats
        const totalActive = sorted.reduce((sum, s) => sum + s.active_count, 0)
        const totalTurnover = sorted.reduce((sum, s) => sum + s.team_turnover, 0)
        setTotalActiveMembers(totalActive)
        setTotalTeamTurnover(totalTurnover)
        
        // Get yesterday's deposits from team only
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // Get all team member IDs
        const getAllTeamIds = async (userId: string, depth: number, maxDepth: number): Promise<string[]> => {
          if (depth >= maxDepth) return []
          const { data: children } = await supabase
            .from('profiles')
            .select('id')
            .eq('referred_by', userId)
          if (!children || children.length === 0) return []
          
          let ids = children.map(c => c.id)
          for (const child of children) {
            const subIds = await getAllTeamIds(child.id, depth + 1, maxDepth)
            ids = [...ids, ...subIds]
          }
          return ids
        }
        
        const teamIds = await getAllTeamIds(user.id, 0, 10)
        
        if (teamIds.length > 0) {
          const { data: yesterdayDeposits } = await supabase
            .from('deposits')
            .select('amount')
            .in('user_id', teamIds)
            .gte('created_at', yesterday.toISOString())
            .lt('created_at', today.toISOString())
            .eq('status', 'completed')
          
          const yesterdayTotal = yesterdayDeposits?.reduce((sum, d) => sum + Number(d.amount), 0) || 0
          setYesterdayTurnover(yesterdayTotal)
        }
      }

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, getTeamRecursive])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch sub-downlines when expanding
  const fetchSubDownlines = async (sponsorId: string) => {
    if (subDownlines[sponsorId]) {
      // Already loaded, just toggle
      setExpandedMember(expandedMember === sponsorId ? null : sponsorId)
      return
    }
    
    setLoadingSubDownlines(sponsorId)
    try {
      const { data: children } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at, rank, total_deposit')
        .eq('referred_by', sponsorId)
      
      if (children && children.length > 0) {
        const childrenWithStats = await Promise.all(children.map(async (child) => {
          const personalDeposit = Number(child.total_deposit || 0)
          const teamData = await getTeamRecursive(child.id, 0, 10)
          
          return {
            ...child,
            total_deposit: personalDeposit,
            active_count: teamData.activeCount + (personalDeposit > 0 ? 1 : 0),
            team_turnover: teamData.turnover + personalDeposit
          }
        }))
        
        const sorted = childrenWithStats.sort((a, b) => b.team_turnover - a.team_turnover)
        setSubDownlines(prev => ({ ...prev, [sponsorId]: sorted }))
      } else {
        setSubDownlines(prev => ({ ...prev, [sponsorId]: [] }))
      }
      setExpandedMember(sponsorId)
    } catch (error) {
      console.error('Error fetching sub-downlines:', error)
    } finally {
      setLoadingSubDownlines(null)
    }
  }

  const copyReferralLink = () => {
    const link = `${window.location.origin}/auth/sign-up?ref=${profile?.referral_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('Referral link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Filter sponsors by search
  const filteredSponsors = directSponsors.filter(sponsor => 
    sponsor.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sponsor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sponsor.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Team</h1>
        <p className="text-muted-foreground">Monitor your network performance</p>
      </div>

      {/* Referral Link Card */}
      <Card className="border-2 border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-blue-500/10">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500 p-3 text-white">
                <Share2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold">Share & Earn</h3>
                <p className="text-xs text-muted-foreground">
                  Earn <span className="font-bold text-blue-500">8%</span> on direct referrals
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <code className="text-sm font-mono">{profile?.referral_code || 'LOADING...'}</code>
              </div>
              <Button size="sm" onClick={copyReferralLink} className="gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowQRCode(true)}>
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Stats - 3 Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-500/10 p-3">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{totalActiveMembers}</p>
                <p className="text-xs text-muted-foreground">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-500/10 p-3">
                <DollarSign className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{formatCurrency(totalTeamTurnover)}</p>
                <p className="text-xs text-muted-foreground">Total Team Turnover</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slate-1000/10 p-3">
                <Clock className="h-6 w-6 text-slate-1000" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-1000">{formatCurrency(yesterdayTurnover)}</p>
                <p className="text-xs text-muted-foreground">Yesterday Performance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 3 Legs - 3 Columns */}
      {top3Legs.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-4 font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Top 3 Legs
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {top3Legs.map((leg, index) => (
                <div 
                  key={leg.id}
                  className={`rounded-xl border-2 p-4 ${
                    index === 0 ? 'border-slate-1000/50 bg-slate-1000/5' :
                    index === 1 ? 'border-slate-400/50 bg-slate-400/5' :
                    'border-slate-500/50 bg-slate-500/5'
                  }`}
                >
                  <div className="text-center">
                    <div className="mb-2 text-2xl font-bold">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <p className="font-bold truncate">{leg.full_name}</p>
                    <p className="text-xl font-bold text-blue-500 mt-2">
                      {formatCurrency(leg.team_turnover)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {leg.active_count} active members
                    </p>
                  </div>
                </div>
              ))}
              {/* Fill empty slots if less than 3 */}
              {Array.from({ length: 3 - top3Legs.length }).map((_, i) => (
                <div 
                  key={`empty-${i}`}
                  className="rounded-xl border-2 border-dashed border-muted p-4"
                >
                  <div className="text-center text-muted-foreground">
                    <div className="mb-2 text-2xl">-</div>
                    <p className="text-sm">Not available</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Direct Sponsors List */}
      <div>
        <h3 className="mb-4 font-bold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Direct Referrals ({directSponsors.length})
        </h3>
        
        {filteredSponsors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Team Members Yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Share your referral link to start building your team
              </p>
              <Button onClick={copyReferralLink} className="mt-4 gap-2">
                <Share2 className="h-4 w-4" />
                Share Referral Link
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSponsors.map((sponsor) => (
              <div key={sponsor.id}>
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    expandedMember === sponsor.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => fetchSubDownlines(sponsor.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Expand Icon */}
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        {loadingSubDownlines === sponsor.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : expandedMember === sponsor.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      
                      {/* Avatar */}
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white font-bold text-lg">
                        {sponsor.full_name.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold">{sponsor.full_name}</p>
                          {sponsor.rank !== 'Starter' && sponsor.rank !== 'Bronze' && (
                            <span className="rounded-full bg-slate-1000/20 px-2 py-0.5 text-xs font-bold text-slate-1000">
                              {sponsor.rank}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{sponsor.email}</p>
                        <p className="text-xs text-muted-foreground">ID: {sponsor.id.slice(0, 8)}...</p>
                      </div>
                      
                      {/* Stats */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-500">
                          {formatCurrency(sponsor.team_turnover)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sponsor.active_count} active members
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Sub-downlines */}
                {expandedMember === sponsor.id && subDownlines[sponsor.id] && (
                  <div className="ml-6 mt-2 space-y-2 border-l-2 border-blue-500/30 pl-4">
                    {subDownlines[sponsor.id].length === 0 ? (
                      <p className="py-4 text-sm text-muted-foreground">
                        Tidak ada downline di bawah {sponsor.full_name}
                      </p>
                    ) : (
                      subDownlines[sponsor.id].map((sub) => (
                        <Card key={sub.id} className="bg-muted/30">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white font-bold">
                                {sub.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{sub.full_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{sub.email}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-blue-500">
                                  {formatCurrency(sub.team_turnover)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {sub.active_count} aktif
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        referralCode={profile?.referral_code || 'LOADING'}
        userName={profile?.full_name}
      />
    </div>
  )
}
