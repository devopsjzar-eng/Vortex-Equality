export type Profile = {
  id: string
  email: string
  username: string | null
  full_name: string | null
  phone: string | null
  referral_code: string
  referred_by: string | null
  rank: 'Bronze' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5'
  total_deposit: number
  total_direct_referrals: number
  group_turnover: number
  booster_percentage: number
  is_admin: boolean
  created_at: string
  updated_at: string
}

export type Wallet = {
  id: string
  user_id: string
  wallet_type: 'asset' | 'bonus'
  balance: number
  total_profit_earned: number
  initial_capital: number
  cap_reached: boolean
  created_at: string
  updated_at: string
}

export type FinancialWallet = {
  user_id: string
  main_balance: number
  active_deposit: number
  network_bonus_balance: number
  unclaimed_profit: number
  total_claimed_profit: number
  total_withdrawn: number
  is_bep_reached: boolean
  is_maxed_out: boolean
  created_at: string
  updated_at: string
}

export type LedgerEntry = {
  id: string
  user_id: string | null
  related_user_id: string | null
  entry_type: string
  amount: number
  balance_after: number | null
  description: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
}

export type Transaction = {
  id: string
  user_id: string
  wallet_type: 'asset' | 'bonus'
  type: 'deposit' | 'withdrawal' | 'profit_claim' | 'referral_bonus' | 'rank_reward' | 'admin_credit'
  amount: number
  fee: number
  net_amount: number
  status: 'pending' | 'success' | 'failed' | 'expired'
  external_ref: string | null
  crypto_address: string | null
  admin_notes: string | null
  receipt_data: ReceiptData | null
  created_at: string
  updated_at: string
}

export type ReceiptData = {
  receipt_id: string
  generated_at: string
  user_name: string
  user_email: string
  transaction_type: string
  amount: number
  fee: number
  net_amount: number
  status: string
}

export type DailyProfit = {
  id: string
  profit_date: string
  global_profit_percentage: number
  company_share: number
  member_share: number
  distribution_time: string | null
  expiry_time: string | null
  created_at: string
}

export type ProfitClaim = {
  id: string
  user_id: string
  daily_profit_id: string
  base_percentage: number
  booster_percentage: number
  total_percentage: number
  amount: number
  status: 'available' | 'claimed' | 'expired'
  claimed_at: string | null
  created_at: string
}

export type Referral = {
  id: string
  inviter_id: string
  invitee_id: string
  invitee_deposit: number
  inviter_deposit_at_time: number
  qualifies_for_booster: boolean
  booster_applied: boolean
  created_at: string
}

export type SystemSetting = {
  id: string
  key: string
  value: string | number | boolean
  description: string | null
  updated_at: string
  updated_by: string | null
}

export type RankRequirements = {
  P1: { direct_referrals: number; group_investment: number; personal_investment: number; legs_required: number; leg_investment: number; salary: number }
  P2: { direct_referrals: number; group_investment: number; personal_investment: number; legs_required: number; leg_investment: number; salary: number }
  P3: { direct_referrals: number; group_investment: number; personal_investment: number; legs_required: number; leg_investment: number; salary: number }
  P4: { direct_referrals: number; group_investment: number; personal_investment: number; legs_required: number; leg_investment: number; salary: number }
  P5: { direct_referrals: number; group_investment: number; personal_investment: number; legs_required: number; leg_investment: number; salary: number }
}

export const RANK_REQUIREMENTS: RankRequirements = {
  P1: { direct_referrals: 5, group_investment: 5000, personal_investment: 50, legs_required: 0, leg_investment: 0, salary: 100 },
  P2: { direct_referrals: 0, group_investment: 15000, personal_investment: 200, legs_required: 3, leg_investment: 5000, salary: 300 },
  P3: { direct_referrals: 0, group_investment: 45000, personal_investment: 600, legs_required: 3, leg_investment: 15000, salary: 500 },
  P4: { direct_referrals: 0, group_investment: 135000, personal_investment: 1000, legs_required: 3, leg_investment: 45000, salary: 3000 },
  P5: { direct_referrals: 0, group_investment: 300000, personal_investment: 2000, legs_required: 3, leg_investment: 100000, salary: 5000 },
}

export const RANK_REWARDS: Record<string, number> = {
  P1: 100,
  P2: 300,
  P3: 500,
  P4: 3000,
  P5: 5000,
}
