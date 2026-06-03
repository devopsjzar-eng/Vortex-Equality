'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { 
  Loader2, 
  User,
  Lock,
  Bell,
  Shield,
  Eye,
  EyeOff,
  Save,
  Check
} from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    crypto_address: ''
  })
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  })
  const [showPasswords, setShowPasswords] = useState(false)
  const [notifications, setNotifications] = useState({
    profit_alerts: true,
    withdrawal_alerts: true,
    referral_alerts: true,
    marketing: false
  })
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileData) {
        setProfile(profileData)
        setFormData({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          crypto_address: profileData.crypto_address || ''
        })
      }

      setLoading(false)
    }
    fetchData()
  }, [supabase])

  const handleSaveProfile = async () => {
    if (!profile) return
    setSaving(true)
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        phone: formData.phone,
        crypto_address: formData.crypto_address
      })
      .eq('id', profile.id)

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      alert('New passwords do not match')
      return
    }
    
    setSaving(true)
    const { error } = await supabase.auth.updateUser({
      password: passwordData.new
    })
    setSaving(false)

    if (!error) {
      setPasswordData({ current: '', new: '', confirm: '' })
      alert('Password updated successfully')
    } else {
      alert('Failed to update password: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white lg:text-3xl">Settings</h1>
        <p className="mt-1 text-slate-400">Manage your account settings and preferences</p>
      </div>

      {/* Profile Settings */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/20 p-2">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-white">Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="border-slate-700 bg-slate-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="border-slate-700 bg-slate-800 opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="border-slate-700 bg-slate-800"
                placeholder="+62 xxx xxx xxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referral">Referral Code</Label>
              <Input
                id="referral"
                value={profile?.referral_code || ''}
                disabled
                className="border-slate-700 bg-slate-800 opacity-50"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="crypto">Crypto Wallet Address (USDT BEP20)</Label>
            <Input
              id="crypto"
              value={formData.crypto_address}
              onChange={(e) => setFormData(prev => ({ ...prev, crypto_address: e.target.value }))}
              className="border-slate-700 bg-slate-800 font-mono"
              placeholder="BEP20 address for withdrawals"
            />
            <p className="text-xs text-slate-500">This address will be used for withdrawals</p>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <Lock className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-white">Security</CardTitle>
              <CardDescription>Change your password</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordData.current}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                  className="border-slate-700 bg-slate-800 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full text-slate-400 hover:text-white"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type={showPasswords ? 'text' : 'password'}
                value={passwordData.new}
                onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                className="border-slate-700 bg-slate-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input
                id="confirm_password"
                type={showPasswords ? 'text' : 'password'}
                value={passwordData.confirm}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                className="border-slate-700 bg-slate-800"
              />
            </div>
          </div>

          <Button 
            onClick={handleChangePassword} 
            disabled={saving || !passwordData.current || !passwordData.new || !passwordData.confirm}
            variant="outline"
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <Bell className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-white">Notifications</CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-800 p-4">
            <div>
              <p className="font-medium text-white">Profit Alerts</p>
              <p className="text-sm text-slate-400">Get notified when daily profit is available</p>
            </div>
            <Switch 
              checked={notifications.profit_alerts}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, profit_alerts: checked }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-800 p-4">
            <div>
              <p className="font-medium text-white">Withdrawal Alerts</p>
              <p className="text-sm text-slate-400">Get notified about withdrawal status changes</p>
            </div>
            <Switch 
              checked={notifications.withdrawal_alerts}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, withdrawal_alerts: checked }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-800 p-4">
            <div>
              <p className="font-medium text-white">Referral Alerts</p>
              <p className="text-sm text-slate-400">Get notified when someone joins your team</p>
            </div>
            <Switch 
              checked={notifications.referral_alerts}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, referral_alerts: checked }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-800 p-4">
            <div>
              <p className="font-medium text-white">Marketing Updates</p>
              <p className="text-sm text-slate-400">Receive news and promotional updates</p>
            </div>
            <Switch 
              checked={notifications.marketing}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, marketing: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Member Since</p>
              <p className="font-semibold text-white">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : '-'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Current Rank</p>
              <p className="font-semibold text-white">{profile?.rank || 'P1'}</p>
            </div>
            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Account Status</p>
              <p className="font-semibold text-blue-400">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
