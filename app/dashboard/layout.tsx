'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import {
  Menu,
  TrendingUp,
  LogOut,
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  Trophy,
  Receipt,
  Shield,
  User,
  Settings,
  HelpCircle,
  MessageCircle,
  Lock,
  Bell,
  FileText,
  Globe,
  ChevronRight,
  Sparkles,
  Check,
  BarChart3,
} from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'
import { MarketTicker } from '@/components/market-ticker'
import { AnnouncementBanner } from '@/components/announcement-banner'
import { cn } from '@/lib/utils'

// Language Context
type Language = 'en' | 'id'
interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    team: 'Team',
    rewards: 'Rewards',
    history: 'History',
    profile: 'My Profile',
    security: 'Security',
    support: 'Support Center',
    faq: 'FAQ',
    settings: 'Settings',
    notifications: 'Notifications',
    documents: 'Documents',
    logout: 'Logout',
    adminPanel: 'Admin Panel',
    memberDashboard: 'Member Dashboard',
    account: 'Account',
    help: 'Help & Support',
    language: 'Language',
  },
  id: {
    dashboard: 'Dasbor',
    deposit: 'Deposit',
    withdraw: 'Penarikan',
    team: 'Tim',
    rewards: 'Hadiah',
    history: 'Riwayat',
    profile: 'Profil Saya',
    security: 'Keamanan',
    support: 'Pusat Bantuan',
    faq: 'FAQ',
    settings: 'Pengaturan',
    notifications: 'Notifikasi',
    documents: 'Dokumen',
    logout: 'Keluar',
    adminPanel: 'Panel Admin',
    memberDashboard: 'Dasbor Member',
    account: 'Akun',
    help: 'Bantuan',
    language: 'Bahasa',
  },
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
})

export const useLanguage = () => useContext(LanguageContext)

// Available languages (20 countries, only EN functional)
const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'id', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ms', name: 'Melayu', flag: '🇲🇾' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
  { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [language, setLanguage] = useState<Language>('en')
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const t = (key: string) => translations[language][key] || key

  useEffect(() => {
    // Load saved language
    const saved = localStorage.getItem('vortex-language') as Language
    if (saved && (saved === 'en' || saved === 'id')) {
      setLanguage(saved)
    }
  }, [])

  const handleLanguageChange = (lang: string) => {
    // Only English is functional, others are symbolic
    setLanguage('en')
    localStorage.setItem('vortex-language', 'en')
  }

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (data) {
          console.log("[v0] Profile loaded:", data.email, "is_admin:", data.is_admin)
          setProfile(data)
        }
      }
    }
    fetchProfile()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('demo_user')
    router.push('/auth/login')
    router.refresh()
  }

  const isAdmin = pathname.startsWith('/vx-ctrl-9f2a')

  // Main navigation items
  const mainNavItems = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/dashboard/fund-management', label: 'Fund Management', icon: BarChart3 },
    { href: '/dashboard/deposit', label: t('deposit'), icon: ArrowDownToLine },
    { href: '/dashboard/withdraw', label: t('withdraw'), icon: ArrowUpFromLine },
    { href: '/dashboard/rewards', label: t('rewards'), icon: Trophy },
    { href: '/dashboard/team', label: t('team'), icon: Users },
    { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/dashboard/history', label: t('history'), icon: Receipt },
    { href: '/dashboard/legality', label: 'Legal', icon: Shield },
  ]

  // Account & Settings items
  const accountNavItems = [
    { href: '/dashboard/profile', label: t('profile'), icon: User },
    { href: '/dashboard/security', label: t('security'), icon: Lock },
    { href: '/dashboard/notifications-settings', label: t('notifications'), icon: Bell },
  ]

  // Help & Support items
  const helpNavItems = [
    { href: '/dashboard/support', label: t('support'), icon: MessageCircle },
    { href: '/dashboard/faq', label: t('faq'), icon: HelpCircle },
    { href: '/dashboard/documents', label: t('documents'), icon: FileText },
  ]

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn('flex flex-col gap-1', mobile && 'mt-4')}>
      {/* Main Navigation */}
      <div className="mb-2">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          Main Menu
        </p>
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => mobile && setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {isActive && <Sparkles className="ml-auto h-4 w-4 opacity-70" />}
            </Link>
          )
        })}
      </div>

      {/* Account & Settings */}
      <div className="mb-2 mt-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('account')}
        </p>
        {accountNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => mobile && setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Help & Support */}
      <div className="mb-2 mt-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('help')}
        </p>
        {helpNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => mobile && setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* ADMIN PANEL - DIHAPUS DARI SIDEBAR UNTUK KEAMANAN */}
    </nav>
  )

  const currentLang = languages.find(l => l.code === language) || languages[0]

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleLanguageChange as (lang: Language) => void, t }}>
      <div className="flex min-h-screen bg-background w-full overflow-x-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-border px-6">
            <Image
              src="/logo.jpg"
              alt="Vortex Equality"
              width={40}
              height={40}
              className="rounded-lg shadow-lg"
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight text-sidebar-foreground">Vortex</span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Equality</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4">
            <NavLinks />
          </div>

          {/* User Card at Bottom */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{profile?.full_name || 'User'}</p>
                <p className="truncate text-xs text-muted-foreground">{profile?.rank || 'Starter'}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-x-hidden w-full">
          {/* Market Ticker */}
          <MarketTicker />
          
          {/* Announcement Banner */}
          <AnnouncementBanner />
          
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b border-border bg-sidebar px-4 lg:px-6">
            <div className="flex items-center gap-4">
              {/* Mobile Menu */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-white/10">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 flex flex-col bg-sidebar border-border">
                  <div className="flex h-16 items-center gap-2 border-b border-border px-6">
                    <Image
                      src="/logo.jpg"
                      alt="Vortex Equality"
                      width={36}
                      height={36}
                      className="rounded-lg"
                    />
                    <div className="flex flex-col">
                      <span className="text-lg font-bold leading-tight text-sidebar-foreground">Vortex</span>
                      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Equality</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <NavLinks mobile />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Logo for mobile */}
              <div className="flex items-center gap-2 lg:hidden">
                <Image
                  src="/logo.jpg"
                  alt="Vortex Equality"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <span className="font-bold text-sidebar-foreground">Vortex</span>
              </div>
            </div>

            {/* Right Side - Language, Notifications, Logout */}
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 px-2">
                    <Globe className="h-4 w-4" />
                    <span className="hidden text-lg sm:inline">{currentLang.flag}</span>
                    <span className="hidden text-xs sm:inline">{currentLang.code.toUpperCase()}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-[400px] w-48 overflow-y-auto">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {t('language')}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className="flex items-center gap-2"
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="flex-1">{lang.name}</span>
                      {language === lang.code && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Notifications */}
              <NotificationBell />

              {/* User Menu with Logout */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-primary-foreground">
                      {profile?.full_name?.charAt(0) || 'U'}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground">
                      {profile?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">{profile?.full_name || 'User'}</p>
                      <p className="truncate text-xs text-muted-foreground">{profile?.email || 'demo@vortex.com'}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t('profile')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/security" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        {t('security')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/support" className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        {t('support')}
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6 bg-background text-foreground">
            <div className="w-full max-w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </LanguageContext.Provider>
  )
}
