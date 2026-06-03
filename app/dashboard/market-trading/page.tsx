import { TradingDashboard } from "@/components/trading-dashboard"
import { createClient } from "@/lib/supabase/server"

export default async function MarketTradingPage() {
  const supabase = await createClient()
  
  // Get today's profit rate from system settings or daily_profits
  let dailyProfitRate = 1.5 // Default
  
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data: profitData } = await supabase
      .from('daily_profits')
      .select('profit_percentage')
      .eq('profit_date', today)
      .single()
    
    if (profitData?.profit_percentage) {
      dailyProfitRate = profitData.profit_percentage
    }
  } catch (error) {
    // Use default rate
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <TradingDashboard dailyProfitRate={dailyProfitRate} />
    </div>
  )
}
