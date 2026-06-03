'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Lock,
  Unlock,
  AlertOctagon,
  CheckCircle
} from 'lucide-react'

export default function EmergencyControlPage() {
  const [emergencyMode, setEmergencyMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [confirmCode, setConfirmCode] = useState('')
  const [actionType, setActionType] = useState<'activate' | 'deactivate' | null>(null)
  const supabase = createClient()
  
  // Secret confirmation code - change this to your own
  const SECRET_CODE = 'VORTEX911'

  useEffect(() => {
    fetchEmergencyStatus()
  }, [])

  const fetchEmergencyStatus = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'emergency_mode')
      .single()
    
    if (data) {
      setEmergencyMode(data.value === 'true' || data.value === true)
    }
    setLoading(false)
  }

  const handleToggleRequest = (type: 'activate' | 'deactivate') => {
    setActionType(type)
    setConfirming(true)
    setConfirmCode('')
  }

  const handleConfirm = async () => {
    if (confirmCode !== SECRET_CODE) {
      alert('Invalid confirmation code!')
      return
    }

    setLoading(true)
    const newValue = actionType === 'activate'

    const { error } = await supabase
      .from('system_settings')
      .update({ 
        value: newValue.toString(),
        updated_at: new Date().toISOString()
      })
      .eq('key', 'emergency_mode')

    if (!error) {
      setEmergencyMode(newValue)
      setConfirming(false)
      setActionType(null)
    }
    setLoading(false)
  }

  const handleCancel = () => {
    setConfirming(false)
    setActionType(null)
    setConfirmCode('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Warning Header */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-1000/10 border border-slate-1000/30">
        <AlertTriangle className="h-6 w-6 text-slate-1000 shrink-0" />
        <div>
          <h2 className="font-semibold text-slate-500">Emergency Control Panel</h2>
          <p className="text-sm text-muted-foreground">
            This panel controls the emergency lockdown system. Use with extreme caution.
          </p>
        </div>
      </div>

      {/* Current Status */}
      <Card className={emergencyMode ? 'border-red-500 bg-red-500/5' : 'border-blue-500 bg-blue-500/5'}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {emergencyMode ? (
              <>
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <span className="text-red-600">EMERGENCY MODE ACTIVE</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5 text-blue-500" />
                <span className="text-blue-600">System Normal</span>
              </>
            )}
          </CardTitle>
          <CardDescription>
            {emergencyMode 
              ? 'All member transactions (deposits, withdrawals, claims) are currently BLOCKED.'
              : 'Platform is operating normally. All features are accessible to members.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg ${emergencyMode ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
            <div className="flex items-center gap-3">
              {emergencyMode ? (
                <Lock className="h-10 w-10 text-red-500" />
              ) : (
                <Unlock className="h-10 w-10 text-blue-500" />
              )}
              <div>
                <p className="font-bold text-lg">
                  {emergencyMode ? 'Platform Locked' : 'Platform Unlocked'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {emergencyMode 
                    ? 'Members can view their accounts but cannot perform any transactions.'
                    : 'Members have full access to all platform features.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Panel */}
      {!confirming ? (
        <Card>
          <CardHeader>
            <CardTitle>Emergency Actions</CardTitle>
            <CardDescription>
              Toggle emergency mode to lock or unlock the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {emergencyMode ? (
              <Button 
                onClick={() => handleToggleRequest('deactivate')}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Unlock className="h-5 w-5 mr-2" />
                Deactivate Emergency Mode
              </Button>
            ) : (
              <Button 
                onClick={() => handleToggleRequest('activate')}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <AlertOctagon className="h-5 w-5 mr-2" />
                Activate Emergency Mode
              </Button>
            )}
            
            <div className="text-xs text-muted-foreground space-y-1 mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="font-medium">When Emergency Mode is ACTIVE:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All deposit requests will be rejected</li>
                <li>All withdrawal requests will be rejected</li>
                <li>Daily profit claims will be disabled</li>
                <li>Members can only view their dashboard</li>
                <li>Admin functions remain accessible</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-1000">
          <CardHeader className="bg-slate-1000/10">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-slate-1000" />
              Confirm {actionType === 'activate' ? 'Activation' : 'Deactivation'}
            </CardTitle>
            <CardDescription>
              Enter the secret confirmation code to proceed.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="p-4 rounded-lg bg-slate-1000/10 border border-slate-1000/30">
              <p className="text-sm font-medium text-slate-500">
                {actionType === 'activate' 
                  ? 'WARNING: This will immediately lock all member transactions!'
                  : 'This will restore normal platform operations.'}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmCode">Confirmation Code</Label>
              <Input
                id="confirmCode"
                type="password"
                placeholder="Enter secret code..."
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
                className="font-mono text-center text-lg tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                Hint: Company name + emergency number
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={confirmCode.length < 5}
                className={`flex-1 ${actionType === 'activate' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {actionType === 'activate' ? (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Confirm Lock
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Unlock
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Log Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emergency Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            Emergency mode changes will be logged here for audit purposes.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
