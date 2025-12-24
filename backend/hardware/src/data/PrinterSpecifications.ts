/**
 * Desktop Metal Printer Specifications Database
 *
 * Complete specifications for all Desktop Metal binder jet printers including:
 * - Build volumes and physical dimensions
 * - Layer speeds and thickness ranges
 * - Powder handling and bed density
 * - Consumable lifetimes and costs
 * - Power consumption and environmental requirements
 * - Equipment pricing
 *
 * Data sourced from: Binder Jet Cost Model Simplified v13-2-6
 */

export interface PrinterSpecification {
  id: string;
  name: string;
  model: string;
  description: string;
  category: 'production' | 'research' | 'industrial';

  // Build volume (mm)
  buildVolume: {
    x: number;
    y: number;
    z: number;
    volume: number; // cm³
  };

  // Layer specifications
  layerSpecs: {
    minThickness: number; // μm
    maxThickness: number; // μm
    minSpeed: number; // seconds per layer
    maxSpeed: number; // seconds per layer
    avgSpeed: number; // seconds per layer (at 50μm)
  };

  // Powder handling
  powderSystem: {
    bedDensity: number; // g/cm³
    loosePowderRatio: number; // ratio to part volume
    supportPowderRatio: number; // ratio to part volume
    recoaterType: 'single' | 'double';
    hopperCapacity?: number; // kg
  };

  // Binder system
  binderSystem: {
    cartridgeVolume: number; // mL
    printheadCost: number; // $
    printheadLifetime: number; // mL of binder
    binderCostPerLiter: number; // $/L
  };

  // Consumables
  consumables: {
    wiperCartridgeCost: number; // $
    wiperLifetime: number; // layers
    otherAnnualCosts?: number; // $ per year
  };

  // Physical specifications
  physical: {
    footprint: {
      width: number; // cm
      depth: number; // cm
      height: number; // cm
    };
    weight?: number; // kg
    powerRequirement: number; // kW
  };

  // Pricing
  pricing: {
    equipmentMSRP: number; // $
    installationCost?: number; // $
    annualMaintenanceCost?: number; // $
  };

  // Capabilities
  capabilities: {
    materials: string[];
    maxPartHeight: number; // mm
    minFeatureSize: number; // μm
    surfaceFinish: string; // Ra in μm
    tolerances: string; // typical dimensional accuracy
  };

  // Environmental requirements
  environmental: {
    temperature: string; // °C range
    humidity: string; // % RH range
    floorSpace: number; // m²
    ventilation: string;
  };

  // Throughput
  throughput: {
    layersPerHour: number;
    typicalJobTime: string; // hours for typical part
    partsPerWeek?: number; // typical production rate
  };
}

/**
 * Complete Desktop Metal printer fleet specifications
 */
export const PRINTER_SPECIFICATIONS: PrinterSpecification[] = [
  {
    id: 'SHOP_4L',
    name: 'Shop System 4L',
    model: 'Shop_4L',
    description: 'Compact metal binder jetting system for low-volume production and prototyping',
    category: 'production',
    buildVolume: {
      x: 150,
      y: 150,
      z: 150,
      volume: 3375,
    },
    layerSpecs: {
      minThickness: 50,
      maxThickness: 100,
      minSpeed: 12,
      maxSpeed: 46,
      avgSpeed: 27.8,
    },
    powderSystem: {
      bedDensity: 4.5,
      loosePowderRatio: 1.5,
      supportPowderRatio: 1.0,
      recoaterType: 'single',
      hopperCapacity: 10,
    },
    binderSystem: {
      cartridgeVolume: 250,
      printheadCost: 695,
      printheadLifetime: 1000,
      binderCostPerLiter: 100,
    },
    consumables: {
      wiperCartridgeCost: 231,
      wiperLifetime: 4000,
      otherAnnualCosts: 500,
    },
    physical: {
      footprint: {
        width: 80,
        depth: 80,
        height: 120,
      },
      powerRequirement: 1.5,
    },
    pricing: {
      equipmentMSRP: 196000,
      installationCost: 10000,
      annualMaintenanceCost: 15000,
    },
    capabilities: {
      materials: ['SS_17_4PH', 'SS_316L', 'SS_304L', 'TOOL_420', 'TOOL_4140', 'INCONEL_625', 'INCONEL_718', 'TI64', 'COCRMO', 'WC_12CO'],
      maxPartHeight: 150,
      minFeatureSize: 200,
      surfaceFinish: 'Ra 6-10',
      tolerances: '±0.5% or ±0.3mm, whichever is greater',
    },
    environmental: {
      temperature: '18-26',
      humidity: '30-70',
      floorSpace: 2.0,
      ventilation: 'Standard lab ventilation',
    },
    throughput: {
      layersPerHour: 130,
      typicalJobTime: '2-4',
      partsPerWeek: 20,
    },
  },

  {
    id: 'SHOP_8L',
    name: 'Shop System 8L',
    model: 'Shop_8L',
    description: 'Mid-size metal binder jetting system for medium production volumes',
    category: 'production',
    buildVolume: {
      x: 200,
      y: 200,
      z: 200,
      volume: 8000,
    },
    layerSpecs: {
      minThickness: 50,
      maxThickness: 100,
      minSpeed: 15,
      maxSpeed: 52,
      avgSpeed: 31.4,
    },
    powderSystem: {
      bedDensity: 4.5,
      loosePowderRatio: 1.5,
      supportPowderRatio: 1.0,
      recoaterType: 'single',
      hopperCapacity: 15,
    },
    binderSystem: {
      cartridgeVolume: 250,
      printheadCost: 695,
      printheadLifetime: 1000,
      binderCostPerLiter: 100,
    },
    consumables: {
      wiperCartridgeCost: 231,
      wiperLifetime: 4000,
      otherAnnualCosts: 750,
    },
    physical: {
      footprint: {
        width: 90,
        depth: 90,
        height: 130,
      },
      powerRequirement: 2.0,
    },
    pricing: {
      equipmentMSRP: 245000,
      installationCost: 12000,
      annualMaintenanceCost: 18000,
    },
    capabilities: {
      materials: ['SS_17_4PH', 'SS_316L', 'SS_304L', 'TOOL_420', 'TOOL_4140', 'INCONEL_625', 'INCONEL_718', 'TI64', 'COCRMO', 'WC_12CO'],
      maxPartHeight: 200,
      minFeatureSize: 200,
      surfaceFinish: 'Ra 6-10',
      tolerances: '±0.5% or ±0.3mm, whichever is greater',
    },
    environmental: {
      temperature: '18-26',
      humidity: '30-70',
      floorSpace: 2.5,
      ventilation: 'Standard lab ventilation',
    },
    throughput: {
      layersPerHour: 115,
      typicalJobTime: '3-6',
      partsPerWeek: 30,
    },
  },

  {
    id: 'SHOP_12L',
    name: 'Shop System 12L',
    model: 'Shop_12L',
    description: 'Large-capacity metal binder jetting system for production environments',
    category: 'production',
    buildVolume: {
      x: 300,
      y: 200,
      z: 200,
      volume: 12000,
    },
    layerSpecs: {
      minThickness: 50,
      maxThickness: 100,
      minSpeed: 18,
      maxSpeed: 58,
      avgSpeed: 35.0,
    },
    powderSystem: {
      bedDensity: 4.5,
      loosePowderRatio: 1.5,
      supportPowderRatio: 1.0,
      recoaterType: 'single',
      hopperCapacity: 20,
    },
    binderSystem: {
      cartridgeVolume: 250,
      printheadCost: 695,
      printheadLifetime: 1000,
      binderCostPerLiter: 100,
    },
    consumables: {
      wiperCartridgeCost: 231,
      wiperLifetime: 4000,
      otherAnnualCosts: 1000,
    },
    physical: {
      footprint: {
        width: 100,
        depth: 90,
        height: 130,
      },
      powerRequirement: 2.5,
    },
    pricing: {
      equipmentMSRP: 295000,
      installationCost: 15000,
      annualMaintenanceCost: 20000,
    },
    capabilities: {
      materials: ['SS_17_4PH', 'SS_316L', 'SS_304L', 'TOOL_420', 'TOOL_4140', 'INCONEL_625', 'INCONEL_718', 'TI64', 'COCRMO', 'WC_12CO'],
      maxPartHeight: 200,
      minFeatureSize: 200,
      surfaceFinish: 'Ra 6-10',
      tolerances: '±0.5% or ±0.3mm, whichever is greater',
    },
    environmental: {
      temperature: '18-26',
      humidity: '30-70',
      floorSpace: 3.0,
      ventilation: 'Standard lab ventilation',
    },
    throughput: {
      layersPerHour: 103,
      typicalJobTime: '4-8',
      partsPerWeek: 40,
    },
  },

  {
    id: 'SHOP_PLUS',
    name: 'Shop System Plus',
    model: 'ShopPlus',
    description: 'Enhanced Shop System with increased throughput and automation',
    category: 'production',
    buildVolume: {
      x: 300,
      y: 200,
      z: 200,
      volume: 12000,
    },
    layerSpecs: {
      minThickness: 50,
      maxThickness: 100,
      minSpeed: 10,
      maxSpeed: 40,
      avgSpeed: 22.9,
    },
    powderSystem: {
      bedDensity: 4.5,
      loosePowderRatio: 1.5,
      supportPowderRatio: 1.0,
      recoaterType: 'double',
      hopperCapacity: 25,
    },
    binderSystem: {
      cartridgeVolume: 500,
      printheadCost: 1390,
      printheadLifetime: 2000,
      binderCostPerLiter: 100,
    },
    consumables: {
      wiperCartridgeCost: 231,
      wiperLifetime: 4000,
      otherAnnualCosts: 1500,
    },
    physical: {
      footprint: {
        width: 120,
        depth: 100,
        height: 140,
      },
      powerRequirement: 3.0,
    },
    pricing: {
      equipmentMSRP: 425000,
      installationCost: 20000,
      annualMaintenanceCost: 25000,
    },
    capabilities: {
      materials: ['SS_17_4PH', 'SS_316L', 'SS_304L', 'TOOL_420', 'TOOL_4140', 'INCONEL_625', 'INCONEL_718', 'TI64', 'COCRMO', 'WC_12CO'],
      maxPartHeight: 200,
      minFeatureSize: 150,
      surfaceFinish: 'Ra 5-8',
      tolerances: '±0.4% or ±0.2mm, whichever is greater',
    },
    environmental: {
      temperature: '18-26',
      humidity: '30-70',
      floorSpace: 4.0,
      ventilation: 'Enhanced ventilation recommended',
    },
    throughput: {
      layersPerHour: 157,
      typicalJobTime: '3-5',
      partsPerWeek: 60,
    },
  },

  {
    id: 'SHOP_PRO',
    name: 'Shop System Pro',
    model: 'ShopPro',
    description: 'Professional-grade system with maximum throughput and advanced features',
    category: 'production',
    buildVolume: {
      x: 300,
      y: 200,
      z: 200,
      volume: 12000,
    },
    layerSpecs: {
      minThickness: 30,
      maxThickness: 100,
      minSpeed: 2.63,
      maxSpeed: 15,
      avgSpeed: 7.0,
    },
    powderSystem: {
      bedDensity: 4.5,
      loosePowderRatio: 1.5,
      supportPowderRatio: 1.0,
      recoaterType: 'double',
      hopperCapacity: 30,
    },
    binderSystem: {
      cartridgeVolume: 1000,
      printheadCost: 34650,
      printheadLifetime: 10000,
      binderCostPerLiter: 100,
    },
    consumables: {
      wiperCartridgeCost: 231,
      wiperLifetime: 4000,
      otherAnnualCosts: 2000,
    },
    physical: {
      footprint: {
        width: 130,
        depth: 110,
        height: 150,
      },
      powerRequirement: 4.0,
    },
    pricing: {
      equipmentMSRP: 650000,
      installationCost: 30000,
      annualMaintenanceCost: 35000,
    },
    capabilities: {
      materials: ['SS_17_4PH', 'SS_316L', 'SS_304L', 'TOOL_420', 'TOOL_4140', 'INCONEL_625', 'INCONEL_718', 'TI64', 'COCRMO', 'WC_12CO'],
      maxPartHeight: 200,
      minFeatureSize: 100,
      surfaceFinish: 'Ra 4-6',
      tolerances: '±0.3% or ±0.15mm, whichever is greater',
    },
    environmental: {
      temperature: '18-26',
      humidity: '30-70',
      floorSpace: 5.0,
      ventilation: 'Enhanced ventilation required',
    },
    throughput: {
      layersPerHour: 514,
      typicalJobTime: '2-4',
      partsPerWeek: 100,
    },
  },

  {
    id: 'P_1',
    name: 'P-1 System',
    model: 'P_1',
    description: 'High-speed production system for industrial manufacturing',
    category: 'industrial',
    buildVolume: {
      x: 380,
      y: 280,
      z: 280,
      volume: 29792,
    },
    layerSpecs: {
      minThickness: 50,
      maxThickness: 100,
      minSpeed: 4,
      maxSpeed: 20,
      avgSpeed: 10.6,
    },
    powderSystem: {
      bedDensity: 4.5,
      loosePowderRatio: 1.5,
      supportPowderRatio: 1.0,
      recoaterType: 'double',
      hopperCapacity: 50,
    },
    binderSystem: {
      cartridgeVolume: 1000,
      printheadCost: 34650,
      printheadLifetime: 10000,
      binderCostPerLiter: 100,
    },
    consumables: {
      wiperCartridgeCost: 231,
      wiperLifetime: 4000,
      otherAnnualCosts: 3000,
    },
    physical: {
      footprint: {
        width: 200,
        depth: 150,
        height: 200,
      },
      powerRequirement: 6.0,
    },
    pricing: {
      equipmentMSRP: 1030000,
      installationCost: 50000,
      annualMaintenanceCost: 50000,
    },
    capabilities: {
      materials: ['SS_17_4PH', 'SS_316L', 'SS_304L', 'TOOL_420', 'TOOL_4140', 'INCONEL_625', 'INCONEL_718', 'TI64', 'COCRMO', 'WC_12CO'],
      maxPartHeight: 280,
      minFeatureSize: 100,
      surfaceFinish: 'Ra 4-6',
      tolerances: '±0.3% or ±0.15mm, whichever is greater',
    },
    environmental: {
      temperature: '18-26',
      humidity: '30-70',
      floorSpace: 10.0,
      ventilation: 'Industrial ventilation required',
    },
    throughput: {
      layersPerHour: 340,
      typicalJobTime: '4-8',
      partsPerWeek: 200,
    },
  },

  {
    id: 'INNOVENTX',
    name: 'InnoventX',
    model: 'InnoventX',
    description: 'Open-architecture R&D system for materials development and research',
    category: 'research',
    buildVolume: {
      x: 65,
      y: 65,
      z: 160,
      volume: 676,
    },
    layerSpecs: {
      minThickness: 30,
      maxThickness: 200,
      minSpeed: 5,
      maxSpeed: 25,
      avgSpeed: 13.4,
    },
    powderSystem: {
      bedDensity: 4.5,
      loosePowderRatio: 1.5,
      supportPowderRatio: 1.0,
      recoaterType: 'single',
      hopperCapacity: 2,
    },
    binderSystem: {
      cartridgeVolume: 100,
      printheadCost: 695,
      printheadLifetime: 500,
      binderCostPerLiter: 300,
    },
    consumables: {
      wiperCartridgeCost: 231,
      wiperLifetime: 2000,
      otherAnnualCosts: 500,
    },
    physical: {
      footprint: {
        width: 60,
        depth: 60,
        height: 100,
      },
      powerRequirement: 1.0,
    },
    pricing: {
      equipmentMSRP: 245000,
      installationCost: 10000,
      annualMaintenanceCost: 12000,
    },
    capabilities: {
      materials: ['SS_17_4PH', 'SS_316L', 'SS_304L', 'TOOL_420', 'TOOL_4140', 'INCONEL_625', 'INCONEL_718', 'TI64', 'COCRMO', 'WC_12CO', 'GOLD', 'SILVER'],
      maxPartHeight: 160,
      minFeatureSize: 100,
      surfaceFinish: 'Ra 5-10',
      tolerances: '±0.5% or ±0.3mm, whichever is greater',
    },
    environmental: {
      temperature: '18-26',
      humidity: '30-70',
      floorSpace: 1.5,
      ventilation: 'Standard lab ventilation',
    },
    throughput: {
      layersPerHour: 269,
      typicalJobTime: '1-3',
      partsPerWeek: 50,
    },
  },

  {
    id: 'X25PRO',
    name: 'X25 Pro',
    model: 'X25Pro',
    description: 'Professional metal and ceramic binder jetting system',
    category: 'production',
    buildVolume: {
      x: 270,
      y: 420,
      z: 270,
      volume: 30618,
    },
    layerSpecs: {
      minThickness: 50,
      maxThickness: 100,
      minSpeed: 18,
      maxSpeed: 58,
      avgSpeed: 35.0,
    },
    powderSystem: {
      bedDensity: 4.5,
      loosePowderRatio: 1.5,
      supportPowderRatio: 1.0,
      recoaterType: 'double',
      hopperCapacity: 40,
    },
    binderSystem: {
      cartridgeVolume: 500,
      printheadCost: 1390,
      printheadLifetime: 2000,
      binderCostPerLiter: 100,
    },
    consumables: {
      wiperCartridgeCost: 231,
      wiperLifetime: 4000,
      otherAnnualCosts: 2500,
    },
    physical: {
      footprint: {
        width: 150,
        depth: 120,
        height: 180,
      },
      powerRequirement: 5.0,
    },
    pricing: {
      equipmentMSRP: 480000,
      installationCost: 25000,
      annualMaintenanceCost: 30000,
    },
    capabilities: {
      materials: ['SS_17_4PH', 'SS_316L', 'SS_304L', 'TOOL_420', 'TOOL_4140', 'INCONEL_625', 'INCONEL_718', 'TI64', 'COCRMO', 'WC_12CO'],
      maxPartHeight: 270,
      minFeatureSize: 150,
      surfaceFinish: 'Ra 5-8',
      tolerances: '±0.4% or ±0.2mm, whichever is greater',
    },
    environmental: {
      temperature: '18-26',
      humidity: '30-70',
      floorSpace: 6.0,
      ventilation: 'Enhanced ventilation recommended',
    },
    throughput: {
      layersPerHour: 103,
      typicalJobTime: '5-10',
      partsPerWeek: 80,
    },
  },

  {
    id: 'X160PRO',
    name: 'X160 Pro',
    model: 'X160Pro',
    description: 'Large-format ceramic and technical materials system',
    category: 'industrial',
    buildVolume: {
      x: 500,
      y: 800,
      z: 400,
      volume: 160000,
    },
    layerSpecs: {
      minThickness: 100,
      maxThickness: 200,
      minSpeed: 25,
      maxSpeed: 80,
      avgSpeed: 48.8,
    },
    powderSystem: {
      bedDensity: 2.0,
      loosePowderRatio: 2.0,
      supportPowderRatio: 1.5,
      recoaterType: 'double',
      hopperCapacity: 100,
    },
    binderSystem: {
      cartridgeVolume: 1000,
      printheadCost: 34650,
      printheadLifetime: 10000,
      binderCostPerLiter: 150,
    },
    consumables: {
      wiperCartridgeCost: 231,
      wiperLifetime: 4000,
      otherAnnualCosts: 5000,
    },
    physical: {
      footprint: {
        width: 300,
        depth: 200,
        height: 250,
      },
      powerRequirement: 8.0,
    },
    pricing: {
      equipmentMSRP: 850000,
      installationCost: 50000,
      annualMaintenanceCost: 45000,
    },
    capabilities: {
      materials: ['SIC', 'ALUMINA', 'SS_316L', 'SS_304L'],
      maxPartHeight: 400,
      minFeatureSize: 300,
      surfaceFinish: 'Ra 8-12',
      tolerances: '±0.5% or ±0.5mm, whichever is greater',
    },
    environmental: {
      temperature: '18-26',
      humidity: '30-70',
      floorSpace: 20.0,
      ventilation: 'Industrial ventilation required',
    },
    throughput: {
      layersPerHour: 74,
      typicalJobTime: '10-20',
      partsPerWeek: 50,
    },
  },
];

/**
 * Get printer specification by ID
 */
export function getPrinterById(id: string): PrinterSpecification | undefined {
  return PRINTER_SPECIFICATIONS.find(p => p.id === id);
}

/**
 * Get printers by category
 */
export function getPrintersByCategory(category: 'production' | 'research' | 'industrial'): PrinterSpecification[] {
  return PRINTER_SPECIFICATIONS.filter(p => p.category === category);
}

/**
 * Get printers compatible with a specific material
 */
export function getPrintersForMaterial(materialId: string): PrinterSpecification[] {
  return PRINTER_SPECIFICATIONS.filter(p => p.capabilities.materials.includes(materialId));
}

/**
 * Calculate build time for a given part
 */
export function calculateBuildTime(
  printerId: string,
  partHeight: number, // mm
  layerThickness: number = 50 // μm
): number {
  const printer = getPrinterById(printerId);
  if (!printer) return 0;

  const numLayers = (partHeight * 1000) / layerThickness; // Convert mm to μm
  const timePerLayer = printer.layerSpecs.avgSpeed; // seconds
  const totalSeconds = numLayers * timePerLayer;

  return totalSeconds / 3600; // Convert to hours
}

/**
 * Check if printer can accommodate part dimensions
 */
export function canPrinterBuildPart(
  printerId: string,
  partDimensions: { x: number; y: number; z: number }
): boolean {
  const printer = getPrinterById(printerId);
  if (!printer) return false;

  const { buildVolume } = printer;
  return (
    partDimensions.x <= buildVolume.x &&
    partDimensions.y <= buildVolume.y &&
    partDimensions.z <= buildVolume.z
  );
}

/**
 * Get optimal printer for part and material
 */
export function getOptimalPrinter(
  materialId: string,
  partDimensions: { x: number; y: number; z: number },
  prioritize: 'cost' | 'speed' | 'quality' = 'cost'
): PrinterSpecification | undefined {
  const compatiblePrinters = PRINTER_SPECIFICATIONS.filter(
    p =>
      p.capabilities.materials.includes(materialId) &&
      canPrinterBuildPart(p.id, partDimensions)
  );

  if (compatiblePrinters.length === 0) return undefined;

  // Sort based on priority
  switch (prioritize) {
    case 'cost':
      return compatiblePrinters.sort((a, b) => a.pricing.equipmentMSRP - b.pricing.equipmentMSRP)[0];
    case 'speed':
      return compatiblePrinters.sort((a, b) => a.layerSpecs.avgSpeed - b.layerSpecs.avgSpeed)[0];
    case 'quality':
      return compatiblePrinters.sort(
        (a, b) => a.layerSpecs.minThickness - b.layerSpecs.minThickness
      )[0];
    default:
      return compatiblePrinters[0];
  }
}

/**
 * Calculate printer utilization cost per hour
 */
export function calculatePrinterHourlyCost(printerId: string): number {
  const printer = getPrinterById(printerId);
  if (!printer) return 0;

  const { equipmentMSRP, annualMaintenanceCost } = printer.pricing;

  // Depreciation over 5 years
  const annualDepreciation = equipmentMSRP / 5;

  // Assume 2000 hours of operation per year (40 hrs/week * 50 weeks)
  const operatingHoursPerYear = 2000;

  const hourlyDepreciation = annualDepreciation / operatingHoursPerYear;
  const hourlyMaintenance = (annualMaintenanceCost || 0) / operatingHoursPerYear;

  // Power cost (assume $0.12/kWh)
  const powerCostPerHour = printer.physical.powerRequirement * 0.12;

  return hourlyDepreciation + hourlyMaintenance + powerCostPerHour;
}
