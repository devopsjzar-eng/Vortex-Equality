'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Landmark, ExternalLink, CheckCircle2, Wallet, Send, Clock } from 'lucide-react'

interface WithdrawalStats {
  pending_count: number
  pending_total: number
}

export default function TreasuryPage() {
  const [withdrawalStats, setWithdrawalStats] = useState<WithdrawalStats | null>(null)

  const fetchWithdrawalStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/withdrawal?status=pending')
      const data = await res.json()
      if (data.transactions) {
        const total = data.transactions.reduce((sum: number, t: any) => sum + (t.net_amount || 0), 0)
        setWithdrawalStats({ pending_count: data.transactions.length, pending_total: total })
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchWithdrawalStats()
  }, [fetchWithdrawalStats])

  const pendingTotal = withdrawalStats?.pending_total ?? 0
  const pendingCount = withdrawalStats?.pending_count ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Treasury (Lumbung Penarikan)</h1>
        <p className="text-sm text-slate-400 mt-1">Panduan monitoring saldo dan auto-payout via Bybit</p>
      </div>

      {/* Pending Withdrawal Alert */}
      {pendingCount > 0 && (
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-400">
              {pendingCount} Withdrawal Menunggu Persetujuan
            </p>
            <p className="text-xs text-blue-300 mt-1">
              Total: ${pendingTotal.toFixed(2)} USDT - Pastikan saldo Bybit cukup sebelum approve
            </p>
          </div>
        </div>
      )}

      {/* Status Auto-Payout */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              Status Auto-Payout
            </CardTitle>
            <Badge className="bg-blue-500/20 text-blue-400">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300">
            Auto-payout system is active. When Admin clicks <strong>Approve</strong> on the Withdrawals page, 
            the system will automatically send USDT from your Bybit account to member wallet.
          </p>
          <div className="mt-4 p-3 rounded-lg bg-slate-800 border border-slate-700">
            <p className="text-xs text-slate-400">Flow: Member Request → Admin Approve → Bybit Auto Send</p>
          </div>
        </CardContent>
      </Card>

      {/* Cara Monitor Saldo */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-1000 flex items-center justify-center text-black font-bold text-sm shrink-0">
              By
            </div>
            Cara Monitor Saldo Bybit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-300">
                Server Vercel diblokir oleh Bybit untuk monitoring saldo. 
                Namun <strong>auto-payout tetap berfungsi normal</strong> karena menggunakan endpoint berbeda.
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-300">
            Untuk melihat saldo lumbung, buka langsung di aplikasi atau website Bybit:
          </p>

          <div className="grid gap-3">
            {/* Opsi 1: Website */}
            <a 
              href="https://www.bybit.com/user/assets/home/spot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-white">Bybit Website</p>
                  <p className="text-xs text-slate-400">bybit.com → Assets → Spot</p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-400" />
            </a>

            {/* Opsi 2: Mobile App */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800 border border-slate-700">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-white">Bybit Mobile App</p>
                  <p className="text-xs text-slate-400">Buka App → Assets → Lihat saldo USDT</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alamat Deposit BEP20 */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-3">
            <Wallet className="h-5 w-5 text-purple-400" />
            Alamat Deposit BEP20 (BSC)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-300">
            Gunakan alamat ini untuk mengirimkan USDT via jaringan BSC (Binance Smart Chain):
          </p>
          
          <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
            <p className="text-xs text-slate-400 mb-2">Alamat BEP20 Bybit:</p>
            <div className="flex items-center justify-between gap-2 bg-slate-900 p-3 rounded border border-slate-600">
              <code className="text-sm font-mono text-purple-300 break-all">
                {process.env.NEXT_PUBLIC_BYBIT_BEP20_ADDRESS || '0x...'}
              </code>
              <button 
                onClick={() => {
                  const addr = process.env.NEXT_PUBLIC_BYBIT_BEP20_ADDRESS || ''
                  navigator.clipboard.writeText(addr)
                }}
                className="px-3 py-1 text-xs rounded bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-xs text-blue-300">
              💡 Tips: BSC memiliki biaya lebih murah dari TRC20, cocok untuk isi lumbung dalam jumlah besar
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alamat Deposit TRC20 */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-3">
            <Send className="h-5 w-5 text-blue-400" />
            Cara Isi Lumbung Penarikan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-300">
            Untuk mengisi saldo lumbung (agar auto-payout bisa berjalan):
          </p>

          <div className="space-y-3">
            {[
              {
                step: '1',
                title: 'Buka Bybit',
                desc: 'Login ke bybit.com atau buka aplikasi Bybit'
              },
              {
                step: '2', 
                title: 'Masuk ke Assets → Deposit',
                desc: 'Pilih coin USDT dan network TRC20 (Tron)'
              },
              {
                step: '3',
                title: 'Copy Alamat Deposit',
                desc: 'Salin alamat deposit USDT TRC20 yang ditampilkan'
              },
              {
                step: '4',
                title: 'Kirim USDT',
                desc: 'Dari exchange lain atau wallet, kirim USDT ke alamat tersebut'
              },
              {
                step: '5',
                title: 'Tunggu Konfirmasi',
                desc: 'Biasanya 1-5 menit untuk TRC20. Saldo akan muncul di Bybit.'
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Flow Penarikan */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Landmark className="h-5 w-5 text-slate-1000" />
            Flow Penarikan Member
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            'Member mengajukan penarikan dari dashboard mereka',
            'Admin melihat request di halaman Withdrawals',
            'Admin klik tombol Approve',
            'Sistem otomatis mengirim USDT dari Bybit ke wallet member',
            'Status berubah menjadi Success, member menerima dana',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-slate-1000/20 text-slate-400 flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base">Tips Penting</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              Selalu pastikan saldo Bybit cukup sebelum approve withdrawal
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              Cek saldo via app/website Bybit setiap hari
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              Jika auto-payout gagal (saldo kurang), sistem akan menampilkan error dan Anda bisa retry
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              Gunakan jaringan TRC20 untuk biaya transfer lebih murah
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
