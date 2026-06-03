'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText,
  Download,
  BookOpen,
  Video,
  Wallet,
  TrendingUp,
  Users,
  Award,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Percent,
  Target,
  Gift,
  Shield,
  ExternalLink
} from 'lucide-react'

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState('marketing-plan')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white lg:text-3xl">Documents & Guides</h1>
        <p className="mt-1 text-slate-400">Complete guides, marketing plan, and tutorials</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="marketing-plan">Marketing Plan</TabsTrigger>
          <TabsTrigger value="deposit">Deposit Guide</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw Guide</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* MARKETING PLAN TAB */}
        <TabsContent value="marketing-plan" className="space-y-6">
          {/* Daily Profit Section */}
          <Card className="border-slate-1000/30 bg-gradient-to-br from-slate-900/50 to-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-400">
                <TrendingUp className="h-5 w-5" />
                Daily ROI Profit (1-2% Per Day)
              </CardTitle>
              <CardDescription>Auto-compound to your Asset Wallet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-black/30 p-4">
                <h4 className="font-semibold text-white">How It Works:</h4>
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    Company generates 1-2% daily profit from trading activities
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    Profit is split 50:50 between members and company
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    Members receive 0.5-1% daily on their Asset Wallet balance
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    Profits auto-compound (added to Asset Wallet automatically)
                  </li>
                </ul>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-slate-1000/10 p-4 ring-1 ring-slate-1000/30">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-slate-400" />
                    <span className="font-semibold text-white">Claim Time</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-400">10:00 AM - 11:59 PM</p>
                  <p className="mt-1 text-sm text-slate-400">WIB (UTC+7) - Must claim daily!</p>
                </div>
                <div className="rounded-xl bg-red-500/10 p-4 ring-1 ring-red-500/30">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <span className="font-semibold text-white">Important</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    Unclaimed profits expire at midnight and cannot be recovered. Set a daily reminder!
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-800 p-4">
                <h4 className="font-semibold text-white">400% ROI Cap:</h4>
                <p className="mt-2 text-sm text-slate-300">
                  Your Asset Wallet can grow up to 400% of your total deposits. Once reached, 
                  you must make a new deposit to continue receiving daily profits.
                </p>
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-slate-1000" />
                    <span className="text-slate-400">Before 100% ROI: 20% withdrawal fee</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-slate-400">After 100% ROI: 5% withdrawal fee</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sponsor Bonus Section */}
          <Card className="border-blue-500/30 bg-gradient-to-br from-blue-950/50 to-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <Users className="h-5 w-5" />
                Sponsor Bonus (3 Levels)
              </CardTitle>
              <CardDescription>Earn instantly when your referrals deposit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-blue-500/10 p-4 text-center ring-1 ring-blue-500/30">
                  <p className="text-sm text-slate-400">Level 1 (Direct)</p>
                  <p className="mt-1 text-3xl font-bold text-blue-400">8%</p>
                  <p className="mt-1 text-xs text-slate-500">From direct referral deposits</p>
                </div>
                <div className="rounded-xl bg-blue-500/10 p-4 text-center ring-1 ring-blue-500/30">
                  <p className="text-sm text-slate-400">Level 2</p>
                  <p className="mt-1 text-3xl font-bold text-blue-400">5%</p>
                  <p className="mt-1 text-xs text-slate-500">From 2nd level deposits</p>
                </div>
                <div className="rounded-xl bg-blue-500/10 p-4 text-center ring-1 ring-blue-500/30">
                  <p className="text-sm text-slate-400">Level 3</p>
                  <p className="mt-1 text-3xl font-bold text-blue-400">2%</p>
                  <p className="mt-1 text-xs text-slate-500">From 3rd level deposits</p>
                </div>
              </div>

              <div className="rounded-xl bg-black/30 p-4">
                <h4 className="font-semibold text-white">Example:</h4>
                <p className="mt-2 text-sm text-slate-300">
                  If your direct referral deposits $1,000, you receive $80 (8%) instantly to your Bonus Wallet.
                  If they have a referral who deposits $1,000, you receive $50 (5%), and so on.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Strategic Booster Section */}
          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-950/50 to-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-400">
                <Target className="h-5 w-5" />
                Strategic Booster (Up to +3%)
              </CardTitle>
              <CardDescription>Increase your daily profit rate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-black/30 p-4">
                <h4 className="font-semibold text-white">How to Qualify:</h4>
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                    Each referral who deposits at least equal to your Asset Wallet = +0.2% booster
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                    Maximum 15 qualifying referrals = +3% maximum booster
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                    Booster is added to your base daily profit rate
                  </li>
                </ul>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="pb-2 text-left text-slate-400">Qualifying Referrals</th>
                      <th className="pb-2 text-right text-slate-400">Booster Rate</th>
                      <th className="pb-2 text-right text-slate-400">Total Daily (Base + Booster)</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr className="border-b border-slate-800">
                      <td className="py-2">0 referrals</td>
                      <td className="py-2 text-right">+0.0%</td>
                      <td className="py-2 text-right">0.5-1.0%</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-2">5 referrals</td>
                      <td className="py-2 text-right text-purple-400">+1.0%</td>
                      <td className="py-2 text-right">1.5-2.0%</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-2">10 referrals</td>
                      <td className="py-2 text-right text-purple-400">+2.0%</td>
                      <td className="py-2 text-right">2.5-3.0%</td>
                    </tr>
                    <tr>
                      <td className="py-2">15 referrals (MAX)</td>
                      <td className="py-2 text-right text-purple-400">+3.0%</td>
                      <td className="py-2 text-right font-bold text-blue-400">3.5-4.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Rank Rewards Section */}
          <Card className="border-blue-500/30 bg-gradient-to-br from-blue-950/50 to-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <Award className="h-5 w-5" />
                Leadership Rank Rewards
              </CardTitle>
              <CardDescription>One-time salary rewards for achieving ranks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left">
                      <th className="pb-3 text-slate-400">Rank</th>
                      <th className="pb-3 text-slate-400">Direct Refs</th>
                      <th className="pb-3 text-slate-400">Branches</th>
                      <th className="pb-3 text-slate-400">Group Omset</th>
                      <th className="pb-3 text-slate-400">Min Asset</th>
                      <th className="pb-3 text-right text-slate-400">Reward</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr className="border-b border-slate-800">
                      <td className="py-3 font-medium text-slate-400">P1 SPARK</td>
                      <td className="py-3">5 direct</td>
                      <td className="py-3">-</td>
                      <td className="py-3">$5,000</td>
                      <td className="py-3">$50</td>
                      <td className="py-3 text-right font-bold text-blue-400">$100</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-3 font-medium text-blue-400">P2 FLAME</td>
                      <td className="py-3">-</td>
                      <td className="py-3">3 x $5,000</td>
                      <td className="py-3">$15,000</td>
                      <td className="py-3">$200</td>
                      <td className="py-3 text-right font-bold text-blue-400">$300</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-3 font-medium text-red-400">P3 BLAZE</td>
                      <td className="py-3">-</td>
                      <td className="py-3">3 x $15,000</td>
                      <td className="py-3">$45,000</td>
                      <td className="py-3">$600</td>
                      <td className="py-3 text-right font-bold text-blue-400">$500</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-3 font-medium text-purple-400">P4 INFERNO</td>
                      <td className="py-3">-</td>
                      <td className="py-3">3 x $45,000</td>
                      <td className="py-3">$135,000</td>
                      <td className="py-3">$1,000</td>
                      <td className="py-3 text-right font-bold text-blue-400">$3,000</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-blue-400">P5 VORTEX</td>
                      <td className="py-3">-</td>
                      <td className="py-3">3 x $100,000</td>
                      <td className="py-3">$300,000</td>
                      <td className="py-3">$2,000</td>
                      <td className="py-3 text-right font-bold text-blue-400">$5,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-xl bg-blue-500/10 p-4 ring-1 ring-blue-500/30">
                <p className="flex items-start gap-2 text-sm text-slate-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                  <span>
                    <strong>Important:</strong> You must maintain the minimum Asset Wallet balance to receive rank rewards.
                    If your balance is below the requirement, the reward will be held until you top up.
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Dual Wallet System */}
          <Card className="border-slate-700 bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Wallet className="h-5 w-5" />
                Dual Wallet System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-slate-1000/10 p-4 ring-1 ring-slate-1000/30">
                  <h4 className="font-semibold text-slate-400">Asset Wallet</h4>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Receives deposits and daily profits
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Auto-compound (profits added automatically)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Max 400% ROI cap
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Withdrawal fee: 20% (before 100%) / 5% (after 100%)
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl bg-blue-500/10 p-4 ring-1 ring-blue-500/30">
                  <h4 className="font-semibold text-blue-400">Bonus Wallet</h4>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Receives sponsor bonus (8%, 5%, 2%)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Receives rank rewards
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      No ROI cap (unlimited)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Flat 5% withdrawal fee
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEPOSIT GUIDE TAB */}
        <TabsContent value="deposit" className="space-y-6">
          <Card className="border-blue-500/30 bg-gradient-to-br from-blue-950/50 to-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <Wallet className="h-5 w-5" />
                How to Deposit
              </CardTitle>
              <CardDescription>Step-by-step guide for making deposits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-white">Go to Deposit Page</h4>
                  <p className="mt-1 text-sm text-slate-300">
                    Click the &quot;Deposit&quot; button on your dashboard or navigate to Menu &gt; Deposit.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-white">Select Cryptocurrency</h4>
                  <p className="mt-1 text-sm text-slate-300">
                    Choose your preferred cryptocurrency. We accept:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['BTC', 'ETH', 'USDT (BEP20)', 'USDT (ERC20)', 'LTC', 'BNB', 'SOL'].map((coin) => (
                      <span key={coin} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                        {coin}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-white">Enter Amount</h4>
                  <p className="mt-1 text-sm text-slate-300">
                    Enter the amount you want to deposit. Minimum deposit is <strong>$50 USD</strong> equivalent.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-white">Copy Wallet Address</h4>
                  <p className="mt-1 text-sm text-slate-300">
                    Copy the deposit wallet address shown. Make sure to send the EXACT cryptocurrency to the CORRECT network.
                  </p>
                  <div className="mt-2 rounded-lg bg-red-500/10 p-3 ring-1 ring-red-500/30">
                    <p className="flex items-start gap-2 text-sm text-red-400">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      Warning: Sending to wrong address or network will result in permanent loss of funds!
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  5
                </div>
                <div>
                  <h4 className="font-semibold text-white">Send Payment</h4>
                  <p className="mt-1 text-sm text-slate-300">
                    Send the exact amount from your external wallet to our deposit address. 
                    Your deposit will be credited automatically after blockchain confirmation (1-30 minutes).
                  </p>
                </div>
              </div>

              {/* Step 6 */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  6
                </div>
                <div>
                  <h4 className="font-semibold text-white">Confirmation</h4>
                  <p className="mt-1 text-sm text-slate-300">
                    Once confirmed, the funds will appear in your Asset Wallet. You can view the transaction receipt 
                    and download it for your records.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-blue-500/10 p-4 ring-1 ring-blue-500/30">
                <h4 className="font-semibold text-blue-400">Benefits of Depositing:</h4>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  <li>Start earning daily 0.5-1% profit immediately</li>
                  <li>Your sponsor receives 8% bonus (supports your upline)</li>
                  <li>Qualify for Strategic Booster if deposit meets requirements</li>
                  <li>Progress towards leadership rank requirements</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WITHDRAW GUIDE TAB */}
        <TabsContent value="withdraw" className="space-y-6">
          <Card className="border-blue-500/30 bg-gradient-to-br from-blue-950/50 to-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <DollarSign className="h-5 w-5" />
                How to Withdraw
              </CardTitle>
              <CardDescription>Step-by-step guide for withdrawing funds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-white">Go to Withdraw Page</h4>
                  <p className="mt-1 text-sm text-slate-300">
                    Click the &quot;Withdraw&quot; button on your dashboard or navigate to Menu &gt; Withdraw.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-white">Select Wallet</h4>
                  <p className="mt-1 text-sm text-slate-300">
                    Choose which wallet to withdraw from:
                  </p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg bg-slate-1000/10 p-3 ring-1 ring-slate-1000/30">
                      <p className="font-medium text-slate-400">Asset Wallet</p>
                      <p className="text-xs text-slate-400">Fee: 20% (before 100% ROI) / 5% (after 100% ROI)</p>
                    </div>
                    <div className="rounded-lg bg-blue-500/10 p-3 ring-1 ring-blue-500/30">
                      <p className="font-medium text-blue-400">Bonus Wallet</p>
                      <p className="text-xs text-slate-400">Fee: 5% (flat rate)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-white">Enter Amount & Wallet Address</h4>
                  <p className="mt-1 text-sm text-slate-300">
                    Enter the withdrawal amount (minimum $10) and your external wallet address.
                    Double-check the address to avoid errors.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-white">Submit Request</h4>
                  <p className="mt-1 text-sm text-slate-300">
                    Review the details including the fee deduction, then submit your withdrawal request.
                    Status will show as &quot;Pending&quot;.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  5
                </div>
                <div>
                  <h4 className="font-semibold text-white">Admin Approval</h4>
                  <p className="mt-1 text-sm text-slate-300">
                    Withdrawals require admin approval for security. This typically takes 24-48 hours.
                    You will receive a notification once approved.
                  </p>
                </div>
              </div>

              {/* Step 6 */}
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  6
                </div>
                <div>
                  <h4 className="font-semibold text-white">Receive Funds</h4>
                  <p className="mt-1 text-sm text-slate-300">
                    Once approved, funds will be sent to your wallet. You can view the transaction 
                    receipt and download it for your records.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-1000/10 p-4 ring-1 ring-slate-1000/30">
                <h4 className="font-semibold text-slate-400">Withdrawal Fee Structure:</h4>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="pb-2 text-left text-slate-400">Wallet</th>
                        <th className="pb-2 text-left text-slate-400">Condition</th>
                        <th className="pb-2 text-right text-slate-400">Fee</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      <tr className="border-b border-slate-800">
                        <td className="py-2 text-slate-400">Asset Wallet</td>
                        <td className="py-2">ROI below 100%</td>
                        <td className="py-2 text-right font-bold text-red-400">20%</td>
                      </tr>
                      <tr className="border-b border-slate-800">
                        <td className="py-2 text-slate-400">Asset Wallet</td>
                        <td className="py-2">ROI 100% or above</td>
                        <td className="py-2 text-right font-bold text-blue-400">5%</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-blue-400">Bonus Wallet</td>
                        <td className="py-2">Always</td>
                        <td className="py-2 text-right font-bold text-blue-400">5%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RESOURCES TAB */}
        <TabsContent value="resources" className="space-y-6">
          <Card className="border-slate-700 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-white">Downloadable Resources</CardTitle>
              <CardDescription>Official documents and marketing materials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-slate-1000/20 p-2">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Marketing Plan PDF</h4>
                      <p className="text-sm text-slate-400">Complete compensation structure</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3 w-full gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-500/20 p-2">
                      <BookOpen className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Getting Started Guide</h4>
                      <p className="text-sm text-slate-400">Step-by-step beginner guide</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3 w-full gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-500/20 p-2">
                      <Shield className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Terms & Conditions</h4>
                      <p className="text-sm text-slate-400">Legal terms and policies</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3 w-full gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-500/20 p-2">
                      <Gift className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Promotional Materials</h4>
                      <p className="text-sm text-slate-400">Banners and images for sharing</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3 w-full gap-2">
                    <Download className="h-4 w-4" />
                    Download ZIP
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="border-slate-700 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-white">Community Links</CardTitle>
              <CardDescription>Connect with us on social media</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <a href="#" className="flex items-center gap-3 rounded-xl border border-slate-800 p-4 transition-all hover:border-primary hover:bg-slate-800">
                  <ExternalLink className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-white">Telegram Group</p>
                    <p className="text-sm text-slate-400">Join our community</p>
                  </div>
                </a>
                <a href="#" className="flex items-center gap-3 rounded-xl border border-slate-800 p-4 transition-all hover:border-primary hover:bg-slate-800">
                  <ExternalLink className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-white">YouTube Channel</p>
                    <p className="text-sm text-slate-400">Watch tutorials</p>
                  </div>
                </a>
                <a href="#" className="flex items-center gap-3 rounded-xl border border-slate-800 p-4 transition-all hover:border-primary hover:bg-slate-800">
                  <ExternalLink className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-white">Instagram</p>
                    <p className="text-sm text-slate-400">Follow for updates</p>
                  </div>
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
