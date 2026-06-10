'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Copy, 
  Check, 
  Shield,
  Wallet,
  Users,
  TrendingUp,
  Edit3,
  Save,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
  })
  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (data) {
          setProfile(data)
          setFormData({
            full_name: data.full_name || '',
            phone: data.phone || '',
            address: data.address || '',
          })
        }
      } else {
        // Demo mode
        setProfile({
          id: 'demo',
          full_name: 'Demo User',
          email: 'demo@vortex.com',
          referral_code: 'VORTEX123',
          rank: 'Starter',
          asset_wallet: 0,
          bonus_wallet: 0,
          total_deposit: 0,
          total_profit: 0,
          total_withdrawal: 0,
          sponsor_id: null,
          booster_rate: 0,
          is_admin: false,
          created_at: new Date().toISOString(),
        } as Profile)
        setFormData({
          full_name: 'Demo User',
          phone: '+62 812 3456 7890',
          address: 'New York, United States',
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile || profile.id === 'demo') {
      setEditing(false)
      return
    }
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', profile.id)
      
      if (!error) {
        setProfile({ ...profile, ...formData })
        setEditing(false)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const copyReferralCode = () => {
    navigator.clipboard.writeText(profile?.referral_code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your account information</p>
        </div>
        {!editing ? (
          <Button onClick={() => setEditing(true)} variant="outline" className="gap-2">
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => setEditing(false)} variant="outline" size="sm">
              <X className="h-4 w-4" />
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-3xl font-bold text-primary-foreground shadow-lg">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <h2 className="mt-4 text-xl font-bold">{profile?.full_name}</h2>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              
              {/* Rank Badge */}
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-slate-1000/10 to-blue-500/10 px-4 py-2 text-sm font-medium text-slate-500">
                <Shield className="h-4 w-4" />
                {profile?.rank || 'Starter'}
              </div>

              {/* Referral Code */}
              <div className="mt-4 w-full">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Referral Code</p>
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                  <code className="flex-1 text-sm font-mono font-bold">{profile?.referral_code}</code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={copyReferralCode}
                  >
                    {copied ? <Check className="h-4 w-4 text-blue-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Member Since */}
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your personal details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Full Name
                </label>
                {editing ? (
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                ) : (
                  <p className="rounded-lg bg-muted p-3 text-sm">{profile?.full_name || '-'}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email Address
                </label>
                <p className="rounded-lg bg-muted p-3 text-sm">{profile?.email || '-'}</p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Phone Number
                </label>
                {editing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+62 xxx xxxx xxxx"
                  />
                ) : (
                  <p className="rounded-lg bg-muted p-3 text-sm">{formData.phone || '-'}</p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Address
                </label>
                {editing ? (
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="City, Country"
                  />
                ) : (
                  <p className="rounded-lg bg-muted p-3 text-sm">{formData.address || '-'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Account Statistics</CardTitle>
            <CardDescription>Your investment and earnings overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/20 p-2">
                    <Wallet className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Deposit</p>
                    <p className="text-lg font-bold">${(profile?.total_deposit || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/20 p-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Profit</p>
                    <p className="text-lg font-bold">${(profile?.total_profit || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/20 p-2">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Daily Booster</p>
                    <p className="text-lg font-bold">+{((profile?.booster_rate || 0) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-slate-1000/10 to-blue-500/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-1000/20 p-2">
                    <Shield className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current ROI</p>
                    <p className="text-lg font-bold">
                      {profile?.total_deposit && profile.total_deposit > 0 
                        ? (((profile.total_profit || 0) / profile.total_deposit) * 100).toFixed(1) 
                        : '0.0'}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
