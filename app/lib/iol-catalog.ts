/**
 * IOL Catalog — todas as lentes mapeadas nas calculadoras
 * Cobrindo ESCRS, TECNIS Toric, APACRS e BRASCRS
 */

export interface IOL {
  id: string
  model: string
  manufacturer: string
  manufacturerCode: string // usado nos adapters
  type: 'monofocal' | 'toric' | 'multifocal' | 'edof' | 'multifocal-toric'
  aConstant?: number
  material?: string
  notes?: string
}

export const IOL_CATALOG: IOL[] = [
  // ─── Alcon ───────────────────────────────────────────────────
  { id: 'alcon-sn60wf',       model: 'AcrySof IQ SN60WF',           manufacturer: 'Alcon', manufacturerCode: 'Alcon SN60WF',       type: 'monofocal',       aConstant: 119.3 },
  { id: 'alcon-sn6ad',        model: 'AcrySof SN6AD1',              manufacturer: 'Alcon', manufacturerCode: 'Alcon SN6AD',        type: 'toric',           aConstant: 119.3 },
  { id: 'alcon-sn6atx',       model: 'AcrySof IQ Toric SN6ATx',     manufacturer: 'Alcon', manufacturerCode: 'Alcon SN6ATx',      type: 'toric',           aConstant: 119.3 },
  { id: 'alcon-snd1tx',       model: 'AcrySof IQ Toric SND1Tx',     manufacturer: 'Alcon', manufacturerCode: 'Alcon SND1Tx',      type: 'toric',           aConstant: 119.3 },
  { id: 'alcon-sv25tx',       model: 'AcrySof IQ ReSTOR Toric',     manufacturer: 'Alcon', manufacturerCode: 'Alcon SV25Tx',      type: 'multifocal-toric',aConstant: 119.1 },
  { id: 'alcon-tfntx',        model: 'AcrySof IQ PanOptix Toric',   manufacturer: 'Alcon', manufacturerCode: 'Alcon TFNTx',       type: 'multifocal-toric',aConstant: 119.1 },
  { id: 'alcon-dftx',         model: 'AcrySof IQ Vivity Toric',     manufacturer: 'Alcon', manufacturerCode: 'Alcon DFTx',        type: 'edof',            aConstant: 119.4 },
  { id: 'alcon-sa60at',       model: 'AcrySof Natural SA60AT',      manufacturer: 'Alcon', manufacturerCode: 'Alcon SA60AT',      type: 'monofocal',       aConstant: 118.7 },
  { id: 'alcon-mn60ma',       model: 'AcrySof Natural MN60MA',      manufacturer: 'Alcon', manufacturerCode: 'Alcon MN60MA',      type: 'monofocal',       aConstant: 118.0 },

  // ─── Johnson & Johnson (TECNIS) ───────────────────────────────
  { id: 'jj-zcb00',           model: 'TECNIS Monofocal ZCB00',      manufacturer: 'J&J Vision', manufacturerCode: 'J&J ZCB00',   type: 'monofocal',       aConstant: 119.1 },
  { id: 'jj-zct',             model: 'TECNIS Toric ZCT',            manufacturer: 'J&J Vision', manufacturerCode: 'J&J ZCT',     type: 'toric',           aConstant: 119.1 },
  { id: 'jj-zct-usa',         model: 'TECNIS Toric ZCT (USA)',      manufacturer: 'J&J Vision', manufacturerCode: 'J&J ZCT(USA)',type: 'toric',           aConstant: 119.1 },
  { id: 'jj-zcu',             model: 'TECNIS Toric II ZCU',         manufacturer: 'J&J Vision', manufacturerCode: 'J&J ZCU',     type: 'toric',           aConstant: 119.1 },
  { id: 'jj-diu',             model: 'TECNIS Eyhance DIU',          manufacturer: 'J&J Vision', manufacturerCode: 'J&J DIU',     type: 'edof',            aConstant: 119.3 },
  { id: 'jj-zku',             model: 'TECNIS Multifocal +2.75 ZKU', manufacturer: 'J&J Vision', manufacturerCode: 'J&J ZKU',     type: 'multifocal',      aConstant: 119.0 },
  { id: 'jj-zlu',             model: 'TECNIS Multifocal +3.25 ZLU', manufacturer: 'J&J Vision', manufacturerCode: 'J&J ZLU',     type: 'multifocal',      aConstant: 119.0 },
  { id: 'jj-ar40e',           model: 'TECNIS AR40e',                manufacturer: 'J&J Vision', manufacturerCode: 'J&J AR40e',   type: 'monofocal',       aConstant: 118.4 },
  { id: 'jj-ar40m',           model: 'TECNIS AR40M',                manufacturer: 'J&J Vision', manufacturerCode: 'J&J AR40M',   type: 'monofocal',       aConstant: 118.4 },
  { id: 'jj-zxr00',           model: 'TECNIS Symfony ZXR00',        manufacturer: 'J&J Vision', manufacturerCode: 'J&J ZXR00',   type: 'edof',            aConstant: 119.4 },
  { id: 'jj-zxt',             model: 'TECNIS Symfony Toric ZXT',    manufacturer: 'J&J Vision', manufacturerCode: 'J&J ZXT',     type: 'edof',            aConstant: 119.4 },
  { id: 'jj-zhr00v',          model: 'TECNIS Synergy ZHR00V',       manufacturer: 'J&J Vision', manufacturerCode: 'J&J ZHR00V',  type: 'multifocal',      aConstant: 119.4 },
  { id: 'jj-zhw',             model: 'TECNIS Synergy Toric ZHW',    manufacturer: 'J&J Vision', manufacturerCode: 'J&J ZHW',     type: 'multifocal-toric',aConstant: 119.4 },

  // ─── Zeiss ────────────────────────────────────────────────────
  { id: 'zeiss-409m',         model: 'AT LISA tri 839MP',           manufacturer: 'Carl Zeiss', manufacturerCode: 'Zeiss 409M',  type: 'multifocal',      aConstant: 118.6 },
  { id: 'zeiss-709m',         model: 'AT TORBI 709M',               manufacturer: 'Carl Zeiss', manufacturerCode: 'Zeiss 709M',  type: 'toric',           aConstant: 118.6 },

  // ─── Hoya ─────────────────────────────────────────────────────
  { id: 'hoya-isert251',      model: 'iSert 251 (Vivinex)',         manufacturer: 'Hoya',       manufacturerCode: 'Hoya iSert 251', type: 'monofocal',    aConstant: 119.2 },
  { id: 'hoya-isert351',      model: 'iSert 351 Toric (Vivinex)',   manufacturer: 'Hoya',       manufacturerCode: 'Hoya iSert 351', type: 'toric',        aConstant: 119.2 },

  // ─── Bausch & Lomb ────────────────────────────────────────────
  { id: 'bl-mx60',            model: 'enVista MX60',                manufacturer: 'Bausch & Lomb', manufacturerCode: 'Bausch & Lomb MX60',       type: 'monofocal',       aConstant: 119.1 },
  { id: 'bl-mx60t',           model: 'enVista Toric MX60T',         manufacturer: 'Bausch & Lomb', manufacturerCode: 'Bausch & Lomb MX60T',      type: 'toric',           aConstant: 119.1 },
  { id: 'bl-mx60et',          model: 'enVista MX60ET',              manufacturer: 'Bausch & Lomb', manufacturerCode: 'Bausch & Lomb MX60ET',     type: 'monofocal',       aConstant: 119.1 },
  { id: 'bl-mx60et-usa',      model: 'enVista MX60ET (USA)',        manufacturer: 'Bausch & Lomb', manufacturerCode: 'Bausch & Lomb MX60ET(USA)',type: 'monofocal',       aConstant: 119.1 },
  { id: 'bl-bl1ut',           model: 'Crystalens AO BL1UT',        manufacturer: 'Bausch & Lomb', manufacturerCode: 'Bausch & Lomb BL1UT',      type: 'monofocal',       aConstant: 116.8 },
  { id: 'bl-li60ao',          model: 'SofPort LI60AO',              manufacturer: 'Bausch & Lomb', manufacturerCode: 'Bausch & Lomb LI60AO',     type: 'monofocal',       aConstant: 119.7 },

  // ─── Rayner ───────────────────────────────────────────────────
  { id: 'rayner-rayone-emv',  model: 'RayOne EMV',                  manufacturer: 'Rayner',     manufacturerCode: 'Rayner RayOne EMV', type: 'monofocal',        aConstant: 119.2 },

  // ─── MBI ──────────────────────────────────────────────────────
  { id: 'mbi-t302a',          model: 'T302A',                       manufacturer: 'MBI',        manufacturerCode: 'MBI T302A',         type: 'monofocal',        aConstant: 118.0 },

  // ─── Lenstec ──────────────────────────────────────────────────
  { id: 'lenstec-sbl3',       model: 'Softec HD SBL-3',             manufacturer: 'Lenstec',    manufacturerCode: 'Lenstec SBL-3',     type: 'monofocal',        aConstant: 118.6 },

  // ─── SIFI ─────────────────────────────────────────────────────
  { id: 'sifi-miniwell',      model: 'MiniWell Ready',              manufacturer: 'SIFI',       manufacturerCode: 'SIFI Mini WELL',    type: 'edof',             aConstant: 118.5 },

  // ─── Ophtec ───────────────────────────────────────────────────
  { id: 'ophtec-565',         model: 'Artisan 565',                 manufacturer: 'Ophtec',     manufacturerCode: 'Ophtec 565',        type: 'monofocal',        aConstant: 115.0 },
]

export const MANUFACTURERS = [...new Set(IOL_CATALOG.map((l) => l.manufacturer))].sort()

export const IOL_TYPES: Record<IOL['type'], string> = {
  monofocal: 'Monofocal',
  toric: 'Tórica',
  multifocal: 'Multifocal',
  edof: 'EDOF / Extended Range',
  'multifocal-toric': 'Multifocal Tórica',
}

export function getIOLById(id: string): IOL | undefined {
  return IOL_CATALOG.find((l) => l.id === id)
}

export function getIOLsByManufacturer(manufacturer: string): IOL[] {
  return IOL_CATALOG.filter((l) => l.manufacturer === manufacturer)
}
