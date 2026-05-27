'use client'

import type { BiometryUiTheme } from '@/app/lib/biometry-theme'

interface AnatomicalGuideProps {
  side: 'OD' | 'OE'
  theme?: BiometryUiTheme
}

export function AnatomicalGuide({ side, theme = 'dark' }: AnatomicalGuideProps) {
  const isOE = side === 'OE'
  const stroke = theme === 'light' ? '#94a3b8' : 'white'

  return (
    <div style={{
      display: 'flex',
      flexDirection: isOE ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      opacity: theme === 'light' ? 0.85 : 0.6,
      marginBottom: '0.5rem',
      padding: '0.5rem',
    }}>
      <div style={{ position: 'relative', width: 60, height: 40 }}>
        <svg viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 30C10 30 30 10 50 10C70 10 90 30 90 30C90 30 70 50 50 50C30 50 10 30 10 30Z" stroke={stroke} strokeWidth="2" />
          <circle cx="50" cy="30" r="15" stroke={stroke} strokeWidth="2" />
          <circle cx="50" cy="30" r="7" fill={stroke} />
        </svg>
      </div>
      <div style={{ width: 20, height: 40, transform: isOE ? 'rotateY(180deg)' : 'none' }}>
        <svg viewBox="0 0 40 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 10C10 10 35 30 25 50C15 70 5 70 5 70" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{
        fontSize: '0.7rem',
        fontWeight: 700,
        color: side === 'OD' ? '#f29121' : '#71ba66',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        {side === 'OD' ? 'Olho Direito' : 'Olho Esquerdo'}
      </div>
    </div>
  )
}
