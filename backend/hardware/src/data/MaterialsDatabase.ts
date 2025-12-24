/**
 * Desktop Metal Materials Database
 *
 * Comprehensive materials specifications including:
 * - Material properties and composition
 * - Pricing per printer model
 * - Sintering and debind atmosphere requirements
 * - Printer compatibility matrix
 * - Material availability and lead times
 *
 * Data sourced from: Binder Jet Cost Model Simplified v13-2-6
 */

export interface MaterialSpecification {
  id: string;
  name: string;
  description: string;
  category: 'metal' | 'ceramic' | 'precious_metal';
  composition: string;

  // Pricing per printer model ($/kg)
  pricing: {
    [printerModel: string]: number;
  };

  // Sintering requirements
  sinteringAtmosphere: 'Hydrogen' | 'Nitrogen' | 'Argon' | 'Vacuum';
  debindAtmosphere: 'Nitrogen' | 'Argon' | 'Air' | 'Hydrogen';

  // Physical properties
  properties: {
    density: number; // g/cm³
    meltingPoint?: number; // °C
    thermalConductivity?: number; // W/m·K
    yieldStrength?: number; // MPa (after sintering)
    tensileStrength?: number; // MPa (after sintering)
    elongation?: number; // %
  };

  // Printer compatibility
  compatiblePrinters: string[];

  // Material handling
  availability: 'standard' | 'limited' | 'custom';
  leadTime: number; // days
  minimumOrder: number; // kg

  // Safety and handling
  safetyNotes?: string;
  storageRequirements?: string;
}

/**
 * Complete materials database from Desktop Metal specifications
 */
export const MATERIALS_DATABASE: MaterialSpecification[] = [
  // Stainless Steels
  {
    id: 'SS_17_4PH',
    name: '17-4 PH Stainless Steel',
    description: 'Precipitation-hardening martensitic stainless steel with excellent strength and corrosion resistance',
    category: 'metal',
    composition: 'Fe-17Cr-4Ni-4Cu-0.3Nb',
    pricing: {
      'Shop_4L': 34.65,
      'Shop_8L': 34.65,
      'Shop_12L': 34.65,
      'ShopPlus': 34.65,
      'ShopPro': 34.65,
      'P_1': 34.65,
      'InnoventX': 34.65,
      'X25Pro': 34.65,
      'X160Pro': 34.65,
    },
    sinteringAtmosphere: 'Hydrogen',
    debindAtmosphere: 'Nitrogen',
    properties: {
      density: 7.8,
      meltingPoint: 1400,
      yieldStrength: 1000,
      tensileStrength: 1100,
      elongation: 10,
    },
    compatiblePrinters: ['Shop_4L', 'Shop_8L', 'Shop_12L', 'ShopPlus', 'ShopPro', 'P_1', 'InnoventX', 'X25Pro'],
    availability: 'standard',
    leadTime: 7,
    minimumOrder: 5,
    safetyNotes: 'Use standard metalworking PPE',
    storageRequirements: 'Store in dry environment, away from moisture',
  },

  {
    id: 'SS_316L',
    name: '316L Stainless Steel',
    description: 'Austenitic stainless steel with superior corrosion resistance, especially in chloride environments',
    category: 'metal',
    composition: 'Fe-17Cr-12Ni-2.5Mo',
    pricing: {
      'Shop_4L': 37.82,
      'Shop_8L': 37.82,
      'Shop_12L': 37.82,
      'ShopPlus': 37.82,
      'ShopPro': 37.82,
      'P_1': 37.82,
      'InnoventX': 37.82,
      'X25Pro': 37.82,
      'X160Pro': 37.82,
    },
    sinteringAtmosphere: 'Hydrogen',
    debindAtmosphere: 'Nitrogen',
    properties: {
      density: 8.0,
      meltingPoint: 1400,
      yieldStrength: 310,
      tensileStrength: 580,
      elongation: 40,
    },
    compatiblePrinters: ['Shop_4L', 'Shop_8L', 'Shop_12L', 'ShopPlus', 'ShopPro', 'P_1', 'InnoventX', 'X25Pro'],
    availability: 'standard',
    leadTime: 7,
    minimumOrder: 5,
  },

  {
    id: 'SS_304L',
    name: '304L Stainless Steel',
    description: 'Most widely used austenitic stainless steel with excellent formability and corrosion resistance',
    category: 'metal',
    composition: 'Fe-18Cr-8Ni',
    pricing: {
      'Shop_4L': 33.45,
      'Shop_8L': 33.45,
      'Shop_12L': 33.45,
      'ShopPlus': 33.45,
      'ShopPro': 33.45,
      'P_1': 33.45,
      'InnoventX': 33.45,
      'X25Pro': 33.45,
      'X160Pro': 33.45,
    },
    sinteringAtmosphere: 'Hydrogen',
    debindAtmosphere: 'Nitrogen',
    properties: {
      density: 8.0,
      meltingPoint: 1400,
      yieldStrength: 290,
      tensileStrength: 560,
      elongation: 45,
    },
    compatiblePrinters: ['Shop_4L', 'Shop_8L', 'Shop_12L', 'ShopPlus', 'ShopPro', 'P_1', 'InnoventX', 'X25Pro'],
    availability: 'standard',
    leadTime: 7,
    minimumOrder: 5,
  },

  // Tool Steels
  {
    id: 'TOOL_420',
    name: '420 Stainless Steel',
    description: 'Martensitic stainless steel with good hardness and moderate corrosion resistance',
    category: 'metal',
    composition: 'Fe-13Cr',
    pricing: {
      'Shop_4L': 30.15,
      'Shop_8L': 30.15,
      'Shop_12L': 30.15,
      'ShopPlus': 30.15,
      'ShopPro': 30.15,
      'P_1': 30.15,
      'InnoventX': 30.15,
      'X25Pro': 30.15,
    },
    sinteringAtmosphere: 'Hydrogen',
    debindAtmosphere: 'Nitrogen',
    properties: {
      density: 7.7,
      meltingPoint: 1450,
      yieldStrength: 750,
      tensileStrength: 850,
      elongation: 15,
    },
    compatiblePrinters: ['Shop_4L', 'Shop_8L', 'Shop_12L', 'ShopPlus', 'ShopPro', 'P_1', 'InnoventX', 'X25Pro'],
    availability: 'standard',
    leadTime: 7,
    minimumOrder: 5,
  },

  {
    id: 'TOOL_4140',
    name: '4140 Alloy Steel',
    description: 'Low-alloy steel with excellent toughness and fatigue resistance',
    category: 'metal',
    composition: 'Fe-1Cr-0.2Mo',
    pricing: {
      'Shop_4L': 33.45,
      'Shop_8L': 33.45,
      'Shop_12L': 33.45,
      'ShopPlus': 33.45,
      'ShopPro': 33.45,
      'P_1': 33.45,
      'InnoventX': 33.45,
      'X25Pro': 33.45,
    },
    sinteringAtmosphere: 'Hydrogen',
    debindAtmosphere: 'Nitrogen',
    properties: {
      density: 7.85,
      meltingPoint: 1416,
      yieldStrength: 690,
      tensileStrength: 850,
      elongation: 12,
    },
    compatiblePrinters: ['Shop_4L', 'Shop_8L', 'Shop_12L', 'ShopPlus', 'ShopPro', 'P_1', 'InnoventX', 'X25Pro'],
    availability: 'standard',
    leadTime: 7,
    minimumOrder: 5,
  },

  // Nickel Superalloys
  {
    id: 'INCONEL_625',
    name: 'Inconel 625',
    description: 'Nickel-chromium superalloy with outstanding high-temperature strength and corrosion resistance',
    category: 'metal',
    composition: 'Ni-22Cr-9Mo-3.6Nb',
    pricing: {
      'Shop_4L': 145.00,
      'Shop_8L': 145.00,
      'Shop_12L': 145.00,
      'ShopPlus': 145.00,
      'ShopPro': 145.00,
      'P_1': 145.00,
      'InnoventX': 145.00,
      'X25Pro': 145.00,
    },
    sinteringAtmosphere: 'Hydrogen',
    debindAtmosphere: 'Argon',
    properties: {
      density: 8.4,
      meltingPoint: 1350,
      yieldStrength: 550,
      tensileStrength: 900,
      elongation: 30,
    },
    compatiblePrinters: ['Shop_4L', 'Shop_8L', 'Shop_12L', 'ShopPlus', 'ShopPro', 'P_1', 'InnoventX', 'X25Pro'],
    availability: 'standard',
    leadTime: 14,
    minimumOrder: 5,
    safetyNotes: 'Requires inert atmosphere handling',
  },

  {
    id: 'INCONEL_718',
    name: 'Inconel 718',
    description: 'Age-hardenable nickel-chromium superalloy for high-temperature aerospace applications',
    category: 'metal',
    composition: 'Ni-19Cr-3Mo-5Nb-0.9Ti-0.5Al',
    pricing: {
      'Shop_4L': 145.00,
      'Shop_8L': 145.00,
      'Shop_12L': 145.00,
      'ShopPlus': 145.00,
      'ShopPro': 145.00,
      'P_1': 145.00,
      'InnoventX': 145.00,
      'X25Pro': 145.00,
    },
    sinteringAtmosphere: 'Hydrogen',
    debindAtmosphere: 'Argon',
    properties: {
      density: 8.2,
      meltingPoint: 1336,
      yieldStrength: 1100,
      tensileStrength: 1350,
      elongation: 18,
    },
    compatiblePrinters: ['Shop_4L', 'Shop_8L', 'Shop_12L', 'ShopPlus', 'ShopPro', 'P_1', 'InnoventX', 'X25Pro'],
    availability: 'standard',
    leadTime: 14,
    minimumOrder: 5,
    safetyNotes: 'Requires inert atmosphere handling',
  },

  // Titanium Alloys
  {
    id: 'TI64',
    name: 'Ti-6Al-4V (Grade 5)',
    description: 'Most widely used titanium alloy with excellent strength-to-weight ratio and biocompatibility',
    category: 'metal',
    composition: 'Ti-6Al-4V',
    pricing: {
      'Shop_4L': 363.00,
      'Shop_8L': 363.00,
      'Shop_12L': 363.00,
      'ShopPlus': 363.00,
      'ShopPro': 363.00,
      'P_1': 363.00,
      'InnoventX': 363.00,
      'X25Pro': 363.00,
    },
    sinteringAtmosphere: 'Argon',
    debindAtmosphere: 'Argon',
    properties: {
      density: 4.43,
      meltingPoint: 1660,
      yieldStrength: 880,
      tensileStrength: 950,
      elongation: 14,
    },
    compatiblePrinters: ['Shop_4L', 'Shop_8L', 'Shop_12L', 'ShopPlus', 'ShopPro', 'P_1', 'InnoventX', 'X25Pro'],
    availability: 'standard',
    leadTime: 21,
    minimumOrder: 5,
    safetyNotes: 'Highly reactive at elevated temperatures. Requires inert atmosphere handling.',
    storageRequirements: 'Store in argon-purged containers',
  },

  // Cobalt Alloys
  {
    id: 'COCRMO',
    name: 'CoCrMo (ASTM F75)',
    description: 'Cobalt-chromium-molybdenum alloy for biomedical implants with excellent wear resistance',
    category: 'metal',
    composition: 'Co-28Cr-6Mo',
    pricing: {
      'Shop_4L': 145.00,
      'Shop_8L': 145.00,
      'Shop_12L': 145.00,
      'ShopPlus': 145.00,
      'ShopPro': 145.00,
      'P_1': 145.00,
      'InnoventX': 145.00,
      'X25Pro': 145.00,
    },
    sinteringAtmosphere: 'Hydrogen',
    debindAtmosphere: 'Argon',
    properties: {
      density: 8.3,
      meltingPoint: 1350,
      yieldStrength: 450,
      tensileStrength: 665,
      elongation: 8,
    },
    compatiblePrinters: ['Shop_4L', 'Shop_8L', 'Shop_12L', 'ShopPlus', 'ShopPro', 'InnoventX', 'X25Pro'],
    availability: 'standard',
    leadTime: 21,
    minimumOrder: 5,
    safetyNotes: 'Biocompatible material for medical applications',
  },

  // Ceramics
  {
    id: 'SIC',
    name: 'Silicon Carbide',
    description: 'Advanced ceramic with exceptional hardness, thermal conductivity, and chemical resistance',
    category: 'ceramic',
    composition: 'SiC',
    pricing: {
      'X160Pro': 145.00,
    },
    sinteringAtmosphere: 'Argon',
    debindAtmosphere: 'Argon',
    properties: {
      density: 3.21,
      meltingPoint: 2730,
      thermalConductivity: 120,
    },
    compatiblePrinters: ['X160Pro'],
    availability: 'limited',
    leadTime: 30,
    minimumOrder: 10,
    safetyNotes: 'Requires carbothermic reduction sintering. Handle powder with respiratory protection.',
    storageRequirements: 'Keep dry, avoid moisture contamination',
  },

  {
    id: 'ALUMINA',
    name: 'Alumina (Al2O3)',
    description: 'High-purity aluminum oxide ceramic with excellent electrical insulation and wear resistance',
    category: 'ceramic',
    composition: 'Al2O3',
    pricing: {
      'X160Pro': 42.00,
    },
    sinteringAtmosphere: 'Air',
    debindAtmosphere: 'Air',
    properties: {
      density: 3.95,
      meltingPoint: 2072,
      thermalConductivity: 30,
    },
    compatiblePrinters: ['X160Pro'],
    availability: 'standard',
    leadTime: 14,
    minimumOrder: 5,
    safetyNotes: 'Use dust control measures',
  },

  {
    id: 'WC_12CO',
    name: 'Tungsten Carbide - 12% Cobalt',
    description: 'Cemented carbide with exceptional hardness and wear resistance for cutting tools',
    category: 'ceramic',
    composition: 'WC-12Co',
    pricing: {
      'Shop_4L': 145.00,
      'Shop_8L': 145.00,
      'Shop_12L': 145.00,
      'ShopPlus': 145.00,
      'ShopPro': 145.00,
      'InnoventX': 145.00,
      'X25Pro': 145.00,
    },
    sinteringAtmosphere: 'Vacuum',
    debindAtmosphere: 'Hydrogen',
    properties: {
      density: 14.5,
      meltingPoint: 2870,
    },
    compatiblePrinters: ['Shop_4L', 'Shop_8L', 'Shop_12L', 'ShopPlus', 'ShopPro', 'InnoventX', 'X25Pro'],
    availability: 'limited',
    leadTime: 21,
    minimumOrder: 5,
    safetyNotes: 'High-density material. Requires vacuum sintering.',
  },

  // Precious Metals
  {
    id: 'GOLD',
    name: 'Gold',
    description: 'Pure gold for jewelry, electronics, and specialty applications',
    category: 'precious_metal',
    composition: 'Au',
    pricing: {
      'InnoventX': 72600.00, // Per kg based on market rates
    },
    sinteringAtmosphere: 'Nitrogen',
    debindAtmosphere: 'Nitrogen',
    properties: {
      density: 19.32,
      meltingPoint: 1064,
      thermalConductivity: 318,
    },
    compatiblePrinters: ['InnoventX'],
    availability: 'custom',
    leadTime: 14,
    minimumOrder: 0.1,
    safetyNotes: 'Secure handling required. High value material.',
    storageRequirements: 'Secure vault storage',
  },

  {
    id: 'SILVER',
    name: 'Silver',
    description: 'High-purity silver for electronics, thermal management, and antimicrobial applications',
    category: 'precious_metal',
    composition: 'Ag',
    pricing: {
      'InnoventX': 845.00, // Per kg based on market rates
    },
    sinteringAtmosphere: 'Nitrogen',
    debindAtmosphere: 'Nitrogen',
    properties: {
      density: 10.49,
      meltingPoint: 961,
      thermalConductivity: 429,
    },
    compatiblePrinters: ['InnoventX'],
    availability: 'custom',
    leadTime: 14,
    minimumOrder: 0.5,
    safetyNotes: 'Secure handling required. Moderate value material.',
  },
];

/**
 * Get material by ID
 */
export function getMaterialById(id: string): MaterialSpecification | undefined {
  return MATERIALS_DATABASE.find(m => m.id === id);
}

/**
 * Get all materials compatible with a specific printer
 */
export function getMaterialsForPrinter(printerModel: string): MaterialSpecification[] {
  return MATERIALS_DATABASE.filter(m => m.compatiblePrinters.includes(printerModel));
}

/**
 * Get materials by category
 */
export function getMaterialsByCategory(category: 'metal' | 'ceramic' | 'precious_metal'): MaterialSpecification[] {
  return MATERIALS_DATABASE.filter(m => m.category === category);
}

/**
 * Get material pricing for specific printer
 */
export function getMaterialPrice(materialId: string, printerModel: string): number | undefined {
  const material = getMaterialById(materialId);
  return material?.pricing[printerModel];
}

/**
 * Check if material is available (in stock)
 */
export function isMaterialAvailable(materialId: string): boolean {
  const material = getMaterialById(materialId);
  return material?.availability === 'standard';
}

/**
 * Get materials requiring specific sintering atmosphere
 */
export function getMaterialsBySinteringAtmosphere(
  atmosphere: 'Hydrogen' | 'Nitrogen' | 'Argon' | 'Vacuum'
): MaterialSpecification[] {
  return MATERIALS_DATABASE.filter(m => m.sinteringAtmosphere === atmosphere);
}

/**
 * Material compatibility matrix
 */
export const MATERIAL_COMPATIBILITY_MATRIX = {
  metals: ['Shop_4L', 'Shop_8L', 'Shop_12L', 'ShopPlus', 'ShopPro', 'P_1', 'InnoventX', 'X25Pro'],
  ceramics: ['X160Pro'],
  precious_metals: ['InnoventX'],
};
