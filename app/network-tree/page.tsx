'use client'

export default function NetworkTree() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Pohon Jaringan Network</h1>
        <p className="text-slate-300 mb-8">Struktur lengkap sponsor dan member</p>

        {/* ROOT */}
        <div className="space-y-12">
          {/* LEVEL 0 - ROOT */}
          <div className="flex flex-col items-center">
            <div className="bg-yellow-500 text-black px-8 py-4 rounded-lg font-bold text-lg shadow-lg">
              🏆 RUDI (ROOT)
              <div className="text-sm">vortex2026saham@gmail.com</div>
              <div className="text-xs mt-1">Top Sponsor</div>
            </div>

            {/* Line down */}
            <div className="w-1 h-8 bg-yellow-500"></div>

            {/* LEVEL 1 - DIRECT SPONSORS */}
            <div className="flex gap-12 justify-center flex-wrap mb-8">
              {/* Rudi Ricardo */}
              <div className="flex flex-col items-center">
                <div className="bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg">
                  RUDI RICARDO
                  <div className="text-xs mt-1">11 members</div>
                  <div className="text-xs">$3,394</div>
                </div>
                <div className="w-1 h-6 bg-blue-500"></div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Aigayanti</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Baik Martua</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Fardiansyah</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Hengki</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Lilis</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Meutya</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Siregar</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Tiodorlan</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">+2 more</div>
                </div>
              </div>

              {/* Marika verolina */}
              <div className="flex flex-col items-center">
                <div className="bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg">
                  MARIKA VEROLINA
                  <div className="text-xs mt-1">8 members</div>
                  <div className="text-xs">$100</div>
                </div>
                <div className="w-1 h-6 bg-blue-500"></div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Herawati</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Jenni</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">M. Fahrudi</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Muhammad</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Nur</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">+3 more</div>
                </div>
              </div>

              {/* Aigayanti */}
              <div className="flex flex-col items-center">
                <div className="bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg">
                  AIGAYANTI
                  <div className="text-xs mt-1">6 members</div>
                  <div className="text-xs">$2,390</div>
                </div>
                <div className="w-1 h-6 bg-blue-500"></div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Aida</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Basyariah</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Meutya</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Susi</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Wan</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">+1 more</div>
                </div>
              </div>
            </div>

            {/* LEVEL 1 - TIER 2 */}
            <div className="flex gap-12 justify-center flex-wrap">
              {/* Siregar */}
              <div className="flex flex-col items-center">
                <div className="bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg">
                  SIREGAR
                  <div className="text-xs mt-1">5 members</div>
                  <div className="text-xs">$1,492</div>
                </div>
                <div className="w-1 h-6 bg-blue-500"></div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Neni</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Tio</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Tiolan</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Wahyu</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Yusnan</div>
                </div>
              </div>

              {/* Mulatsih */}
              <div className="flex flex-col items-center">
                <div className="bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg">
                  MULATSIH
                  <div className="text-xs mt-1">4 members</div>
                  <div className="text-xs">$200</div>
                </div>
                <div className="w-1 h-6 bg-blue-500"></div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Herawati</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Marika</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Trimurti</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Zulfitria</div>
                </div>
              </div>

              {/* Lilis Ribkayani */}
              <div className="flex flex-col items-center">
                <div className="bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg">
                  LILIS
                  <div className="text-xs mt-1">3 members</div>
                  <div className="text-xs">$402</div>
                </div>
                <div className="w-1 h-6 bg-blue-500"></div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Alexius</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Irwansyah</div>
                  <div className="bg-green-500 text-white px-3 py-2 rounded text-xs">Yayat</div>
                </div>
              </div>
            </div>
          </div>

          {/* LEGEND & INFO */}
          <div className="mt-16 bg-slate-700 p-8 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-4">📊 Ringkasan Network:</h2>
            <div className="grid grid-cols-2 gap-4 text-white">
              <div>
                <p className="text-sm text-slate-300">Total Sponsors Level 1:</p>
                <p className="text-2xl font-bold">20 orang</p>
              </div>
              <div>
                <p className="text-sm text-slate-300">Total Active Members:</p>
                <p className="text-2xl font-bold">62 orang</p>
              </div>
              <div>
                <p className="text-sm text-slate-300">Total Deposit Network:</p>
                <p className="text-2xl font-bold">~$15,000</p>
              </div>
              <div>
                <p className="text-sm text-slate-300">Orphan Members (No Sponsor):</p>
                <p className="text-2xl font-bold">8 orang</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-600 rounded">
              <p className="text-yellow-300 text-sm">
                <strong>⚠️ PERHATIAN:</strong> Grafik di atas menunjukkan TOP SPONSORS saja. 
                Total ada 20 sponsors dengan masing-masing direct members.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
