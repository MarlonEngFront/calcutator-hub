export type CalculatorId =
  | 'tecnis-toric'
  | 'apacrs-true-k-toric'
  | 'apacrs-barrett-toric'
  | 'escrs-iol'
  | 'brascrs-multiformula'
  | 'brascrs-double-k'

export type CalculatorStatus =
  | 'available'
  | 'loading'
  | 'completed'
  | 'error'
  | 'unavailable'
  | 'auth-required'

export interface CalculatorCard {
  id: CalculatorId
  label: string
  estimatedSeconds: number
  status: CalculatorStatus
  requiresAuth: boolean
  supportsToric: boolean
  lastResult?: {
    odPower: number
    oePower: number
    timestamp: string
  }
}

export const CALCULATORS: CalculatorCard[] = [
  {
    id: 'tecnis-toric',
    label: 'TECNIS Toric',
    estimatedSeconds: 8,
    status: 'available',
    requiresAuth: false,
    supportsToric: true,
  },
  {
    id: 'apacrs-true-k-toric',
    label: 'Barrett True-K Toric',
    estimatedSeconds: 40,
    status: 'available',
    requiresAuth: false,
    supportsToric: true,
  },
  {
    id: 'apacrs-barrett-toric',
    label: 'Barrett Toric',
    estimatedSeconds: 40,
    status: 'available',
    requiresAuth: false,
    supportsToric: true,
  },
  {
    id: 'escrs-iol',
    label: 'ESCRS IOL',
    estimatedSeconds: 15,
    status: 'available',
    requiresAuth: false,
    supportsToric: false,
  },
  {
    id: 'brascrs-multiformula',
    label: 'BRASCRS Multiformula',
    estimatedSeconds: 20,
    status: 'auth-required',
    requiresAuth: true,
    supportsToric: false,
  },
  {
    id: 'brascrs-double-k',
    label: 'Double K',
    estimatedSeconds: 20,
    status: 'auth-required',
    requiresAuth: true,
    supportsToric: false,
  },
]

export const getStatusBadgeColor = (status: CalculatorStatus) => {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-800'
    case 'loading':
      return 'bg-blue-100 text-blue-800'
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'error':
      return 'bg-red-100 text-red-800'
    case 'unavailable':
      return 'bg-gray-100 text-gray-800'
    case 'auth-required':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
