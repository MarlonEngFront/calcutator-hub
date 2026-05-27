export type BiometryUiTheme = 'dark' | 'light'

export type BiometryThemeTokens = {
  panelClass: string
  inputClass: string
  label: string
  headerMuted: string
  muted: string
  rowAlt: string
  kHeaderColor: string
  kHeaderBg: string
  kHeaderBorder: string
  axis: string
  cyl: string
  readonlyBg: string
  readonlyBorder: string
  selectionLabel: string
  siaAt: string
}

const DARK: BiometryThemeTokens = {
  panelClass: '',
  inputClass: 'input-biometric',
  label: '#ffffff',
  headerMuted: 'rgba(255,255,255,0.4)',
  muted: 'rgba(255,255,255,0.45)',
  rowAlt: 'rgba(255,255,255,0.02)',
  kHeaderColor: 'rgba(255,255,255,0.72)',
  kHeaderBg: 'rgba(255,255,255,0.03)',
  kHeaderBorder: 'rgba(255,255,255,0.06)',
  axis: 'rgba(255,255,255,0.55)',
  cyl: 'rgba(255,255,255,0.55)',
  readonlyBg: 'rgba(255,255,255,0.04)',
  readonlyBorder: 'rgba(255,255,255,0.1)',
  selectionLabel: 'rgba(255,255,255,0.45)',
  siaAt: 'rgba(255,255,255,0.5)',
}

const LIGHT: BiometryThemeTokens = {
  panelClass: 'biometry-theme-light',
  inputClass: 'input-biometric input-biometric--light',
  label: '#1e293b',
  headerMuted: '#94a3b8',
  muted: '#64748b',
  rowAlt: '#f8fafc',
  kHeaderColor: '#475569',
  kHeaderBg: '#f1f5f9',
  kHeaderBorder: '#e2e8f0',
  axis: '#64748b',
  cyl: '#64748b',
  readonlyBg: '#f8fafc',
  readonlyBorder: '#e2e8f0',
  selectionLabel: '#64748b',
  siaAt: '#94a3b8',
}

export function getBiometryTheme(theme: BiometryUiTheme = 'dark'): BiometryThemeTokens {
  return theme === 'light' ? LIGHT : DARK
}
