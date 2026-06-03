'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
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
} from '@/components/ui/dropdown-menu'
import {
  Menu,
  Shield,
  Bell,
  LogOut,
  LayoutDashboard,
  Users,
  Wallet,
  ArrowDownToLine,
  Settings,
  User,
  TrendingUp,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const adminNavItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/members', label: 'Members', icon: Users },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: Wallet },
  { href: '/admin/credit', label: 'Direct Credit', icon: ArrowDownToLine },
  { href: '/admin/member-cleanup', label: 'Record Cleanup', icon: Trash2 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

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
          if (!data.is_admin) {
            router.push('/dashboard')
            return
          }
          setProfile(data)
        }
      }
    }
    fetchProfile()

    // Get pending withdrawals count
    const fetchPendingCount = async () => {
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'withdrawal')
        .eq('status', 'pending')
      setPendingCount(count || 0)
    }
    fetchPendingCount()
  }, [supabase, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn('flex flex-col gap-1', mobile && 'mt-4')}>
      {adminNavItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => mobile && setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
            {item.href === '/admin/withdrawals' && pendingCount > 0 && (
              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {pendingCount}
              </span>
            )}
          </Link>
        )
      })}
      <Link
        href="/dashboard"
        onClick={() => mobile && setSidebarOpen(false)}
        className="mt-4 flex items-center gap-3 rounded-lg border border-muted px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <TrendingUp className="h-5 w-5" />
        Member Dashboard
      </Link>
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">Master Council</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <NavLinks />
        </div>
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{profile?.full_name || 'Admin'}</p>
              <p className="truncate text-xs text-muted-foreground">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex h-16 items-center gap-2 border-b border-border px-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
                    <Shield className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-bold">Master Council</span>
                </div>
                <div className="p-4">
                  <NavLinks mobile />
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo for mobile */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
                <Shield className="h-4 w-4" />
              </div>
              <span className="font-bold">Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pending Withdrawals */}
            {pendingCount > 0 && (
              <Link href="/admin/withdrawals">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                    {pendingCount}
                  </span>
                </Button>
              </Link>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">Administrator</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
