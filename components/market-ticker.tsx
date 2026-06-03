'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface TickerItem {
  symbol: string
  name: string
  price: string
  change: number
  icon: string
}

const marketData: TickerItem[] = [
  // Crypto
  { symbol: 'BTC', name: 'Bitcoin', price: '67,845.20', change: 2.45, icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', price: '3,456.78', change: 1.82, icon: 'Ξ' },
  { symbol: 'SOL', name: 'Solana', price: '178.34', change: 4.21, icon: '◎' },
  { symbol: 'BNB', name: 'BNB', price: '612.45', change: -0.58, icon: '⬡' },
  { symbol: 'XRP', name: 'Ripple', price: '0.5234', change: 1.15, icon: '✕' },
  // Commodities
  { symbol: 'XAU', name: 'Gold', price: '2,345.60', change: 0.78, icon: '🥇' },
  { symbol: 'XAG', name: 'Silver', price: '27.85', change: -0.32, icon: '🥈' },
  // Stocks Index
  { symbol: 'SPX', name: 'S&P 500', price: '5,234.18', change: 0.45, icon: '📈' },
  { symbol: 'DJI', name: 'Dow Jones', price: '39,127.80', change: 0.28, icon: '📊' },
  { symbol: 'NDX', name: 'Nasdaq', price: '18,456.32', change: 1.12, icon: '💹' },
]

export function MarketTicker() {
  const [data, setData] = useState<TickerItem[]>(marketData)

  // Simulate live price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => prev.map(item => {
        // Random small price fluctuation (-0.5% to +0.5%)
        const fluctuation = (Math.random() - 0.5) * 0.01
        const currentPrice = parseFloat(item.price.replace(/,/g, ''))
        const newPrice = currentPrice * (1 + fluctuation)
        
        // Format price back
        let formattedPrice: string
        if (newPrice >= 1000) {
          formattedPrice = newPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        } else if (newPrice >= 1) {
          formattedPrice = newPrice.toFixed(2)
        } else {
          formattedPrice = newPrice.toFixed(4)
        }

        // Slightly adjust change percentage
        const changeFluctuation = (Math.random() - 0.5) * 0.1
        const newChange = Math.max(-10, Math.min(10, item.change + changeFluctuation))

        return {
          ...item,
          price: formattedPrice,
          change: parseFloat(newChange.toFixed(2))
        }
      }))
    }, 3000) // Update every 3 seconds

    return () => clearInterval(interval)
  }, [])

  // Duplicate items for seamless loop
  const duplicatedData = [...data, ...data]

  return (
    <div className="relative w-full overflow-hidden border-b border-border/50 bg-slate-950/80 backdrop-blur-sm">
      <div className="flex animate-marquee whitespace-nowrap py-1.5">
        {duplicatedData.map((item, index) => (
          <div
            key={`${item.symbol}-${index}`}
            className="mx-4 flex items-center gap-1.5 text-xs"
          >
            <span className="text-sm opacity-70">{item.icon}</span>
            <span className="font-medium text-slate-300">{item.symbol}</span>
            <span className="text-slate-400">${item.price}</span>
            <span className={`flex items-center gap-0.5 font-medium ${
              item.change >= 0 ? 'text-blue-400' : 'text-rose-400'
            }`}>
              {item.change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
