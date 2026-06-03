'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { 
  Bell, 
  Mail, 
  Smartphone,
  Wallet,
  TrendingUp,
  Users,
  Shield,
  Trophy,
  Volume2,
  VolumeX,
  Check
} from 'lucide-react'

export default function NotificationsSettingsPage() {
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState({
    // Email Notifications
    emailDeposit: true,
    emailWithdrawal: true,
    emailProfit: true,
    emailReferral: true,
    emailRank: true,
    emailSecurity: true,
    emailNewsletter: false,
    
    // Push Notifications
    pushDeposit: true,
    pushWithdrawal: true,
    pushProfit: true,
    pushReferral: true,
    pushRank: true,
    pushSecurity: true,
    
    // Sound
    soundEnabled: true,
  })

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  const handleSave = () => {
    // In production, save to database
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const notificationGroups = [
    {
      title: 'Transaction Notifications',
      description: 'Alerts about deposits and withdrawals',
      icon: Wallet,
      color: 'blue',
      items: [
        { key: 'emailDeposit', pushKey: 'pushDeposit', label: 'Deposit Confirmations', description: 'When a deposit is confirmed' },
        { key: 'emailWithdrawal', pushKey: 'pushWithdrawal', label: 'Withdrawal Updates', description: 'Withdrawal approval and processing' },
      ]
    },
    {
      title: 'Profit Notifications',
      description: 'Daily profit and earning alerts',
      icon: TrendingUp,
      color: 'green',
      items: [
        { key: 'emailProfit', pushKey: 'pushProfit', label: 'Daily Profit Available', description: 'When daily profit is ready to claim' },
      ]
    },
    {
      title: 'Team Notifications',
      description: 'Referral and team activity',
      icon: Users,
      color: 'purple',
      items: [
        { key: 'emailReferral', pushKey: 'pushReferral', label: 'New Referral Sign-ups', description: 'When someone joins using your link' },
      ]
    },
    {
      title: 'Achievement Notifications',
      description: 'Rank ups and rewards',
      icon: Trophy,
      color: 'amber',
      items: [
        { key: 'emailRank', pushKey: 'pushRank', label: 'Rank Achievements', description: 'When you reach a new rank' },
      ]
    },
    {
      title: 'Security Notifications',
      description: 'Account security alerts',
      icon: Shield,
      color: 'red',
      items: [
        { key: 'emailSecurity', pushKey: 'pushSecurity', label: 'Security Alerts', description: 'Login attempts and password changes' },
      ]
    },
  ]

  const colorClasses: Record<string, { bg: string, text: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-600' },
    green: { bg: 'bg-blue-500/10', text: 'text-blue-600' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-600' },
    amber: { bg: 'bg-slate-1000/10', text: 'text-slate-500' },
    red: { bg: 'bg-red-500/10', text: 'text-red-600' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification Settings</h1>
          <p className="text-muted-foreground">Manage how you receive notifications</p>
        </div>
        <Button onClick={handleSave} disabled={saved} className="gap-2">
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              Saved!
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>

      {/* Sound Toggle */}
      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div className="flex items-center gap-4">
            <div className={`rounded-lg p-3 ${settings.soundEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
              {settings.soundEnabled ? (
                <Volume2 className="h-6 w-6 text-primary" />
              ) : (
                <VolumeX className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-semibold">Notification Sounds</p>
              <p className="text-sm text-muted-foreground">Play sound when receiving notifications</p>
            </div>
          </div>
          <Switch
            checked={settings.soundEnabled}
            onCheckedChange={() => handleToggle('soundEnabled')}
          />
        </CardContent>
      </Card>

      {/* Notification Groups */}
      {notificationGroups.map((group) => {
        const colors = colorClasses[group.color] || colorClasses.blue
        return (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${colors.bg}`}>
                  <group.icon className={`h-5 w-5 ${colors.text}`} />
                </div>
                {group.title}
              </CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.items.map((item) => (
                <div key={item.key} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Email</span>
                        <Switch
                          checked={settings[item.key as keyof typeof settings] as boolean}
                          onCheckedChange={() => handleToggle(item.key as keyof typeof settings)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Push</span>
                        <Switch
                          checked={settings[item.pushKey as keyof typeof settings] as boolean}
                          onCheckedChange={() => handleToggle(item.pushKey as keyof typeof settings)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}

      {/* Newsletter */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="flex items-center justify-between pt-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Newsletter & Updates</p>
              <p className="text-sm text-muted-foreground">Receive company news, tips, and special offers</p>
            </div>
          </div>
          <Switch
            checked={settings.emailNewsletter}
            onCheckedChange={() => handleToggle('emailNewsletter')}
          />
        </CardContent>
      </Card>
    </div>
  )
}
