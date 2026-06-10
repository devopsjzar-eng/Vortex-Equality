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
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import {
  Menu,
  LogOut,
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  Trophy,
  Receipt,
  Shield,
  User,
  HelpCircle,
  MessageCircle,
  Lock,
  Bell,
  FileText,
  BarChart3,
} from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'
import { MarketTicker } from '@/components/market-ticker'
import { AnnouncementBanner } from '@/components/announcement-banner'
import { cn } from '@/lib/utils'

type Language = 'en'
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
    notifications: 'Notifications',
    documents: 'Documents',
    logout: 'Logout',
    account: 'Account',
    help: 'Help & Support',
  },
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
})

export const useLanguage = () => useContext(LanguageContext)

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [language, setLanguage] = useState<Language>('en')
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const t = (key: string) => translations.en[key] || key

  useEffect(() => {
    localStorage.setItem('vortex-language', 'en')
    setLanguage('en')
  }, [])

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) setProfile(data)
    }

    fetchProfile()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('demo_user')
    router.push('/auth/login')
    router.refresh()
  }

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

  const accountNavItems = [
    { href: '/dashboard/profile', label: t('profile'), icon: User },
    { href: '/dashboard/security', label: t('security'), icon: Lock },
    { href: '/dashboard/notifications-settings', label: t('notifications'), icon: Bell },
  ]

  const helpNavItems = [
    { href: '/dashboard/support', label: t('support'), icon: MessageCircle },
    { href: '/dashboard/faq', label: t('faq'), icon: HelpCircle },
    { href: '/dashboard/documents', label: t('documents'), icon: FileText },
  ]

  const renderNavGroup = (
    title: string,
    items: Array<{ href: string; label: string; icon: React.ElementType }>,
    mobile = false,
    compact = false,
  ) => (
    <div className={cn(!compact && 'mb-2 mt-4 first:mt-0')}>
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </p>
      {items.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => mobile && setSidebarOpen(false)}
            className={cn(
              'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn('flex flex-col gap-1', mobile && 'mt-4')}>
      {renderNavGroup('Main Menu', mainNavItems, mobile, true)}
      {renderNavGroup(t('account'), accountNavItems, mobile)}
      {renderNavGroup(t('help'), helpNavItems, mobile)}
    </nav>
  )

  const initials = profile?.full_name?.trim()?.charAt(0)?.toUpperCase() || 'U'

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <div className="flex min-h-screen w-full overflow-x-hidden bg-background">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
          <div className="flex h-16 items-center gap-3 border-b border-border px-6">
            <Image src="/logo.jpg" alt="Vortex Equality" width={40} height={40} className="rounded-lg" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-lg font-bold leading-tight text-sidebar-foreground">Vortex</span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Equality</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <NavLinks />
          </div>

          <div className="border-t border-border p-4">
            <div className="apple-matte-control flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{profile?.full_name || 'User'}</p>
                <p className="truncate text-xs text-muted-foreground">{profile?.rank || 'Starter'}</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <MarketTicker />
          <AnnouncementBanner />

          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-sidebar/95 px-4 backdrop-blur lg:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-white/10">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex w-[min(18rem,calc(100vw-2rem))] flex-col border-border bg-sidebar p-0">
                  <div className="flex h-16 items-center gap-2 border-b border-border px-6">
                    <Image src="/logo.jpg" alt="Vortex Equality" width={36} height={36} className="rounded-lg" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-lg font-bold leading-tight text-sidebar-foreground">Vortex</span>
                      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Equality</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <NavLinks mobile />
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex min-w-0 items-center gap-2 lg:hidden">
                <Image src="/logo.jpg" alt="Vortex Equality" width={32} height={32} className="rounded-lg" />
                <span className="truncate font-bold text-sidebar-foreground">Vortex Equality</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {initials}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{profile?.full_name || 'User'}</p>
                      <p className="truncate text-xs text-muted-foreground">{profile?.email || 'member@vortexequality.com'}</p>
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

          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 text-foreground sm:p-5 lg:p-6">
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </LanguageContext.Provider>
  )
}
