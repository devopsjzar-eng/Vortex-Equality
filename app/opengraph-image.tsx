import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Vortex Equality - Daily Profit Sharing Platform'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #0a0f0e 0%, #0d1f19 40%, #0a1a14 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow effect */}
        <div
          style={{
            position: 'absolute',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
            top: '-100px',
            left: '300px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)',
            bottom: '-100px',
            right: '100px',
          }}
        />

        {/* Logo Icon - V with spiral */}
        <div
          style={{
            width: '140px',
            height: '140px',
            borderRadius: '32px',
            background: 'linear-gradient(135deg, #0d2b22, #1a4a38)',
            border: '2px solid rgba(16,185,129,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
            boxShadow: '0 0 60px rgba(0,113,227,0.3)',
          }}
        >
          {/* V letter with spiral effect */}
          <div
            style={{
              fontSize: '80px',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #0071E3, #3B82F6)',
              backgroundClip: 'text',
              color: 'transparent',
              lineHeight: 1,
            }}
          >
            V
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: '800',
            color: '#ffffff',
            letterSpacing: '-1px',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          VORTEX{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #0071E3, #3B82F6)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            EQUALITY
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '28px',
            color: 'rgba(255,255,255,0.65)',
            fontWeight: '400',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginBottom: '48px',
          }}
        >
          Daily Profit Sharing Platform
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: '48px',
          }}
        >
          {[
            { label: 'Daily Profit', value: '1% - 2%' },
            { label: 'Min. Deposit', value: '$50' },
            { label: 'Sharing', value: '50 / 50' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(0,113,227,0.08)',
                border: '1px solid rgba(0,113,227,0.2)',
                borderRadius: '16px',
                padding: '16px 32px',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #0071E3, #3B82F6)',
                  backgroundClip: 'text',
                  color: 'transparent',
                  marginBottom: '6px',
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  fontSize: '16px',
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '1px',
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom domain */}
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            fontSize: '18px',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '1px',
          }}
        >
          vortexequality.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
