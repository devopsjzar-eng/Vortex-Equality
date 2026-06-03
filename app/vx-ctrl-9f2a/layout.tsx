'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Menu,
  Shield,
  LogOut,
  LayoutDashboard,
  Users,
  Wallet,
  ArrowDownToLine,
  Settings,
  TrendingUp,
  ChevronRight,
  Activity,
  Megaphone,
  BarChart3,
  Lock,
  X,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const adminNavItems = [
  { href: '/vx-ctrl-9f2a', label: 'Overview', icon: LayoutDashboard },
  { href: '/vx-ctrl-9f2a/members', label: 'Members', icon: Users },
  { href: '/vx-ctrl-9f2a/deposits', label: 'Deposits', icon: ArrowDownToLine },
  { href: '/vx-ctrl-9f2a/withdrawals', label: 'Withdrawals', icon: Wallet },
  { href: '/vx-ctrl-9f2a/credit', label: 'Direct Credit', icon: ArrowDownToLine },
  { href: '/vx-ctrl-9f2a/profit', label: 'Profit Control', icon: Activity },
  { href: '/vx-ctrl-9f2a/broadcast', label: 'Broadcast', icon: Megaphone },
  { href: '/vx-ctrl-9f2a/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/vx-ctrl-9f2a/member-cleanup', label: 'Record Cleanup', icon: Trash2 },
  { href: '/vx-ctrl-9f2a/settings', label: 'Settings', icon: Settings },
]

const ADMIN_PASSWORD = 'Vortex2026#'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const adminAuth = localStorage.getItem('vortex_admin_auth')
    if (adminAuth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('vortex_admin_auth', 'true')
      setIsAuthenticated(true)
      setError('')
    } else {
      setError('Password salah')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('vortex_admin_auth')
    setIsAuthenticated(false)
    setPassword('')
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-1000 to-blue-600 mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-400 mt-2">Masukkan password untuk akses</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <Input
                type="password"
                placeholder="Password Admin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 bg-slate-900 border-slate-700 text-white"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full h-12 bg-gradient-to-r from-slate-1000 to-blue-600 hover:from-slate-500 hover:to-blue-700 text-white font-semibold">
              Masuk Admin Panel
            </Button>
          </form>
        </div>
      </div>
    )
  }

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className="flex flex-col gap-1">
      {adminNavItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link 
            key={item.href} 
            href={item.href} 
            onClick={() => mobile && setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
              isActive
                ? 'bg-gradient-to-r from-slate-1000 to-blue-500 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="flex-1">{item.label}</span>
            {isActive && <ChevronRight className="h-4 w-4" />}
          </Link>
        )
      })}
      
      <Link 
        href="/dashboard" 
        onClick={() => mobile && setSidebarOpen(false)}
        className="mt-4 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white"
      >
        <TrendingUp className="h-5 w-5" />
        <span className="flex-1">Member Dashboard</span>
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Desktop Sidebar */}
      <aside className="hidden w-72 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-1000 to-blue-600">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-slate-500">Vortex Equality</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <p className="mb-3 px-4 text-xs font-semibold uppercase text-slate-500">Menu</p>
          <NavLinks />
        </div>
        
        <div className="border-t border-slate-800 p-4">
          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            className="w-full justify-start gap-3 text-red-400 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-5 w-5" />
            Logout Admin
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-4">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-slate-800 bg-slate-900 p-0">
                <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-slate-1000" />
                    <span className="font-bold text-white">Admin</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="text-slate-400">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="p-4">
                  <NavLinks mobile />
                  <Button 
                    onClick={handleLogout} 
                    variant="ghost" 
                    className="mt-4 w-full justify-start gap-3 text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut className="h-5 w-5" />
                    Logout Admin
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center gap-2 lg:hidden">
              <Shield className="h-5 w-5 text-slate-1000" />
              <span className="font-bold text-white">Admin Panel</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Image src="/logo.jpg" alt="Vortex" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-white">Vortex Equality Admin</span>
          </div>

          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            size="sm"
            className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-950 p-4 lg:p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800 bg-slate-900 px-4 py-3">
          <p className="text-center text-xs text-slate-500">&copy; 2025 Vortex Equality Admin Panel</p>
        </footer>
      </div>
    </div>
  )
}
