'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  MessageCircle,
  Mail,
  Phone,
  Clock,
  Send,
  CheckCircle,
  HelpCircle,
  FileQuestion,
  AlertCircle,
  Loader2
} from 'lucide-react'

export default function SupportPage() {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [formData, setFormData] = useState({
    subject: '',
    category: 'general',
    message: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setSending(false)
    setSent(true)
    setFormData({ subject: '', category: 'general', message: '' })
  }

  const faqs = [
    {
      question: 'How does the daily profit sharing work?',
      answer: 'Our trading system generates 1-2% daily profit which is shared 50:50 between the company and members. Profits are available for claim at 10:00 AM WIB and must be claimed before midnight or they expire.'
    },
    {
      question: 'What is the Strategic Booster?',
      answer: 'The Strategic Booster adds +0.2% to your daily profit rate for each qualifying referral. A referral qualifies when their deposit is equal to or greater than your current asset. Maximum booster is +3% (15 qualifying referrals).'
    },
    {
      question: 'How do withdrawals work?',
      answer: 'Withdrawals require admin approval and are processed within 24-48 hours. Fees vary: Bonus Wallet has a flat 5% fee, while Asset Wallet has 20% fee (if profit < 100%) or 5% fee (if profit >= 100%).'
    },
    {
      question: 'What is the 400% profit cap?',
      answer: 'The Asset Wallet has a maximum profit cap of 400% of your total deposit. Once reached, you need to re-invest (make a new deposit) to continue receiving daily profits.'
    },
    {
      question: 'How do I advance in leadership ranks?',
      answer: 'Each rank has specific requirements: direct referrals, group volume, personal Active Asset, and qualifying legs. Once requirements are met, your salary claim button becomes available under the 30-day claim-cycle rules.'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Support Center</h1>
        <p className="mt-1 text-muted-foreground">Get help and find answers to your questions</p>
      </div>

      {/* Contact Options */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-500/20 p-3">
              <MessageCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Live Chat</p>
              <p className="text-sm text-muted-foreground">Chat with our team</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-500/20 p-3">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Email Support</p>
              <p className="text-sm text-muted-foreground">support@vortex.com</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-500/20 p-3">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Response Time</p>
              <p className="text-sm text-muted-foreground">Within 24 hours</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Submit a Ticket</CardTitle>
            <CardDescription>Send us a message and we will get back to you</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-blue-500/20 p-4">
                  <CheckCircle className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-foreground">Ticket Submitted!</h3>
                <p className="mt-2 text-muted-foreground">We will respond to your inquiry within 24 hours.</p>
                <Button 
                  className="mt-6" 
                  variant="outline"
                  onClick={() => setSent(false)}
                >
                  Submit Another Ticket
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="deposit">Deposit Issue</option>
                    <option value="withdrawal">Withdrawal Issue</option>
                    <option value="account">Account Problem</option>
                    <option value="technical">Technical Support</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    className="border-input bg-background"
                    placeholder="Brief description of your issue"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    className="min-h-[150px] border-input bg-background"
                    placeholder="Describe your issue in detail..."
                    required
                  />
                </div>

                <Button type="submit" disabled={sending} className="w-full gap-2">
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Ticket
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Quick Help</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <a href="#faqs" className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-muted">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                <span className="text-foreground">Frequently Asked Questions</span>
              </a>
              <a href="/dashboard/documents" className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-muted">
                <FileQuestion className="h-5 w-5 text-blue-600" />
                <span className="text-foreground">Official Documents & Guides</span>
              </a>
              <a href="/dashboard/legality" className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-muted">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <span className="text-foreground">Terms & Conditions</span>
              </a>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/20 p-3">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Need Urgent Help?</p>
                  <p className="text-sm text-muted-foreground">Contact our priority support line</p>
                  <p className="mt-1 text-lg font-bold text-primary">+34 912345678</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQs */}
      <Card id="faqs">
        <CardHeader>
          <CardTitle className="text-foreground">Frequently Asked Questions</CardTitle>
          <CardDescription>Find quick answers to common questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="rounded-xl border border-border p-4">
              <h4 className="font-semibold text-foreground">{faq.question}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
