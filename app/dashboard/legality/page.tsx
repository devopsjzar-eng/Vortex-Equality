'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Building2,
  Shield,
  Scale,
  FileCheck,
  Globe,
  Award,
  CheckCircle,
  BadgeCheck,
  FileText,
  Download,
  ExternalLink,
  MapPin,
  Mail,
  Phone,
  Clock,
  Users,
  TrendingUp,
  Lock,
  Eye
} from 'lucide-react'

export default function LegalityPage() {
  const [activeDoc, setActiveDoc] = useState<string | null>(null)

  const documents = [
    {
      id: 'registration',
      title: 'Business Registration Certificate',
      description: 'Official company registration document',
      icon: FileCheck,
      color: 'blue',
      details: {
        'Registration Number': 'B-88472651',
        'Company Name': 'VORTEX EQUALITY S.L.',
        'Date of Incorporation': 'March 15, 2024',
        'Jurisdiction': 'Kingdom of Spain',
        'Legal Form': 'Sociedad Limitada (S.L.)',
        'Status': 'Active & In Good Standing'
      }
    },
    {
      id: 'trading',
      title: 'Investment Services License',
      description: 'Authorization for investment activities',
      icon: TrendingUp,
      color: 'emerald',
      details: {
        'License Number': 'CNMV-ESI-2024-0892',
        'Issuing Authority': 'Spanish Securities Market Commission',
        'License Type': 'Investment Services',
        'Issue Date': 'April 1, 2024',
        'Valid Until': 'March 31, 2029',
        'Status': 'Valid'
      }
    },
    {
      id: 'aml',
      title: 'AML/KYC Compliance Certificate',
      description: 'Anti-money laundering certification',
      icon: Shield,
      color: 'violet',
      details: {
        'Certificate Number': 'AML-EU-2024-VE-00182',
        'Compliance Standard': 'EU 5th AML Directive',
        'Certification Body': 'European Financial Compliance Authority',
        'Issue Date': 'May 1, 2024',
        'Renewal Date': 'May 1, 2025',
        'Status': 'Compliant'
      }
    },
    {
      id: 'data',
      title: 'Data Protection Registration',
      description: 'GDPR compliance certification',
      icon: Lock,
      color: 'amber',
      details: {
        'Registration Number': 'AEPD-2024-VE-08721',
        'Regulatory Body': 'Spanish Data Protection Agency (AEPD)',
        'Compliance Standard': 'GDPR / LOPDGDD',
        'Data Protection Officer': 'Appointed',
        'Registration Date': 'March 20, 2024',
        'Status': 'Registered'
      }
    }
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
      blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' },
      emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' },
      violet: { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30', glow: 'shadow-violet-500/20' },
      amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-amber-500/20' }
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white lg:text-3xl">Legal & Compliance</h1>
        <p className="mt-1 text-slate-400">Company credentials, licenses, and regulatory compliance</p>
      </div>

      {/* Company Overview - Premium Glass Card */}
      <Card className="relative overflow-hidden border border-white/[0.08] bg-[#0d1117]/80 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-500/10 blur-[80px]" />
        <div className="absolute -left-20 -bottom-20 h-32 w-32 rounded-full bg-violet-400/10 blur-[60px]" />
        
        <CardContent className="relative p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                <Building2 className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white lg:text-3xl">VORTEX EQUALITY S.L.</h2>
                <p className="mt-1 text-slate-400">International Investment & Asset Management</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Registered
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 ring-1 ring-blue-500/20">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Licensed
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400 ring-1 ring-violet-500/20">
                    <Globe className="h-3.5 w-3.5" />
                    EU Regulated
                  </span>
                </div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 lg:gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-white lg:text-3xl">2024</p>
                <p className="text-xs text-slate-500">Established</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white lg:text-3xl">EU</p>
                <p className="text-xs text-slate-500">Jurisdiction</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400 lg:text-3xl">Active</p>
                <p className="text-xs text-slate-500">Status</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Documents Grid */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">Official Documents & Licenses</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {documents.map((doc) => {
            const colors = getColorClasses(doc.color)
            const Icon = doc.icon
            const isActive = activeDoc === doc.id
            
            return (
              <Card 
                key={doc.id}
                className={`relative cursor-pointer overflow-hidden border transition-all duration-300 ${
                  isActive 
                    ? `border-white/20 bg-slate-800/80 shadow-lg ${colors.glow}` 
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
                onClick={() => setActiveDoc(isActive ? null : doc.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-xl ${colors.bg} p-2.5`}>
                        <Icon className={`h-5 w-5 ${colors.text}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base text-white">{doc.title}</CardTitle>
                        <CardDescription className="text-xs">{doc.description}</CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className={`h-4 w-4 transition-transform ${isActive ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                
                {isActive && (
                  <CardContent className="pt-0">
                    <div className={`rounded-xl ${colors.bg} p-4 ring-1 ${colors.border}`}>
                      <div className="space-y-2.5">
                        {Object.entries(doc.details).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">{key}</span>
                            <span className={`font-medium ${
                              key === 'Status' 
                                ? value === 'Active & In Good Standing' || value === 'Valid' || value === 'Compliant' || value === 'Registered'
                                  ? 'text-emerald-400' 
                                  : 'text-white'
                                : 'text-white'
                            }`}>
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Certifications */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/20 p-2.5">
              <Award className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-white">Industry Certifications</CardTitle>
              <CardDescription>Security and compliance standards</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: 'ISO 27001', desc: 'Information Security' },
              { name: 'PCI DSS', desc: 'Payment Security' },
              { name: 'SOC 2 Type II', desc: 'Service Organization' },
              { name: 'GDPR', desc: 'Data Protection' }
            ].map((cert) => (
              <div key={cert.name} className="flex items-center gap-3 rounded-xl bg-slate-800/50 p-4 ring-1 ring-white/5">
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
                <div>
                  <p className="font-medium text-white">{cert.name}</p>
                  <p className="text-xs text-slate-500">{cert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Terms & Conditions */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/20 p-2.5">
              <Scale className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-white">Terms & Conditions</CardTitle>
              <CardDescription>Important legal terms governing your use of Vortex Equality</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 text-sm text-slate-300">
            <section className="rounded-xl bg-slate-800/30 p-4 ring-1 ring-white/5">
              <h4 className="mb-2 font-semibold text-white">1. Investment Risks</h4>
              <p className="text-slate-400">Trading in financial markets involves significant risk. Past performance is not indicative of future results. You should only invest funds that you can afford to lose. Vortex Equality does not guarantee any returns on investment.</p>
            </section>
            
            <section className="rounded-xl bg-slate-800/30 p-4 ring-1 ring-white/5">
              <h4 className="mb-2 font-semibold text-white">2. Profit Distribution</h4>
              <p className="text-slate-400">Daily profits are generated through our professional trading activities and are distributed according to our profit-sharing model. Profit rates typically range from 1-2% daily and are subject to market conditions. Unclaimed profits expire at midnight (WIB) each day.</p>
            </section>
            
            <section className="rounded-xl bg-slate-800/30 p-4 ring-1 ring-white/5">
              <h4 className="mb-2 font-semibold text-white">3. Withdrawal Policy</h4>
              <p className="text-slate-400">All withdrawal requests are subject to verification and are typically processed within 24-48 business hours. Withdrawal fees apply as per the published fee structure. The company reserves the right to request additional verification for security purposes.</p>
            </section>
            
            <section className="rounded-xl bg-slate-800/30 p-4 ring-1 ring-white/5">
              <h4 className="mb-2 font-semibold text-white">4. Account Security</h4>
              <p className="text-slate-400">Users are responsible for maintaining the confidentiality of their account credentials. Vortex Equality employs industry-standard security measures but cannot be held liable for unauthorized access resulting from user negligence.</p>
            </section>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Registered Office & Contact</CardTitle>
          <CardDescription>Official company address and contact information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-800/50 p-4 ring-1 ring-white/5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                <MapPin className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Registered Office</p>
              <p className="mt-1 text-sm text-white">Calle de Serrano, 45</p>
              <p className="text-sm text-white">Madrid, ES</p>
              <p className="text-sm text-white">Spain</p>
            </div>
            
            <div className="rounded-xl bg-slate-800/50 p-4 ring-1 ring-white/5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <Mail className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Email</p>
              <p className="mt-1 text-sm text-white">legal@vortexequality.com</p>
              <p className="text-sm text-slate-400">compliance@vortexequality.com</p>
            </div>
            
            <div className="rounded-xl bg-slate-800/50 p-4 ring-1 ring-white/5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
                <Phone className="h-5 w-5 text-violet-400" />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Phone</p>
              <p className="mt-1 text-sm text-white">+34 912345678</p>
              <p className="text-sm text-slate-400">Mon-Fri, 9:00-18:00 CET</p>
            </div>
            
            <div className="rounded-xl bg-slate-800/50 p-4 ring-1 ring-white/5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Business Hours</p>
              <p className="mt-1 text-sm text-white">Monday - Friday</p>
              <p className="text-sm text-slate-400">09:00 - 18:00 CET</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs text-amber-400/80">
          <strong>Disclaimer:</strong> The information presented on this page is for general informational purposes only. 
          Trading and investing involve substantial risk of loss and are not suitable for all investors. 
          Past performance is not indicative of future results. Please read all terms and conditions carefully before investing.
        </p>
      </div>
    </div>
  )
}
