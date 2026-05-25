/**
 * Per-calculator lens catalogs
 * Maps exactly what each external calculator supports in its dropdown.
 * Used to build per-calculator lens pickers in the UI.
 */

export interface CalcLens {
  code: string        // code sent to gateway (family/manufacturerCode)
  label: string       // exact label shown in the calculator dropdown
  family: string      // IOL family name
  manufacturer: string
}

// ── TECNIS Toric Calculator (tecnistoriccalc.com) ─────────────────────────────
// Only J&J lenses; dropdown groups: Monofocal, Correção de Presbiopia
export const TECNIS_LENS_CATALOG: CalcLens[] = [
  { code: 'J&J DIU',    label: 'TECNIS Eyhance™ (DIU)',              family: 'DIU',  manufacturer: 'J&J Vision' },
  { code: 'J&J ZCU',    label: 'TECNIS™ Toric II 1-Piece (ZCU)',     family: 'ZCU',  manufacturer: 'J&J Vision' },
  { code: 'J&J DRT',    label: 'TECNIS Odyssey™ (DRT)',              family: 'DRT',  manufacturer: 'J&J Vision' },
  { code: 'J&J DET',    label: 'TECNIS PureSee™ (DET)',              family: 'DET',  manufacturer: 'J&J Vision' },
  { code: 'J&J DXW',    label: 'TECNIS Symfony OptiBlue™ SIMPLICITY (DXW)', family: 'DXW', manufacturer: 'J&J Vision' },
  { code: 'J&J ZXW',    label: 'TECNIS Symfony OptiBlue™ (ZXW)',     family: 'ZXW',  manufacturer: 'J&J Vision' },
  { code: 'J&J ZKU',    label: 'TECNIS Multifocal +2.75 D (ZKU)',    family: 'ZKU',  manufacturer: 'J&J Vision' },
  { code: 'J&J ZLU',    label: 'TECNIS Multifocal +3.25 D (ZLU)',    family: 'ZLU',  manufacturer: 'J&J Vision' },
]

// ── APACRS True-K Toric (calc.apacrs.org) ────────────────────────────────────
// Multi-manufacturer; matches gateway IOL_DROPDOWN_LABELS regex
export const APACRS_LENS_CATALOG: CalcLens[] = [
  // Alcon
  { code: 'Alcon SN60WF',   label: 'Alcon SN60WF',        family: 'SN60WF',  manufacturer: 'Alcon' },
  { code: 'Alcon SN6AD',    label: 'Alcon SN6AD',          family: 'SN6AD',   manufacturer: 'Alcon' },
  { code: 'Alcon SN6ATx',   label: 'Alcon SN6ATx',         family: 'SN6ATx',  manufacturer: 'Alcon' },
  { code: 'Alcon SND1Tx',   label: 'Alcon SND1Tx',         family: 'SND1Tx',  manufacturer: 'Alcon' },
  { code: 'Alcon SV25Tx',   label: 'Alcon SV25Tx',         family: 'SV25Tx',  manufacturer: 'Alcon' },
  { code: 'Alcon TFNTx',    label: 'Alcon TFNTx',          family: 'TFNTx',   manufacturer: 'Alcon' },
  { code: 'Alcon DFTx',     label: 'Alcon DFTx',           family: 'DFTx',    manufacturer: 'Alcon' },
  { code: 'Alcon SA60AT',   label: 'Alcon SA60AT',         family: 'SA60AT',  manufacturer: 'Alcon' },
  { code: 'Alcon MN60MA',   label: 'Alcon MN60MA',         family: 'MN60MA',  manufacturer: 'Alcon' },
  // Rayner
  { code: 'Rayner RayOne EMV', label: 'Rayner RayOne EMV', family: 'RayOne EMV', manufacturer: 'Rayner' },
  // J&J Vision
  { code: 'J&J ZCB00',      label: 'J&J ZCB00',            family: 'ZCB00',   manufacturer: 'J&J Vision' },
  { code: 'J&J ZCT',        label: 'J&J ZCT',              family: 'ZCT',     manufacturer: 'J&J Vision' },
  { code: 'J&J ZCT(USA)',   label: 'J&J ZCT(USA)',         family: 'ZCT(USA)', manufacturer: 'J&J Vision' },
  { code: 'J&J ZCU',        label: 'J&J ZCU',              family: 'ZCU',     manufacturer: 'J&J Vision' },
  { code: 'J&J DIU',        label: 'J&J DIU',              family: 'DIU',     manufacturer: 'J&J Vision' },
  { code: 'J&J ZKU',        label: 'J&J ZKU',              family: 'ZKU',     manufacturer: 'J&J Vision' },
  { code: 'J&J ZLU',        label: 'J&J ZLU',              family: 'ZLU',     manufacturer: 'J&J Vision' },
  { code: 'J&J AR40e',      label: 'J&J AR40e',            family: 'AR40e',   manufacturer: 'J&J Vision' },
  { code: 'J&J AR40M',      label: 'J&J AR40M',            family: 'AR40M',   manufacturer: 'J&J Vision' },
  { code: 'J&J ZXR00',      label: 'J&J ZXR00',            family: 'ZXR00',   manufacturer: 'J&J Vision' },
  { code: 'J&J ZXT',        label: 'J&J ZXT',              family: 'ZXT',     manufacturer: 'J&J Vision' },
  { code: 'J&J ZHR00V',     label: 'J&J ZHR00V',           family: 'ZHR00V',  manufacturer: 'J&J Vision' },
  { code: 'J&J ZHW',        label: 'J&J ZHW',              family: 'ZHW',     manufacturer: 'J&J Vision' },
  // Carl Zeiss
  { code: 'Zeiss 409M',     label: 'Zeiss 409M',           family: '409M',    manufacturer: 'Carl Zeiss' },
  { code: 'Zeiss 709M',     label: 'Zeiss 709M',           family: '709M',    manufacturer: 'Carl Zeiss' },
  // Hoya
  { code: 'Hoya iSert 251', label: 'Hoya iSert 251',       family: 'iSert 251', manufacturer: 'Hoya' },
  { code: 'Hoya iSert 351', label: 'Hoya iSert 351',       family: 'iSert 351', manufacturer: 'Hoya' },
  // Bausch & Lomb
  { code: 'Bausch & Lomb MX60',       label: 'Bausch & Lomb MX60',       family: 'MX60',       manufacturer: 'Bausch & Lomb' },
  { code: 'Bausch & Lomb MX60T',      label: 'Bausch & Lomb MX60T',      family: 'MX60T',      manufacturer: 'Bausch & Lomb' },
  { code: 'Bausch & Lomb MX60ET',     label: 'Bausch & Lomb MX60ET',     family: 'MX60ET',     manufacturer: 'Bausch & Lomb' },
  { code: 'Bausch & Lomb MX60ET(USA)',label: 'Bausch & Lomb MX60ET(USA)',family: 'MX60ET(USA)', manufacturer: 'Bausch & Lomb' },
  { code: 'Bausch & Lomb BL1UT',      label: 'Bausch & Lomb BL1UT',      family: 'BL1UT',      manufacturer: 'Bausch & Lomb' },
  { code: 'Bausch & Lomb LI60AO',     label: 'Bausch & Lomb LI60AO',     family: 'LI60AO',     manufacturer: 'Bausch & Lomb' },
  // Others
  { code: 'MBI T302A',      label: 'MBI T302A',            family: 'T302A',   manufacturer: 'MBI' },
  { code: 'Lenstec SBL-3',  label: 'Lenstec SBL-3',        family: 'SBL-3',   manufacturer: 'Lenstec' },
  { code: 'SIFI MiniWELL',  label: 'SIFI Mini WELL',        family: 'MiniWELL', manufacturer: 'SIFI' },
  { code: 'Ophtec 565',     label: 'Ophtec 565',            family: '565',     manufacturer: 'Ophtec' },
]

export const CALCULATOR_LENS_CATALOGS: Record<string, CalcLens[]> = {
  'tecnis-toric':        TECNIS_LENS_CATALOG,
  'apacrs-true-k-toric': APACRS_LENS_CATALOG,
  'apacrs-toric':        APACRS_LENS_CATALOG, // same catalog as True K Toric
}

export function getLensesForCalculator(calcId: string): CalcLens[] {
  return CALCULATOR_LENS_CATALOGS[calcId] ?? []
}
