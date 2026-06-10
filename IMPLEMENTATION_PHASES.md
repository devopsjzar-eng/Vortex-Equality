# Vortex Equality Staging Implementation Tracker

This tracker is the working map for the final Part 1 backend blueprint, Part 2 UI/member dashboard blueprint, and the responsiveness/performance follow-up.

Legend:
- [x] Implemented in staging codebase
- [~] Partially implemented; needs refinement or final verification
- [ ] Not implemented yet

## Blueprint Receipt

- [x] Part 1 backend logic received and reviewed.
- [x] Part 2 UI/UX and member dashboard requirements received and reviewed.
- [x] Final responsiveness/performance follow-up received and reviewed.
- [x] Staging-only rule acknowledged.
- [x] Latest critical mechanics follow-up received: Plisio-only deposits/payouts, no Bybit, no user-side auto-withdrawal, admin-controlled payout approval, mass payout, reject scrub, temporary $1 staging deposit minimum.

## Current Implementation Summary

Already implemented:
- Staging Supabase project/env template and staging migrations.
- Financial wallet model: main balance, active deposit, network bonus balance, unclaimed profit, total claimed, total withdrawn, BEP state, max-out state.
- Deposit/top-up RPC: `apply_user_top_up`.
- Daily profit run/allocation tables and admin trigger RPC.
- Locked profit claim RPC with `FOR UPDATE`.
- Unique claim protection on `(user_id, claim_date)`.
- Withdrawal RPC with 20%/5% BEP dynamic fee for main wallet.
- Ledger entries for core financial movements.
- Plisio invoice route, stored crypto deposit orders, and callback top-up integration.
- Saved user crypto wallet table/API.
- Referral edges, referral tree RPC/API, and basic genealogy UI.
- Admin logs table/API/page.
- Admin deposit/withdrawal pages wired to financial tables.
- Admin ban/unban.
- Activity history API/page from `ledger_entries`.
- Referral correction in staging: `aigakaya72@gmail.com` moved under `aigayantiahmad@gmail.com`.

Major remaining gaps:
- Plisio confirmed callback/top-up/sponsor bonus needs end-to-end test with real/sandbox confirmation.
- Plisio payout approval/global payout needs end-to-end provider test with live/sandbox funds.
- Final P1-P5 recurring monthly salary logic is added at DB/RPC level; staging migration still needs to be pushed and tested.
- Premium receipt after successful Plisio payment confirmation.
- Responsive/performance pass across mobile/tablet/desktop.
- Final stress tests and staging deployment test.

## Phase 0: Staging Isolation

- [x] Create staging Supabase project.
- [x] Add staging env template without committing real secrets.
- [x] Add staging financial migrations.
- [x] Import/reconcile production-compatible schema names in staging.
- [x] Repair referral placement for `aigakaya72@gmail.com` under `aigayantiahmad@gmail.com` in staging.
- [ ] Connect Vercel preview/staging deployment to staging Supabase env vars.
- [ ] Confirm staging URL uses staging Supabase only.

## Phase 1: Core Financial Safety

- [x] Add `financial_wallets`.
- [x] Add main wallet, active deposit, network bonus wallet, unclaimed profit, total claimed, total withdrawn, BEP state, max-out state.
- [x] Add `financial_deposits`.
- [x] Add `profit_runs` and `profit_allocations`.
- [x] Add `financial_profit_claims`.
- [x] Add unique `(user_id, claim_date)` protection.
- [x] Add locked claim RPC using `FOR UPDATE`.
- [x] Add top-up RPC that recalculates BEP and 400% max limit.
- [x] Add maxed-out state and skip maxed users in daily profit allocation.
- [x] Add withdrawal RPC with 20%/5% dynamic fee for main wallet.
- [x] Add ledger entries for balance-changing actions.
- [x] Wire claim API to `claim_unclaimed_profit`.
- [x] Wire admin profit trigger API to `trigger_daily_profit`.
- [x] Wire withdrawal API to `request_withdrawal`.
- [x] Wire deposit/webhook confirmation to `apply_user_top_up`.
- [~] Strict Anti-Leak implemented at DB/RPC level; still needs 100-concurrent-request stress test.
- [x] Enforce daily profit percentage range: 1% to 2%.
- [x] Enforce admin distribution window: 01:00 AM to 09:59 AM WIB.
- [x] Implement overwrite rule before 10:00 AM WIB: latest percentage replaces earlier percentage for same date.
- [x] Lock daily percentage after 10:00 AM WIB.
- [x] Enforce claim window: 10:00 AM to 00:00 AM WIB.
- [x] Active Asset withdrawal logic: capital withdrawal decreases `active_deposit`, future profit base, and 400% ceiling.
- [x] Bonus Wallet withdrawal logic: flat 5% fee always.
- [ ] Apply and verify Phase 1 rules migration on staging.

## Phase 2: Deposits, Wallets, Automation

- [x] Add `crypto_deposit_orders`.
- [x] Add `user_crypto_wallets`.
- [x] Update dashboard UI to read `financial_wallets`.
- [x] Deposit flow creates Plisio invoice orders and stores `crypto_deposit_orders`.
- [x] Plisio callback updates order state and calls `apply_user_top_up` idempotently.
- [x] Add Plisio API base URL support through `PLISIO_API_BASE_URL`.
- [x] Add saved user crypto wallet API and withdrawal-page integration.
- [x] Remove obsolete Bybit auto-withdraw provider payout integration after request creation.
- [x] Ensure user withdrawal request only creates a pending withdrawal and does not call any payout API.
- [x] Add Plisio payout helper for admin-triggered withdrawal approval.
- [x] Wire Admin Approve button to Plisio payout API.
- [x] Add Admin Global Payout button for all pending withdrawals.
- [x] Record Plisio payout id/status/error on `financial_withdrawals`.
- [~] Plisio code is implemented; real provider testing is pending with confirmed Plisio merchant payout capability and funds.
- [x] Deposit page 15-minute live countdown.
- [ ] Auto-expire unpaid deposit order after 15 minutes.
- [ ] Deposit success polling or realtime state transition on payment page.
- [ ] Premium receipt after successful IPN/payment confirmation.
- [ ] Confirm sponsor bonuses trigger instantly on every deposit/top-up in end-to-end provider test.
- [x] Temporarily set staging Plisio minimum deposit to $1 for security testing.
- [ ] Restore production/live minimum deposit to $50 before final production release.

## Phase 3: Network, Logs, Admin

- [x] Add `referral_edges`.
- [x] Add referral tree RPC.
- [x] Add admin logs table.
- [x] Add ban/unban RPC.
- [x] Add referral tree API backed by `get_referral_tree`.
- [x] Wire referral/genealogy UI to referral tree API.
- [x] Add activity history API backed by `ledger_entries`.
- [x] Wire activity history UI to activity API.
- [x] Add admin ban/unban API endpoint backed by `set_user_ban_status`.
- [x] Wire admin user table to ban/unban API.
- [x] Wire admin master log to `ledger_entries` and `admin_logs`.
- [x] Wire admin deposit list/actions to `crypto_deposit_orders` and `financial_deposits`.
- [x] Wire admin withdrawal list/actions to `financial_withdrawals`.
- [x] Wire admin overview counters to financial tables.
- [~] Emergency upline shifter exists at DB function level (`set_referral_sponsor`); needs polished admin UI.
- [~] Log scrubbing partially exists through ledger source; needs final reject/delete scrub rules for every affected action.
- [ ] Real-time global tracker for deposits, withdrawals, profit distributed, company revenue.
- [ ] Balance injection with 3 options:
  - [ ] Real Deposit, triggers sponsor bonus.
  - [ ] Asset Only, no sponsor bonus.
  - [ ] Bonus Wallet Only.
- [ ] Maintenance mode enforcement across public/member routes.
- [ ] Admin delete balance/profit with automatic related history scrub.

## Phase 4: P1-P5 Rank And Monthly Salary

- [x] Create final rank rules source of truth:
  - [x] P1 Spark: $100/month, 5 directs, group volume $5K, personal asset $50.
  - [x] P2: $300/month, 3 legs at $5K, group volume $15K, personal asset $200.
  - [x] P3: $500/month, 3 legs at $15K, group volume $45K, personal asset $600.
  - [x] P4: $3,000/month, 3 legs at $45K, group volume $135K, personal asset $1,000.
  - [x] P5 Elite: $5,000/month, 3 legs at $100K, group volume $300K, personal asset $2,000.
- [x] Calculate group volume from real downline active deposits only.
- [x] Recalculate group volume in real time when progress/claim RPC runs, based on current `financial_wallets.active_deposit`.
- [x] Calculate 3 biggest legs in real time.
- [x] Rank progress API for total group volume and 3 biggest leg breakdown.
- [x] Monthly salary claim table/RPC.
- [x] 30-day claim lock after salary claim.
- [x] Immediate unlock when user ranks up before 30 days.
- [x] Personal active asset warning if group volume qualifies but personal asset is too low.
- [x] Penalty rule: if user claims, withdraws below rank requirement, then tops up again, next monthly claim is suspended by 1 full month.
- [x] UI progress bars and claim button states wired on rewards page.
- [x] Career and Rank pages now use the same DB-backed rank progress source.
- [x] Disabled legacy automatic monthly rank cron payout so it cannot bypass claim-cycle rules.
- [x] Updated user-facing rank help copy from one-time/automatic payout to recurring claim-based salary.
- [ ] Avatar/profile badge evolution from P1 to P5.
- [ ] Apply and verify Phase 4 rank migrations on staging.

## Phase 5: Security, Registration, PIN, OTP

- [x] Password reset OTP exists and is tagged with password-reset purpose.
- [x] Email uniqueness is handled by Supabase Auth.
- [x] Username uniqueness enforced with `profiles.username` unique index and registration validation.
- [x] Registration requires 6-digit withdrawal PIN.
- [x] Store withdrawal PIN securely as PostgreSQL `crypt()` hash, never plaintext.
- [x] Withdrawal requires 6-digit PIN verification before request creation.
- [ ] OTP required to reset/change password.
- [x] OTP required to reset/change withdrawal PIN.
- [x] Sponsor username/code field is readonly/locked on registration.
- [x] One Account Policy: 1 Email = 1 Account, 1 Username = 1 Account.
- [ ] KYC optional profile completion only; must not block withdrawal.
- [ ] Apply and verify Phase 5 security migration on staging.

## Phase 6: Member UI/UX Apple Matte Solid

- [x] Dashboard shell updated with matte/dark UI and responsive max-width content.
- [x] Removed shared third-party/template provider branding from dashboard shell and market simulation footer.
- [x] Favicon and app icons point to Vortex logo assets.
- [x] Removed the visible language selector and forced dashboard UI to English.
- [x] Kept existing sidebar/navbar structure.
- [x] Applied Apple Matte Solid base palette: deep charcoal/true black, premium flat surfaces.
- [~] Removed neon/glowing borders and excessive gradients from shared shell, deposit, withdrawal, and claim surfaces.
- [x] Made Claim Profit button luxurious and premium.
- [x] Refined market simulation footer/copy to Vortex-only branding.
- [x] Deposit page timer/expired UI.
- [x] Withdrawal page masked wallet address with eye reveal.
- [x] Withdrawal page dynamic fee indicator: 20% or 5% based on BEP.
- [x] Withdrawal page PIN input.
- [ ] Activity history premium table for profit, deposits, withdrawals, sponsor bonuses.
- [ ] Auto-scrub rejected withdrawal/deleted data from user activity history.

## Phase 7: Team And Genealogy UI

- [~] Basic referral tree API/UI exists.
- [ ] Luxurious expandable graphical Genealogy Tree.
- [ ] Show downline levels 1, 2, 3.
- [ ] Show downline active asset in real time.
- [ ] Optimize tree query to avoid heavy recursive client fetching.
- [ ] Rank tracking UI with total group volume.
- [ ] Three biggest legs breakdown.
- [ ] Mobile-friendly tree interaction without horizontal overflow.

## Phase 8: Responsiveness And Performance

- [ ] Full mobile audit: small Android, iPhone, tablet, desktop.
- [ ] Eliminate broken layouts, overlapping text, cut-off buttons.
- [ ] Eliminate forced horizontal scrolling on mobile.
- [ ] Responsive admin tables/cards/modals.
- [ ] Responsive genealogy tree.
- [ ] Optimize dashboard Supabase queries to fetch only required fields.
- [ ] Optimize activity history pagination/limits.
- [ ] Optimize genealogy query and rendering.
- [ ] Add loading states/skeletons where needed.
- [ ] Verify performance on mobile data.

## Phase 9: Final Verification

- [ ] Test double-claim prevention with 100 concurrent requests.
- [ ] Test daily profit overwrite before 10:00 AM WIB.
- [ ] Test daily profit lock after 10:00 AM WIB.
- [ ] Test claim only works 10:00 AM to 00:00 AM WIB.
- [ ] Test top-up recalculates BEP and max limit.
- [ ] Test active asset withdrawal decreases active deposit and future profit base.
- [ ] Test maxed-out users stop receiving profits.
- [ ] Test top-up reverses user from 5% fee zone to 20%.
- [ ] Test bonus wallet flat 5% withdrawal.
- [ ] Test admin rejected withdrawal refunds 100% gross and scrubs pending user history.
- [ ] Test Plisio invoice/callback end-to-end after valid Plisio secret key is available.
- [ ] Test Plisio admin single withdrawal approval sends exact net amount.
- [ ] Test Plisio admin mass payout sends exact net amount for all pending withdrawals.
- [ ] Test user withdrawal request remains pending and does not auto-payout.
- [ ] Test sponsor bonuses across levels 1, 2, 3.
- [ ] Test P1-P5 rank qualification, claim cycle, rank-up unlock, and penalty suspension.
- [ ] Test registration username/email/PIN/referral lock.
- [ ] Test OTP password and PIN reset.
- [ ] Test admin logs/master logs.
- [ ] Test staging deployment end-to-end on multiple devices.
