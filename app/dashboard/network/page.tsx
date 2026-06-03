'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Loader2, 
  Users, 
  Copy, 
  Check, 
  Share2,
  TrendingUp,
  ChevronRight,
  Search,
  DollarSign,
  Clock
} from 'lucide-react'

interface DirectSponsor {
  id: string
  full_name: string
  email: string
  created_at: string
  total_deposit: number
  rank: string
  team_count: number
  team_turnover: number
}

export default function NetworkPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [directSponsors, setDirectSponsors] = useState<DirectSponsor[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [subDownlines, setSubDownlines] = useState<{ [key: string]: DirectSponsor[] }>({})
  const [loadingSubDownlines, setLoadingSubDownlines] = useState<string | null>(null)
  
  // Stats
  const [totalActiveMembers, setTotalActiveMembers] = useState(0)
  const [totalTeamTurnover, setTotalTeamTurnover] = useState(0)
  const [yesterdayTurnover, setYesterdayTurnover] = useState(0)
  const [top3Legs, setTop3Legs] = useState<DirectSponsor[]>([])
  
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
        .select('id, full_name, email, created_at, rank')
        .eq('referred_by', user.id)
      
      if (level1 && level1.length > 0) {
        // For each direct sponsor, calculate their team stats
        const sponsorsWithStats = await Promise.all(level1.map(async (sponsor) => {
          // Get sponsor's personal deposit
          const { data: wallet } = await supabase
            .from('wallets')
            .select('total_deposit')
            .eq('user_id', sponsor.id)
            .eq('wallet_type', 'asset')
            .single()
          
          const personalDeposit = Number(wallet?.total_deposit || 0)
          
          // Get all downlines recursively for this sponsor (up to 1000)
          const teamData = await getTeamRecursive(sponsor.id, 0, 1000)
          
          return {
            ...sponsor,
            total_deposit: personalDeposit,
            team_count: teamData.count,
            team_turnover: teamData.turnover + personalDeposit
          }
        }))

        // Sort by team_turnover descending
        const sorted = sponsorsWithStats.sort((a, b) => b.team_turnover - a.team_turnover)
        setDirectSponsors(sorted)
        
        // Set top 3 legs
        setTop3Legs(sorted.slice(0, 3))
        
        // Calculate totals
        const activeMembers = sorted.filter(s => s.total_deposit > 0 || s.team_count > 0).length
        const totalTurnover = sorted.reduce((sum, s) => sum + s.team_turnover, 0)
        
        // Count all active members in entire network
        let totalActive = 0
        for (const sponsor of sorted) {
          if (sponsor.total_deposit > 0) totalActive++
          // Add active members from team
          const teamActive = await countActiveInTeam(sponsor.id)
          totalActive += teamActive
        }
        
        setTotalActiveMembers(totalActive)
        setTotalTeamTurnover(totalTurnover)
      }

      // Get yesterday's deposits from team
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data: yesterdayDeposits } = await supabase
        .from('transactions')
        .select('amount, user_id')
        .eq('type', 'deposit')
        .eq('status', 'success')
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString())

      if (yesterdayDeposits) {
        // Filter only team members
        const teamIds = await getAllTeamIds(user.id)
        const teamDeposits = yesterdayDeposits.filter(d => teamIds.includes(d.user_id))
        const totalYesterday = teamDeposits.reduce((sum, d) => sum + Number(d.amount), 0)
        setYesterdayTurnover(totalYesterday)
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  // Helper: Get team recursively with limit
  const getTeamRecursive = async (userId: string, currentCount: number, limit: number): Promise<{ count: number, turnover: number }> => {
    if (currentCount >= limit) return { count: 0, turnover: 0 }

    const { data: downlines } = await supabase
      .from('profiles')
      .select('id')
      .eq('referred_by', userId)
      .limit(limit - currentCount)

    if (!downlines || downlines.length === 0) return { count: 0, turnover: 0 }

    let totalCount = downlines.length
    let totalTurnover = 0

    // Get deposits for these downlines
    for (const dl of downlines) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('total_deposit')
        .eq('user_id', dl.id)
        .eq('wallet_type', 'asset')
        .single()
      
      totalTurnover += Number(wallet?.total_deposit || 0)

      // Recursively get sub-downlines
      if (totalCount < limit) {
        const subTeam = await getTeamRecursive(dl.id, currentCount + totalCount, limit)
        totalCount += subTeam.count
        totalTurnover += subTeam.turnover
      }
    }

    return { count: totalCount, turnover: totalTurnover }
  }

  // Helper: Count active members in team
  const countActiveInTeam = async (userId: string): Promise<number> => {
    const { data: downlines } = await supabase
      .from('profiles')
      .select('id')
      .eq('referred_by', userId)

    if (!downlines || downlines.length === 0) return 0

    let count = 0
    for (const dl of downlines) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('total_deposit')
        .eq('user_id', dl.id)
        .eq('wallet_type', 'asset')
        .single()
      
      if (Number(wallet?.total_deposit || 0) > 0) count++
      
      // Recursive count
      count += await countActiveInTeam(dl.id)
    }

    return count
  }

  // Helper: Get all team member IDs
  const getAllTeamIds = async (userId: string): Promise<string[]> => {
    const ids: string[] = []
    
    const { data: downlines } = await supabase
      .from('profiles')
      .select('id')
      .eq('referred_by', userId)

    if (!downlines) return ids

    for (const dl of downlines) {
      ids.push(dl.id)
      const subIds = await getAllTeamIds(dl.id)
      ids.push(...subIds)
    }

    return ids
  }

  // Load sub-downlines when expanding a member
  const loadSubDownlines = async (memberId: string) => {
    if (expandedMember === memberId) {
      setExpandedMember(null)
      return
    }

    setLoadingSubDownlines(memberId)
    
    const { data: subs } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at, rank')
      .eq('referred_by', memberId)

    if (subs && subs.length > 0) {
      const subsWithStats = await Promise.all(subs.map(async (sub) => {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('total_deposit')
          .eq('user_id', sub.id)
          .eq('wallet_type', 'asset')
          .single()
        
        const teamData = await getTeamRecursive(sub.id, 0, 100)
        
        return {
          ...sub,
          total_deposit: Number(wallet?.total_deposit || 0),
          team_count: teamData.count,
          team_turnover: teamData.turnover + Number(wallet?.total_deposit || 0)
        }
      }))

      setSubDownlines(prev => ({ ...prev, [memberId]: subsWithStats.sort((a, b) => b.team_turnover - a.team_turnover) }))
    } else {
      setSubDownlines(prev => ({ ...prev, [memberId]: [] }))
    }

    setExpandedMember(memberId)
    setLoadingSubDownlines(null)
  }

  const referralLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/sign-up?ref=${profile?.referral_code}` 
    : ''

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Filter sponsors by search
  const filteredSponsors = directSponsors.filter(sponsor => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      sponsor.full_name?.toLowerCase().includes(query) ||
      sponsor.email?.toLowerCase().includes(query) ||
      sponsor.id?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white lg:text-3xl">Network & Team</h1>
        <p className="mt-1 text-slate-400">Monitor your team performance and growth</p>
      </div>

      {/* Referral Link Card */}
      <Card className="border-slate-800 bg-gradient-to-r from-slate-900 via-primary/10 to-slate-900">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/20 p-3">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">Your Referral Link</p>
              <p className="text-sm text-slate-400">Share to invite new members</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Input 
              readOnly 
              value={referralLink}
              className="border-slate-700 bg-slate-800 text-slate-300 text-sm"
            />
            <Button onClick={copyLink} className="shrink-0 gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
            <span>Code:</span>
            <span className="rounded-lg bg-primary/20 px-3 py-1 font-mono font-bold text-primary">
              {profile?.referral_code}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Global Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalActiveMembers}</p>
                <p className="text-sm text-slate-400">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/20 p-2">
                <DollarSign className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">${totalTeamTurnover.toLocaleString()}</p>
                <p className="text-sm text-slate-400">Total Team Turnover</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">${yesterdayTurnover.toLocaleString()}</p>
                <p className="text-sm text-slate-400">Yesterday Performance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 3 Legs for Ranking */}
      {top3Legs.length > 0 && (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-white">Top 3 Legs (for Ranking)</h3>
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              {[0, 1, 2].map((index) => {
                const leg = top3Legs[index]
                return (
                  <div 
                    key={index}
                    className={`rounded-xl border p-4 ${
                      leg 
                        ? 'border-primary/30 bg-primary/5' 
                        : 'border-slate-700 bg-slate-800/50'
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">
                        Leg {index + 1}
                      </p>
                      {leg ? (
                        <>
                          <p className="mt-2 font-semibold text-white truncate">
                            {leg.full_name || 'No Name'}
                          </p>
                          <p className="text-2xl font-bold text-primary mt-1">
                            ${leg.team_turnover.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {leg.team_count} members
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="mt-2 text-slate-500">Not available</p>
                          <p className="text-2xl font-bold text-slate-600 mt-1">$0</p>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          placeholder="Search by name, email, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 border-slate-700 bg-slate-800 text-white"
        />
      </div>

      {/* Direct Sponsors List */}
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Your Direct Referrals</h3>
            <span className="text-sm text-slate-400">{filteredSponsors.length} members</span>
          </div>

          {filteredSponsors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-slate-800 p-4">
                <Users className="h-8 w-8 text-slate-500" />
              </div>
              <p className="mt-4 text-slate-400">
                {searchQuery ? 'Not found' : 'No team members yet'}
              </p>
              <p className="text-sm text-slate-500">
                {searchQuery ? 'Try another keyword' : 'Share your referral link to build your team'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSponsors.map((sponsor) => (
                <div key={sponsor.id}>
                  {/* Main Sponsor Card */}
                  <div 
                    className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => loadSubDownlines(sponsor.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold">
                          {sponsor.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white truncate">
                            {sponsor.full_name || 'No Name'}
                          </p>
                          <p className="text-sm text-slate-400 truncate">{sponsor.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {loadingSubDownlines === sponsor.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : (
                          <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${
                            expandedMember === sponsor.id ? 'rotate-90' : ''
                          }`} />
                        )}
                      </div>
                    </div>
                    
                    {/* Stats Row */}
                    <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Active Network</p>
                        <p className="text-lg font-semibold text-white">{sponsor.team_count} members</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Team Performance</p>
                        <p className="text-lg font-semibold text-primary">${sponsor.team_turnover.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Sub-downlines (expanded) */}
                  {expandedMember === sponsor.id && subDownlines[sponsor.id] && (
                    <div className="ml-6 mt-2 space-y-2 border-l-2 border-primary/30 pl-4">
                      {subDownlines[sponsor.id].length === 0 ? (
                        <p className="text-sm text-slate-500 py-2">No downlines yet</p>
                      ) : (
                        subDownlines[sponsor.id].map((sub) => (
                          <div 
                            key={sub.id}
                            className="rounded-lg border border-slate-700 bg-slate-800/30 p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-300 text-sm font-medium">
                                  {sub.full_name?.charAt(0) || 'U'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-white truncate">
                                    {sub.full_name || 'No Name'}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">{sub.email}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-primary">
                                  ${sub.team_turnover.toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500">{sub.team_count} org</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
