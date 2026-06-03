'use client'

export default function FlyerPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans"
      style={{ background: '#030712' }}>

      {/* FLYER — optimal for WhatsApp/Instagram screenshot */}
      <div className="relative w-full overflow-hidden"
        style={{
          maxWidth: '430px',
          background: 'linear-gradient(145deg, #06101f 0%, #07111f 40%, #050d1a 100%)',
          border: '1px solid rgba(59,130,246,0.18)',
          borderRadius: '24px',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.8)',
        }}>

        {/* subtle grid bg */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(99,179,237,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,179,237,1) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        {/* top glow orb */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-40 opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #3b82f6 0%, transparent 70%)', filter: 'blur(20px)' }} />

        <div className="relative z-10 flex flex-col">

          {/* ── HEADER ── */}
          <div className="flex flex-col items-center px-8 pt-9 pb-7"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Logo mark */}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                boxShadow: '0 0 0 1px rgba(96,165,250,0.3), 0 8px 32px rgba(37,99,235,0.45)',
              }}>
              <span className="text-white font-black text-xl tracking-tighter">VE</span>
            </div>
            <p className="text-[10px] tracking-[0.35em] text-blue-400 uppercase font-semibold mb-1">Platform Investasi</p>
            <h1 className="text-white text-[28px] font-black tracking-tight leading-none text-center"
              style={{ textShadow: '0 0 40px rgba(96,165,250,0.3)' }}>
              VORTEX EQUALITY
            </h1>
            <p className="text-slate-500 text-xs mt-1.5 text-center">Trading Saham &amp; Emas — Profesional</p>
          </div>

          {/* ── ROI HERO ── */}
          <div className="mx-6 mt-6 rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.13) 0%, rgba(16,185,129,0.04) 100%)',
              border: '1px solid rgba(16,185,129,0.28)',
            }}>
            <div className="absolute right-3 top-3 text-[64px] leading-none opacity-[0.07] font-black select-none text-blue-300">%</div>
            <p className="text-[10px] tracking-[0.3em] text-blue-400 uppercase font-semibold mb-1">ROI Harian</p>
            <div className="flex items-end gap-1 mb-1">
              <span className="font-black text-[52px] leading-none"
                style={{ color: '#0071E3', textShadow: '0 0 30px rgba(0,113,227,0.6)' }}>1–2</span>
              <span className="font-bold text-2xl text-blue-400 mb-2">%</span>
              <span className="text-slate-400 text-sm mb-2 ml-1">per hari</span>
            </div>
            <p className="text-slate-400 text-xs">Distribusi otomatis setiap <span className="text-white font-semibold">10:00 WIB</span> · Klaim sebelum <span className="text-white font-semibold">00:00</span></p>
          </div>

          {/* ── SIMULASI ── */}
          <div className="mx-6 mt-4 rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(59,130,246,0.15)' }}>
            <div className="px-4 py-2.5 flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.1)', borderBottom: '1px solid rgba(59,130,246,0.15)' }}>
              <p className="text-[10px] text-blue-300 font-bold tracking-[0.25em] uppercase">Simulasi Keuntungan / Bulan</p>
            </div>
            <div>
              {/* col header */}
              <div className="grid grid-cols-3 px-4 py-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Modal</p>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider text-center">Per Hari</p>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider text-right">Per Bulan</p>
              </div>
              {[
                { modal: '$100', hari: '$1 – $2', bulan: '$30 – $60', hot: false },
                { modal: '$500', hari: '$5 – $10', bulan: '$150 – $300', hot: false },
                { modal: '$1,000', hari: '$10 – $20', bulan: '$300 – $600', hot: true },
                { modal: '$5,000', hari: '$50 – $100', bulan: '$1,500 – $3,000', hot: false },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-3 px-4 py-3 items-center"
                  style={{
                    background: row.hot ? 'rgba(59,130,246,0.07)' : i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                  }}>
                  <p className="text-white font-bold text-sm">
                    {row.modal}
                    {row.hot && <span className="ml-1 text-[9px] text-blue-400 bg-blue-400/15 px-1.5 py-0.5 rounded-full">TOP</span>}
                  </p>
                  <p className="text-blue-300 text-sm text-center">{row.hari}</p>
                  <p className="text-blue-400 font-bold text-sm text-right">{row.bulan}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── BONUS SPONSOR ── */}
          <div className="mx-6 mt-4">
            <p className="text-[10px] tracking-[0.3em] text-blue-400 uppercase font-semibold mb-3">Bonus Referral Autopilot</p>
            <div className="flex gap-2.5">
              {[
                { lvl: 'L1', label: 'Direct', pct: '8%', c: '#f97316', bg: 'rgba(249,115,22,0.1)', bc: 'rgba(249,115,22,0.3)' },
                { lvl: 'L2', label: 'Level 2', pct: '5%', c: '#fb923c', bg: 'rgba(251,146,60,0.07)', bc: 'rgba(251,146,60,0.2)' },
                { lvl: 'L3', label: 'Level 3', pct: '2%', c: '#fdba74', bg: 'rgba(253,186,116,0.05)', bc: 'rgba(253,186,116,0.15)' },
              ].map((b, i) => (
                <div key={i} className="flex-1 rounded-xl p-3 text-center"
                  style={{ background: b.bg, border: `1px solid ${b.bc}` }}>
                  <p className="text-slate-500 text-[10px] mb-1">{b.lvl}</p>
                  <p className="font-black text-[22px] leading-none" style={{ color: b.c, textShadow: `0 0 16px ${b.c}80` }}>{b.pct}</p>
                  <p className="text-slate-500 text-[10px] mt-1">{b.label}</p>
                </div>
              ))}
            </div>
            {/* Booster strip */}
            <div className="mt-2.5 rounded-xl px-4 py-2.5 flex items-center justify-between"
              style={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)' }}>
              <div>
                <p className="text-slate-400 text-xs font-bold">Strategic Booster</p>
                <p className="text-slate-500 text-[10px]">+0.2% per referral qualifying · maks 3%</p>
              </div>
              <p className="text-slate-400 font-black text-xl" style={{ textShadow: '0 0 12px rgba(234,179,8,0.5)' }}>+3%</p>
            </div>
          </div>

          {/* ── LEADERSHIP RANK ── */}
          <div className="mx-6 mt-4">
            <p className="text-[10px] tracking-[0.3em] text-slate-400 uppercase font-semibold mb-3">Leadership Rank &amp; Monthly Salary</p>
            <div className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(234,179,8,0.15)' }}>
              {[
                { rank: 'P1 SPARK', syarat: '5 Direct · $5K', gaji: '$100', c: '#94a3b8' },
                { rank: 'P2', syarat: '3 Legs P1 · $15K', gaji: '$300', c: '#60a5fa' },
                { rank: 'P3', syarat: '3 Legs P2 · $45K', gaji: '$500', c: '#34d399' },
                { rank: 'P4', syarat: '3 Legs P3 · $135K', gaji: '$3,000', c: '#fbbf24' },
                { rank: 'P5 ELITE', syarat: '3 Legs P4 · $300K', gaji: '$5,000', c: '#f472b6' },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5"
                  style={{
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: i === 4 ? 'rgba(244,114,182,0.05)' : 'transparent',
                  }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: r.c, boxShadow: `0 0 6px ${r.c}` }} />
                    <p className="text-white text-xs font-bold">{r.rank}</p>
                  </div>
                  <p className="text-slate-500 text-[11px] flex-1 ml-3">{r.syarat}</p>
                  <p className="font-bold text-sm" style={{ color: r.c }}>{r.gaji}<span className="text-slate-600 text-[10px] font-normal">/mo</span></p>
                </div>
              ))}
            </div>
          </div>

          {/* ── HIGHLIGHTS PILLS ── */}
          <div className="mx-6 mt-4 flex flex-wrap gap-2">
            {[
              { label: 'Modal Min $50', c: '#0071E3' },
              { label: 'ROI Maks 3%/hari', c: '#3b82f6' },
              { label: 'Profit Maks 400%', c: '#f97316' },
              { label: 'WD Kapan Saja', c: '#a78bfa' },
              { label: 'Deposit USDT', c: '#fbbf24' },
            ].map((p, i) => (
              <div key={i} className="px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: `${p.c}15`, border: `1px solid ${p.c}35`, color: p.c }}>
                {p.label}
              </div>
            ))}
          </div>

          {/* ── CTA ── */}
          <div className="mx-6 mt-5 mb-7">
            <div className="rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(29,78,216,0.25) 0%, rgba(37,99,235,0.1) 100%)',
                border: '1px solid rgba(96,165,250,0.3)',
                boxShadow: '0 0 40px rgba(59,130,246,0.1)',
              }}>
              <div className="px-5 py-4 text-center">
                <p className="text-slate-400 text-xs mb-1">Free registration via referral link</p>
                <p className="text-white font-bold text-[13px] tracking-wide mb-3">vortex-equality.vercel.app</p>
                <div className="inline-block px-6 py-2 rounded-xl"
                  style={{
                    background: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
                    boxShadow: '0 4px 20px rgba(37,99,235,0.45)',
                  }}>
                  <p className="text-white text-xs font-bold tracking-[0.15em] uppercase">Register Now</p>
                </div>
                
                {/* WhatsApp Contact */}
                <a 
                  href="https://wa.me/34912345678"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-medium"
                  style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp Support
                </a>
              </div>
              <div className="px-5 py-3 flex items-center justify-between"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" style={{ boxShadow: '0 0 6px #0071E3' }} />
                  <p className="text-blue-400 text-[11px] font-semibold">Platform Active</p>
                </div>
                <p className="text-slate-600 text-[10px]">© 2026 Vortex Equality</p>
                <p className="text-slate-600 text-[10px]">Invest Smart.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
