'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit2, 
  Eye, 
  EyeOff,
  Send,
  Bell,
  Gift,
  AlertTriangle,
  Info,
  PartyPopper,
  Calendar
} from 'lucide-react'

type BroadcastType = 'info' | 'warning' | 'success' | 'event' | 'promo'

interface Broadcast {
  id: string
  title: string
  message: string
  type: BroadcastType
  is_active: boolean
  priority: number
  starts_at: string
  expires_at: string | null
  created_at: string
}

const typeConfig: Record<BroadcastType, { label: string; icon: any; color: string; bgColor: string }> = {
  info: { label: 'Information', icon: Info, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  warning: { label: 'Warning', icon: AlertTriangle, color: 'text-slate-1000', bgColor: 'bg-slate-1000/10' },
  success: { label: 'Good News', icon: Bell, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  event: { label: 'Event', icon: PartyPopper, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  promo: { label: 'Promotion', icon: Gift, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
}

export default function BroadcastPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' as BroadcastType,
    expires_at: ''
  })
  const supabase = createClient()

  useEffect(() => {
    fetchBroadcasts()
  }, [])

  const fetchBroadcasts = async () => {
    const { data } = await supabase
      .from('broadcast_messages')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setBroadcasts(data)
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.message) return

    setLoading(true)

    if (editingId) {
      await supabase
        .from('broadcast_messages')
        .update({
          title: formData.title,
          message: formData.message,
          type: formData.type,
          expires_at: formData.expires_at || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId)
    } else {
      await supabase
        .from('broadcast_messages')
        .insert({
          title: formData.title,
          message: formData.message,
          type: formData.type,
          expires_at: formData.expires_at || null
        })
    }

    resetForm()
    await fetchBroadcasts()
  }

  const handleEdit = (broadcast: Broadcast) => {
    setFormData({
      title: broadcast.title,
      message: broadcast.message,
      type: broadcast.type,
      expires_at: broadcast.expires_at ? broadcast.expires_at.split('T')[0] : ''
    })
    setEditingId(broadcast.id)
    setShowForm(true)
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('broadcast_messages')
      .update({ is_active: !currentStatus })
      .eq('id', id)
    
    await fetchBroadcasts()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this broadcast?')) return
    
    await supabase
      .from('broadcast_messages')
      .delete()
      .eq('id', id)
    
    await fetchBroadcasts()
  }

  const resetForm = () => {
    setFormData({ title: '', message: '', type: 'info', expires_at: '' })
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Broadcast Messages</h1>
            <p className="text-sm text-muted-foreground">Send announcements to all members</p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Broadcast
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Broadcast' : 'Create New Broadcast'}</CardTitle>
            <CardDescription>
              This message will be displayed to all members on their dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Message Type</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(typeConfig) as BroadcastType[]).map((type) => {
                  const config = typeConfig[type]
                  const Icon = config.icon
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        formData.type === type 
                          ? `${config.bgColor} border-current ${config.color}` 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${formData.type === type ? config.color : ''}`} />
                      <span className="text-sm font-medium">{config.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Special Weekend Event!"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Write your announcement here..."
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expires On (Optional)</Label>
              <Input
                id="expires"
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no expiration. Message will automatically hide after this date.
              </p>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className={`p-3 rounded-lg border ${typeConfig[formData.type].bgColor}`}>
                <div className="flex items-start gap-2">
                  {(() => {
                    const Icon = typeConfig[formData.type].icon
                    return <Icon className={`h-4 w-4 mt-0.5 ${typeConfig[formData.type].color}`} />
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${typeConfig[formData.type].color}`}>
                      {formData.title || 'Your title here'}
                    </p>
                    <p className="text-xs text-foreground/80 mt-0.5">
                      {formData.message || 'Your message will appear here...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!formData.title || !formData.message}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                {editingId ? 'Update Broadcast' : 'Send Broadcast'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Broadcasts List */}
      <Card>
        <CardHeader>
          <CardTitle>All Broadcasts</CardTitle>
          <CardDescription>
            {broadcasts.filter(b => b.is_active).length} active, {broadcasts.filter(b => !b.is_active).length} inactive
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No broadcasts yet</p>
              <p className="text-sm">Create your first announcement to reach all members.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((broadcast) => {
                const config = typeConfig[broadcast.type]
                const Icon = config.icon
                return (
                  <div
                    key={broadcast.id}
                    className={`p-4 rounded-lg border ${broadcast.is_active ? config.bgColor : 'bg-muted/50 opacity-60'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{broadcast.title}</p>
                            <Badge variant={broadcast.is_active ? 'default' : 'secondary'} className="text-xs">
                              {broadcast.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{broadcast.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Created: {new Date(broadcast.created_at).toLocaleDateString()}</span>
                            {broadcast.expires_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Expires: {new Date(broadcast.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(broadcast.id, broadcast.is_active)}
                          title={broadcast.is_active ? 'Hide' : 'Show'}
                        >
                          {broadcast.is_active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(broadcast)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(broadcast.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
