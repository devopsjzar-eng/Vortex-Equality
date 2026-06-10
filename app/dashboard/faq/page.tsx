'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  HelpCircle, 
  Search,
  ChevronDown,
  ChevronUp,
  Wallet,
  TrendingUp,
  Users,
  Shield,
  CreditCard,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

const faqCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: HelpCircle,
    color: 'blue',
    faqs: [
      {
        q: 'How do I create an account?',
        a: 'Click "Register" on the login page, enter your email, full name, and create a password. You can also enter a referral code if you were invited by someone.'
      },
      {
        q: 'What is the minimum deposit?',
        a: 'The minimum deposit is $50 USD equivalent in cryptocurrency. We accept BTC, ETH, USDT (BEP20 & ERC20), LTC, BNB, and SOL.'
      },
      {
        q: 'How do I verify my account?',
        a: 'Currently, basic verification is done via email confirmation. For enhanced features, you may be asked to provide additional verification documents.'
      },
    ]
  },
  {
    id: 'deposits-withdrawals',
    title: 'Deposits & Withdrawals',
    icon: Wallet,
    color: 'green',
    faqs: [
      {
        q: 'How long do deposits take to process?',
        a: 'Deposits are credited automatically once the blockchain confirms the transaction. This typically takes 1-30 minutes depending on the cryptocurrency and network congestion.'
      },
      {
        q: 'What are the withdrawal fees?',
        a: 'Asset Wallet: 20% fee if ROI is below 100%, 5% fee if ROI is 100% or above. Bonus Wallet: Fixed 5% fee. These fees support platform operations and sustainability.'
      },
      {
        q: 'How long do withdrawals take?',
        a: 'Withdrawals require admin approval and are typically processed within 24-48 hours. You will receive a notification once your withdrawal is approved and sent.'
      },
      {
        q: 'What is the minimum withdrawal amount?',
        a: 'The minimum withdrawal is $10 USD. Make sure your wallet balance minus fees meets this minimum.'
      },
    ]
  },
  {
    id: 'daily-profit',
    title: 'Daily Profit',
    icon: TrendingUp,
    color: 'amber',
    faqs: [
      {
        q: 'How does daily profit work?',
        a: 'Our trading system generates 1-2% daily returns. This profit is split 50:50 between members and the company. So members receive 0.5-1% daily on their asset balance.'
      },
      {
        q: 'When can I claim my daily profit?',
        a: 'Daily profit is available for claim starting at 10:00 AM WIB (UTC+7). You must claim before midnight (11:59 PM WIB) or it expires and cannot be recovered.'
      },
      {
        q: 'What happens if I forget to claim?',
        a: 'Unclaimed profits expire at midnight and are forfeited. A new profit will be generated the next day at 10:00 AM. Set a reminder to claim daily!'
      },
      {
        q: 'What is the 400% profit cap?',
        a: 'Your Asset Wallet can accumulate profits up to 400% of your total deposits. Once reached, you need to make a new deposit to continue receiving daily profits.'
      },
    ]
  },
  {
    id: 'referral-program',
    title: 'Referral Program',
    icon: Users,
    color: 'purple',
    faqs: [
      {
        q: 'How do sponsor bonuses work?',
        a: 'When your referrals deposit, you earn: Level 1 (direct): 8%, Level 2: 5%, Level 3: 2%. Bonuses are credited instantly to your Bonus Wallet.'
      },
      {
        q: 'What is the Strategic Booster?',
        a: 'Each qualifying referral adds +0.2% to your daily profit rate. A referral qualifies when their deposit equals or exceeds your asset balance. Maximum booster is +3% (15 qualifying referrals).'
      },
      {
        q: 'How do I share my referral link?',
        a: 'Go to Team page and copy your unique referral link. Share it with friends via social media, messaging apps, or email. They will be linked to you automatically when they register.'
      },
    ]
  },
  {
    id: 'leadership-ranks',
    title: 'Leadership & Ranks',
    icon: Shield,
    color: 'orange',
    faqs: [
      {
        q: 'What are the leadership ranks?',
        a: 'There are 5 ranks: P1 SPARK ($100/month), P2 RANK ($300/month), P3 RANK ($500/month), P4 RANK ($3,000/month), and P5 ELITE ($5,000/month). Salary is recurring when requirements remain met.'
      },
      {
        q: 'How do I qualify for ranks?',
        a: 'Each rank requires minimum direct referrals, group volume, personal Active Asset, and qualifying legs where required. See the Rewards page for detailed requirements.'
      },
      {
        q: 'When do I receive rank rewards?',
        a: 'Rank salary is claim-based. After a claim, the button locks for 30 days unless you rank up sooner. Claimed salary is credited to the Bonus Wallet and follows the standard 5% Bonus Wallet withdrawal fee.'
      },
    ]
  },
  {
    id: 'security',
    title: 'Security',
    icon: CreditCard,
    color: 'red',
    faqs: [
      {
        q: 'Is my account secure?',
        a: 'Yes. We use industry-standard encryption, secure authentication, and your funds are protected by our platform security measures. We recommend enabling 2FA for additional protection.'
      },
      {
        q: 'How do I enable two-factor authentication?',
        a: 'Go to Security settings and toggle on Two-Factor Authentication. Follow the setup instructions to link your authenticator app.'
      },
      {
        q: 'What if I forget my password?',
        a: 'Click "Forgot Password" on the login page and enter your email. You will receive a reset link to create a new password.'
      },
    ]
  },
]

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [openItems, setOpenItems] = useState<string[]>([])

  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const filteredCategories = faqCategories.map(cat => ({
    ...cat,
    faqs: cat.faqs.filter(faq => 
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.faqs.length > 0)

  const colorClasses: Record<string, { bg: string, text: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-600' },
    green: { bg: 'bg-blue-500/10', text: 'text-blue-600' },
    amber: { bg: 'bg-slate-1000/10', text: 'text-slate-500' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-600' },
    orange: { bg: 'bg-blue-500/10', text: 'text-blue-600' },
    red: { bg: 'bg-red-500/10', text: 'text-red-600' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Frequently Asked Questions</h1>
        <p className="text-muted-foreground">Find answers to common questions</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* FAQ Categories */}
      <div className="space-y-6">
        {filteredCategories.map((category) => {
          const colors = colorClasses[category.color] || colorClasses.blue
          return (
            <Card key={category.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3">
                  <div className={cn('rounded-lg p-2', colors.bg)}>
                    <category.icon className={cn('h-5 w-5', colors.text)} />
                  </div>
                  {category.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {category.faqs.map((faq, index) => {
                  const itemId = `${category.id}-${index}`
                  const isOpen = openItems.includes(itemId)
                  return (
                    <div 
                      key={index}
                      className="rounded-lg border border-border transition-all hover:border-primary/50"
                    >
                      <button
                        onClick={() => toggleItem(itemId)}
                        className="flex w-full items-center justify-between p-4 text-left"
                      >
                        <span className="font-medium pr-4">{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="border-t border-border bg-muted/30 px-4 py-3">
                          <p className="text-sm text-muted-foreground">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Still Need Help */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Still have questions?</p>
              <p className="text-sm text-muted-foreground">Our support team is here to help</p>
            </div>
          </div>
          <a 
            href="/dashboard/support"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Contact Support
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
