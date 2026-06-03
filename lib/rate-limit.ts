import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// Initialize Redis client
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Rate limiters for different use cases

// Login: 5 attempts per 15 minutes per IP
export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'ratelimit:login',
  analytics: true,
})

// Register: 3 attempts per hour per IP
export const registerRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'ratelimit:register',
  analytics: true,
})

// Forgot Password: 3 attempts per hour per IP
export const forgotPasswordRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'ratelimit:forgot-password',
  analytics: true,
})

// General API: 100 requests per minute per IP
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'ratelimit:api',
  analytics: true,
})

// Claim Profit: 10 attempts per minute per user
export const claimProfitRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'ratelimit:claim-profit',
  analytics: true,
})

// Deposit: 10 attempts per minute per user
export const depositRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'ratelimit:deposit',
  analytics: true,
})

// Withdrawal: 5 attempts per minute per user
export const withdrawalRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'ratelimit:withdrawal',
  analytics: true,
})

// Admin actions: 30 requests per minute per admin
export const adminRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'ratelimit:admin',
  analytics: true,
})

// Helper function to get IP from request headers
export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}

// Helper function to create rate limit response
export function rateLimitResponse(reset: number) {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000)
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(reset),
      },
    }
  )
}
