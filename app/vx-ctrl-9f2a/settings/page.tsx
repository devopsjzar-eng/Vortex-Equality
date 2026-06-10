'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Settings, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    maintenance_mode: false,
    withdrawal_fee_under_100: 20,
    withdrawal_fee_over_100: 5,
    bonus_withdrawal_fee: 5,
    roi_cap_percentage: 400,
  })
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('system_settings').select('*')
    if (data) {
      const map: Record<string, string | number | boolean> = {}
      data.forEach(item => {
        let value = item.value
        if (typeof value === 'string' && (value.startsWith('"') || value === 'true' || value === 'false')) {
          try { value = JSON.parse(value) } catch { /* keep original */ }
        }
        map[item.key] = value
      })
      setSettings(prev => ({ ...prev, ...map }))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const updateSetting = async (key: string, value: string | number | boolean) => {
    setSaving(true)
    await supabase
      .from('system_settings')
      .update({ value: typeof value === 'string' ? `"${value}"` : value, updated_at: new Date().toISOString() })
      .eq('key', key)
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Configure platform settings and parameters</p>
      </div>

      {success && (
        <Card className="border-success bg-success/10">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle className="h-5 w-5 text-success" />
            <p className="font-medium text-success">Settings updated successfully!</p>
          </CardContent>
        </Card>
      )}

      <Card className={settings.maintenance_mode ? 'border-warning' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Maintenance Mode
          </CardTitle>
          <CardDescription>Lock the platform for maintenance. Users will see a maintenance message.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">
                {settings.maintenance_mode ? 'Platform is currently locked' : 'Platform is online'}
              </p>
            </div>
            <Switch
              checked={!!settings.maintenance_mode}
              onCheckedChange={(checked) => updateSetting('maintenance_mode', checked)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Daily Profit
          </CardTitle>
          <CardDescription>Trigger and manage daily profit distributions from the dedicated page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/vx-ctrl-9f2a/profit">
            <Button variant="outline" className="w-full">Go to Profit Control</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Withdrawal Fees
          </CardTitle>
          <CardDescription>Configure withdrawal fee percentages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{'Fee < 100% Profit'}</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={settings.withdrawal_fee_under_100}
                  onChange={(e) => setSettings(prev => ({ ...prev, withdrawal_fee_under_100: parseInt(e.target.value) }))}
                  onBlur={(e) => updateSetting('withdrawal_fee_under_100', parseInt(e.target.value))}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">Asset wallet, profit under 100%</p>
            </div>
            <div className="space-y-2">
              <Label>{'Fee >= 100% Profit'}</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={settings.withdrawal_fee_over_100}
                  onChange={(e) => setSettings(prev => ({ ...prev, withdrawal_fee_over_100: parseInt(e.target.value) }))}
                  onBlur={(e) => updateSetting('withdrawal_fee_over_100', parseInt(e.target.value))}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">Asset wallet, profit 100% or more</p>
            </div>
            <div className="space-y-2">
              <Label>Bonus Wallet Fee</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={settings.bonus_withdrawal_fee}
                  onChange={(e) => setSettings(prev => ({ ...prev, bonus_withdrawal_fee: parseInt(e.target.value) }))}
                  onBlur={(e) => updateSetting('bonus_withdrawal_fee', parseInt(e.target.value))}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">Flat fee for bonus wallet</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ROI Cap Settings</CardTitle>
          <CardDescription>Maximum return on investment relative to initial capital</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>ROI Cap Percentage</Label>
            <div className="relative max-w-xs">
              <Input
                type="number"
                value={settings.roi_cap_percentage}
                onChange={(e) => setSettings(prev => ({ ...prev, roi_cap_percentage: parseInt(e.target.value) }))}
                onBlur={(e) => updateSetting('roi_cap_percentage', parseInt(e.target.value))}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Once a member reaches {settings.roi_cap_percentage}% ROI, they must re-invest to continue earning.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
