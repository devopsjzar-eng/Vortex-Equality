'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Settings, AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingProfit, setGeneratingProfit] = useState(false)
  const [settings, setSettings] = useState({
    maintenance_mode: false,
    profit_distribution_time: '10:00',
    profit_claim_deadline: '23:59',
    withdrawal_fee_under_100: 20,
    withdrawal_fee_over_100: 5,
    bonus_withdrawal_fee: 5,
    roi_cap_percentage: 400,
  })
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('*')
    
    if (data) {
      const settingsMap: Record<string, string | number | boolean> = {}
      data.forEach(item => {
        let value = item.value
        // Parse JSON strings
        if (typeof value === 'string' && (value.startsWith('"') || value === 'true' || value === 'false')) {
          try {
            value = JSON.parse(value)
          } catch {
            // Keep original value
          }
        }
        settingsMap[item.key] = value
      })
      
      setSettings(prev => ({
        ...prev,
        ...settingsMap,
      }))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSetting = async (key: string, value: string | number | boolean) => {
    setSaving(true)
    
    await supabase
      .from('system_settings')
      .update({ 
        value: typeof value === 'string' ? `"${value}"` : value,
        updated_at: new Date().toISOString()
      })
      .eq('key', key)

    setSettings(prev => ({ ...prev, [key]: value }))
    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  const generateDailyProfit = async () => {
    setGeneratingProfit(true)
    
    try {
      // Generate random profit between 1% and 2%
      const profitPercentage = (Math.random() * (2 - 1) + 1).toFixed(2)
      const today = new Date().toISOString().split('T')[0]
      const distributionTime = new Date()
      distributionTime.setHours(10, 0, 0, 0)
      const expiryTime = new Date()
      expiryTime.setHours(23, 59, 59, 999)

      // Create or update today's profit
      const { error } = await supabase
        .from('daily_profits')
        .upsert({
          profit_date: today,
          global_profit_percentage: parseFloat(profitPercentage),
          company_share: 50,
          member_share: 50,
          distribution_time: distributionTime.toISOString(),
          expiry_time: expiryTime.toISOString(),
        }, { onConflict: 'profit_date' })

      if (error) throw error

      // Create profit claims for all members with active deposits
      const { data: walletsWithDeposits } = await supabase
        .from('wallets')
        .select('user_id, balance, initial_capital')
        .eq('wallet_type', 'asset')
        .gt('initial_capital', 0)
        .eq('cap_reached', false)

      if (walletsWithDeposits) {
        // Get today's profit ID
        const { data: todayProfit } = await supabase
          .from('daily_profits')
          .select('id')
          .eq('profit_date', today)
          .single()

        if (todayProfit) {
          // Create profit claims - no booster anymore
          const claims = walletsWithDeposits.map(wallet => {
            const totalPercentage = parseFloat(profitPercentage) // Rate langsung dari input
            const amount = (wallet.initial_capital * totalPercentage) / 100

            return {
              user_id: wallet.user_id,
              daily_profit_id: todayProfit.id,
              base_percentage: totalPercentage,
              booster_percentage: 0,
              total_percentage: totalPercentage,
              amount: amount,
              status: 'available',
            }
          })

          await supabase
            .from('profit_claims')
            .upsert(claims, { onConflict: 'user_id,daily_profit_id' })
        }
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error generating profit:', error)
    } finally {
      setGeneratingProfit(false)
    }
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

      {/* Maintenance Mode */}
      <Card className={settings.maintenance_mode ? 'border-warning' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Maintenance Mode
          </CardTitle>
          <CardDescription>
            Lock the platform for maintenance. Users will see a maintenance message.
          </CardDescription>
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
              checked={settings.maintenance_mode}
              onCheckedChange={(checked) => updateSetting('maintenance_mode', checked)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Daily Profit Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Daily Profit Generation
          </CardTitle>
          <CardDescription>
            Generate {"today's"} random profit (1-2%) and create profit claims for all eligible members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={generateDailyProfit}
            disabled={generatingProfit}
            className="w-full"
          >
            {generatingProfit ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate {"Today's"} Profit
              </>
            )}
          </Button>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            This should be run once daily at 10:00 AM
          </p>
        </CardContent>
      </Card>

      {/* Fee Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Withdrawal Fees
          </CardTitle>
          <CardDescription>
            Configure withdrawal fee percentages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{"Fee < 100% Profit"}</Label>
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
              <Label>{"Fee >= 100% Profit"}</Label>
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

      {/* ROI Cap */}
      <Card>
        <CardHeader>
          <CardTitle>ROI Cap Settings</CardTitle>
          <CardDescription>
            Maximum return on investment relative to initial capital
          </CardDescription>
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
