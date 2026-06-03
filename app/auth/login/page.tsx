'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, TrendingUp, Shield, Users, Zap, Eye, EyeOff } from 'lucide-react'
import { loginAction } from './actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await loginAction(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-8">
            <Image 
              src="/logo-dark.jpg" 
              alt="Vortex Equality" 
              width={80} 
              height={80}
              className="rounded-2xl shadow-2xl"
            />
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4">
            Vortex Equality
          </h1>
          <p className="text-xl text-blue-200 mb-12">
            Premium Trading Investment Platform
          </p>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Daily Profit Sharing</h3>
                <p className="text-blue-300 text-sm">Earn 1-2% daily returns on your investment</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Network Bonuses</h3>
                <p className="text-blue-300 text-sm">Up to 15% sponsor bonus across 3 levels</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Strategic Booster</h3>
                <p className="text-blue-300 text-sm">Earn up to +3% bonus from referrals</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Secure Platform</h3>
                <p className="text-blue-300 text-sm">Bank-grade security for your assets</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-[oklch(0.13_0.02_240)]">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <Image 
              src="/logo.jpg" 
              alt="Vortex Equality" 
              width={64} 
              height={64}
              className="mx-auto rounded-xl shadow-lg mb-4"
            />
            <h1 className="text-2xl font-bold text-white">Vortex Equality</h1>
            <p className="text-slate-400">Premium Trading Platform</p>
          </div>
          
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
            <p className="text-slate-400 mt-2">Sign in to access your trading dashboard</p>
          </div>

          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                required
                disabled={isPending}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/10 focus:border-blue-500/50"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  required
                  disabled={isPending}
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/10 focus:border-blue-500/50 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-lg shadow-blue-500/20"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6">
          </div>

          <p className="mt-8 text-center text-sm text-slate-400">
            {"Don't have an account?"}{' '}
            <a href="/auth/sign-up" className="font-semibold text-blue-400 hover:text-blue-300">
              Create Account
            </a>
          </p>
          
          <p className="mt-6 text-center text-xs text-slate-600">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
