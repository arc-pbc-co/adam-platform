/**
 * Desktop Metal Furnace Specifications Database
 *
 * Complete specifications for sintering furnaces including:
 * - Furnace dimensions and capacity
 * - Sintering cycle times and temperatures
 * - Gas consumption rates (Hydrogen, Nitrogen, Argon)
 * - Power consumption
 * - Equipment pricing
 * - Material compatibility
 *
 * Data sourced from: Binder Jet Cost Model Simplified v13-2-6
 */

export interface FurnaceSpecification {
  id: string;
  name: string;
  model: string;
  description: string;
  manufacturer: string;
  category: 'metal' | 'ceramic' | 'universal';

  // Physical specifications
  dimensions: {
    width: number; // cm
    depth: number; // cm
    height: number; // cm
  };

  // Processing volume
  processingVolume: {
    volume: number; // L (liters)
    maxLoadWeight: number; // kg
    effectiveWorkZone: string; // description
  };

  // Cycle specifications
  cycleSpecs: {
    typicalCycleTime: number; // hours
    maxTemperature: number; // °C
    heatingRate: number; // °C/hour
    coolingRate: number; // °C/hour
    atmospheres: Array<'Hydrogen' | 'Nitrogen' | 'Argon' | 'Vacuum' | 'Air'>;
  };

  // Gas consumption (per cycle)
  gasConsumption: {
    hydrogen?: {
      debind: number; // L/cycle
      sinter: number; // L/cycle
      total: number; // L/cycle
      costPerCycle: number; // $ (at $0.045/L)
    };
    nitrogen?: {
      debind: number; // L/cycle
      sinter: number; // L/cycle
      total: number; // L/cycle
      costPerCycle: number; // $ (at $0.0045/L)
    };
    argon?: {
      debind: number; // L/cycle
      sinter: number; // L/cycle
      total: number; // L/cycle
      costPerCycle: number; // $ (at $0.045/L)
    };
  };

  // Power consumption
  power: {
    ratedPower: number; // kW
    cycleEnergy: number; // kWh per cycle
    costPerCycle: number; // $ (at $0.12/kWh)
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
    batchCapacity: string; // description
    automation: string;
    vacuumLevel?: string; // for vacuum furnaces
  };

  // Environmental requirements
  environmental: {
    floorSpace: number; // m²
    ventilation: string;
    gasStorage: string;
    safetyRequirements: string[];
  };
}

/**
 * Complete Desktop Metal furnace fleet specifications
 */
export const FURNACE_SPECIFICATIONS: FurnaceSpecification[] = [
  {
    id: 'DM_1_6',
    name: 'Desktop Metal 1.6',
    model: 'DM 1.6',
    description: 'Compact sintering furnace for small batch production',
    manufacturer: 'Desktop Metal',
    category: 'metal',
    dimensions: {
      width: 120,
      depth: 100,
      height: 150,
    },
    processingVolume: {
      volume: 1.6,
      maxLoadWeight: 8,
      effectiveWorkZone: '200mm x 100mm x 80mm',
    },
    cycleSpecs: {
      typicalCycleTime: 24,
      maxTemperature: 1400,
      heatingRate: 50,
      coolingRate: 30,
      atmospheres: ['Hydrogen', 'Nitrogen', 'Argon'],
    },
    gasConsumption: {
      hydrogen: {
        debind: 1000,
        sinter: 500,
        total: 1500,
        costPerCycle: 67.5,
      },
      nitrogen: {
        debind: 500,
        sinter: 0,
        total: 500,
        costPerCycle: 2.25,
      },
    },
    power: {
      ratedPower: 6,
      cycleEnergy: 80,
      costPerCycle: 9.6,
    },
    pricing: {
      equipmentMSRP: 125000,
      installationCost: 10000,
      annualMaintenanceCost: 8000,
    },
    capabilities: {
      materials: ['SS_17_4PH', 'SS_316L', 'SS_304L', 'TOOL_420', 'TOOL_4140'],
      batchCapacity: 'Up to 4L print volume',
      automation: 'Semi-automated with manual loading',
    },
    environmental: {
      floorSpace: 3.0,
      ventilation: 'Exhaust hood required for hydrogen',
      gasStorage: 'H2 and N2 cylinders or bulk supply',
      safetyRequirements: ['H2 detection', 'Emergency shutdown', 'Ventilation interlock'],
    },
  },

  {
    id: 'PURESINTER_M1',
    name: 'PureSinter M1',
    model: 'PureSinter M1',
    description: 'High-throughput sintering system for production environments',
    manufacturer: 'Desktop Metal',
    category: 'metal',
    dimensions: {
      width: 150,
      depth: 120,
      height: 180,
    },
    processingVolume: {
      volume: 12.0,
      maxLoadWeight: 50,
      effectiveWorkZone: '400mm x 300mm x 100mm',
    },
    cycleSpecs: {
      typicalCycleTime: 20,
      maxTemperature: 1450,
      heatingRate: 75,
      coolingRate: 40,
      atmospheres: ['Hydrogen', 'Nitrogen', 'Argon'],
    },
    gasConsumption: {
      hydrogen: {
        debind: 5000,
        sinter: 2500,
        total: 7500,
        costPerCycle: 337.5,
      },
      nitrogen: {
        debind: 2000,
        sinter: 0,
        total: 2000,
        costPerCycle: 9.0,
      },
    },
    power: {
      ratedPower: 18,
      cycleEnergy: 280,
      costPerCycle: 33.6,
    },
    pricing: {
      equipmentMSRP: 285000,
      installationCost: 25000,
      annualMaintenanceCost: 18000,
    },
    capabilities: {
      materials: ['SS_17_4PH', 'SS_316L', 'SS_304L', 'TOOL_420', 'TOOL_4140', 'INCONEL_625', 'INCONEL_718'],
      batchCapacity: 'Up to 12L print volume',
      automation: 'Automated loading with conveyor system',
    },
    environmental: {
      floorSpace: 6.0,
      ventilation: 'Dedicated exhaust system required',
      gasStorage: 'Bulk H2 and N2 supply recommended',
      safetyRequirements: ['H2 detection', 'Emergency shutdown', 'Ventilation interlock', 'Fire suppression'],
    },
  },

  {
    id: 'MIM_420',
    name: 'MIM Furnace 420',
    model: 'MIM 420',
    description: 'Metal injection molding compatible sintering furnace',
    manufacturer: 'Third Party',
    category: 'metal',
    dimensions: {
      width: 160,
      depth: 140,
      height: 200,
    },
    processingVolume: {
      volume: 42.0,
      maxLoadWeight: 200,
      effectiveWorkZone: '600mm x 400mm x 175mm',
    },
    cycleSpecs: {
      typicalCycleTime: 18,
      maxTemperature: 1500,
      heatingRate: 100,
      coolingRate: 50,
      atmospheres: ['Hydrogen', 'Nitrogen', 'Argon', 'Vacuum'],
    },
    gasConsumption: {
      hydrogen: {
        debind: 15000,
        sinter: 7500,
        total: 22500,
        costPerCycle: 1012.5,
      },
      nitrogen: {
        debind: 8000,
        sinter: 0,
        total: 8000,
        costPerCycle: 36.0,
      },
      argon: {
        debind: 10000,
        sinter: 5000,
        total: 15000,
        costPerCycle: 675.0,
      },
    },
    power: {
      ratedPower: 45,
      cycleEnergy: 650,
      costPerCycle: 78.0,
    },
    pricing: {
      equipmentMSRP: 475000,
      installationCost: 40000,
      annualMaintenanceCost: 30000,
    },
    capabilities: {
      materials: ['SS_17_4PH', 'SS_316L', 'SS_304L', 'TOOL_420', 'TOOL_4140', 'INCONEL_625', 'INCONEL_718', 'TI64', 'COCRMO', 'WC_12CO'],
      batchCapacity: 'Multiple print jobs simultaneously',
      automation: 'Fully automated with robotic loading',
      vacuumLevel: '10^-5 mbar',
    },
    environmental: {
      floorSpace: 12.0,
      ventilation: 'Industrial exhaust system',
      gasStorage: 'Bulk supply required for all gases',
      safetyRequirements: ['H2 detection', 'Emergency shutdown', 'Ventilation interlock', 'Fire suppression', 'Personnel training'],
    },
  },

  {
    id: 'TI_FURNACE',
    name: 'Titanium Sintering Furnace',
    model: 'Ti-Sinter 1000',
    description: 'Specialized high-temperature vacuum furnace for reactive metals',
    manufacturer: 'Third Party',
    category: 'metal',
    dimensions: {
      width: 180,
      depth: 160,
      height: 220,
    },
    processingVolume: {
      volume: 100.0,
      maxLoadWeight: 150,
      effectiveWorkZone: '800mm x 500mm x 250mm',
    },
    cycleSpecs: {
      typicalCycleTime: 30,
      maxTemperature: 1700,
      heatingRate: 50,
      coolingRate: 25,
      atmospheres: ['Argon', 'Vacuum'],
    },
    gasConsumption: {
      argon: {
        debind: 25000,
        sinter: 15000,
        total: 40000,
        costPerCycle: 1800.0,
      },
    },
    power: {
      ratedPower: 80,
      cycleEnergy: 1800,
      costPerCycle: 216.0,
    },
    pricing: {
      equipmentMSRP: 950000,
      installationCost: 80000,
      annualMaintenanceCost: 60000,
    },
    capabilities: {
      materials: ['TI64'],
      batchCapacity: 'Large batch production',
      automation: 'Fully automated with inert atmosphere glovebox loading',
      vacuumLevel: '10^-6 mbar',
    },
    environmental: {
      floorSpace: 20.0,
      ventilation: 'Separate room with inert atmosphere control',
      gasStorage: 'Dedicated argon bulk system',
      safetyRequirements: ['Oxygen monitoring', 'Inert atmosphere', 'Fire suppression', 'Specialized training'],
    },
  },

  {
    id: 'CERAMIC_BOX',
    name: 'Ceramic Box Furnace',
    model: 'CeramBox 1600',
    description: 'High-temperature box furnace for technical ceramics',
    manufacturer: 'Third Party',
    category: 'ceramic',
    dimensions: {
      width: 200,
      depth: 180,
      height: 240,
    },
    processingVolume: {
      volume: 160.0,
      maxLoadWeight: 300,
      effectiveWorkZone: '1000mm x 800mm x 400mm',
    },
    cycleSpecs: {
      typicalCycleTime: 36,
      maxTemperature: 1800,
      heatingRate: 30,
      coolingRate: 20,
      atmospheres: ['Air', 'Nitrogen', 'Argon'],
    },
    gasConsumption: {
      nitrogen: {
        debind: 0,
        sinter: 0,
        total: 0,
        costPerCycle: 0,
      },
    },
    power: {
      ratedPower: 60,
      cycleEnergy: 1500,
      costPerCycle: 180.0,
    },
    pricing: {
      equipmentMSRP: 325000,
      installationCost: 30000,
      annualMaintenanceCost: 20000,
    },
    capabilities: {
      materials: ['ALUMINA', 'SIC'],
      batchCapacity: 'Large ceramic parts',
      automation: 'Manual loading with programmable control',
    },
    environmental: {
      floorSpace: 15.0,
      ventilation: 'Standard industrial ventilation',
      gasStorage: 'Optional inert gas for controlled atmosphere',
      safetyRequirements: ['High temperature warnings', 'Heat shielding'],
    },
  },

  {
    id: 'SIC_CARBOTHERMIC',
    name: 'Silicon Carbide Carbothermic Furnace',
    model: 'SiC-CT 2000',
    description: 'Specialized carbothermic reduction furnace for silicon carbide',
    manufacturer: 'Third Party',
    category: 'ceramic',
    dimensions: {
      width: 250,
      depth: 200,
      height: 300,
    },
    processingVolume: {
      volume: 200.0,
      maxLoadWeight: 400,
      effectiveWorkZone: '1200mm x 1000mm x 500mm',
    },
    cycleSpecs: {
      typicalCycleTime: 48,
      maxTemperature: 2200,
      heatingRate: 25,
      coolingRate: 15,
      atmospheres: ['Argon', 'Vacuum'],
    },
    gasConsumption: {
      argon: {
        debind: 50000,
        sinter: 30000,
        total: 80000,
        costPerCycle: 3600.0,
      },
    },
    power: {
      ratedPower: 150,
      cycleEnergy: 5000,
      costPerCycle: 600.0,
    },
    pricing: {
      equipmentMSRP: 1200000,
      installationCost: 120000,
      annualMaintenanceCost: 80000,
    },
    capabilities: {
      materials: ['SIC'],
      batchCapacity: 'Large structural ceramic components',
      automation: 'Semi-automated with crane loading',
      vacuumLevel: '10^-4 mbar',
    },
    environmental: {
      floorSpace: 40.0,
      ventilation: 'Heavy industrial exhaust with scrubbing',
      gasStorage: 'Large-scale argon bulk system',
      safetyRequirements: ['Ultra-high temperature safety', 'Carbide dust control', 'Specialized training', 'Emergency cooling'],
    },
  },

  {
    id: 'PRECIOUS_METAL_FURNACE',
    name: 'Precious Metal Sintering Furnace',
    model: 'PM-Sinter 200',
    description: 'Clean-room compatible furnace for gold, silver, and precious metals',
    manufacturer: 'Third Party',
    category: 'metal',
    dimensions: {
      width: 100,
      depth: 80,
      height: 120,
    },
    processingVolume: {
      volume: 2.0,
      maxLoadWeight: 5,
      effectiveWorkZone: '150mm x 100mm x 100mm',
    },
    cycleSpecs: {
      typicalCycleTime: 8,
      maxTemperature: 1100,
      heatingRate: 100,
      coolingRate: 80,
      atmospheres: ['Nitrogen', 'Argon'],
    },
    gasConsumption: {
      nitrogen: {
        debind: 200,
        sinter: 100,
        total: 300,
        costPerCycle: 1.35,
      },
      argon: {
        debind: 300,
        sinter: 150,
        total: 450,
        costPerCycle: 20.25,
      },
    },
    power: {
      ratedPower: 4,
      cycleEnergy: 20,
      costPerCycle: 2.4,
    },
    pricing: {
      equipmentMSRP: 85000,
      installationCost: 8000,
      annualMaintenanceCost: 5000,
    },
    capabilities: {
      materials: ['GOLD', 'SILVER'],
      batchCapacity: 'Small jewelry and electronics parts',
      automation: 'Manual loading in clean environment',
    },
    environmental: {
      floorSpace: 2.0,
      ventilation: 'Clean room with laminar flow',
      gasStorage: 'Small cylinder storage',
      safetyRequirements: ['Clean room protocols', 'Material security', 'Inert atmosphere'],
    },
  },
];

/**
 * Get furnace specification by ID
 */
export function getFurnaceById(id: string): FurnaceSpecification | undefined {
  return FURNACE_SPECIFICATIONS.find(f => f.id === id);
}

/**
 * Get furnaces by category
 */
export function getFurnacesByCategory(category: 'metal' | 'ceramic' | 'universal'): FurnaceSpecification[] {
  return FURNACE_SPECIFICATIONS.filter(f => f.category === category);
}

/**
 * Get furnaces compatible with a specific material
 */
export function getFurnacesForMaterial(materialId: string): FurnaceSpecification[] {
  return FURNACE_SPECIFICATIONS.filter(f => f.capabilities.materials.includes(materialId));
}

/**
 * Get furnaces supporting specific atmosphere
 */
export function getFurnacesByAtmosphere(
  atmosphere: 'Hydrogen' | 'Nitrogen' | 'Argon' | 'Vacuum' | 'Air'
): FurnaceSpecification[] {
  return FURNACE_SPECIFICATIONS.filter(f => f.cycleSpecs.atmospheres.includes(atmosphere));
}

/**
 * Calculate sintering cost for material
 */
export function calculateSinteringCost(
  furnaceId: string,
  materialId: string,
  sinteringAtmosphere: 'Hydrogen' | 'Nitrogen' | 'Argon' | 'Vacuum' | 'Air'
): number {
  const furnace = getFurnaceById(furnaceId);
  if (!furnace) return 0;

  let gasCost = 0;

  // Get gas consumption cost based on atmosphere
  switch (sinteringAtmosphere) {
    case 'Hydrogen':
      gasCost = furnace.gasConsumption.hydrogen?.costPerCycle || 0;
      break;
    case 'Nitrogen':
      gasCost = furnace.gasConsumption.nitrogen?.costPerCycle || 0;
      break;
    case 'Argon':
      gasCost = furnace.gasConsumption.argon?.costPerCycle || 0;
      break;
    case 'Vacuum':
      gasCost = 0; // No gas cost for vacuum
      break;
    case 'Air':
      gasCost = 0; // No gas cost for air
      break;
  }

  const powerCost = furnace.power.costPerCycle;
  const maintenanceCost = (furnace.pricing.annualMaintenanceCost || 0) / 200; // Assume 200 cycles per year

  return gasCost + powerCost + maintenanceCost;
}

/**
 * Get optimal furnace for material and batch size
 */
export function getOptimalFurnace(
  materialId: string,
  batchVolume: number, // liters
  sinteringAtmosphere: 'Hydrogen' | 'Nitrogen' | 'Argon' | 'Vacuum' | 'Air'
): FurnaceSpecification | undefined {
  const compatibleFurnaces = FURNACE_SPECIFICATIONS.filter(
    f =>
      f.capabilities.materials.includes(materialId) &&
      f.processingVolume.volume >= batchVolume &&
      f.cycleSpecs.atmospheres.includes(sinteringAtmosphere)
  );

  if (compatibleFurnaces.length === 0) return undefined;

  // Sort by cost efficiency (cost per liter per cycle)
  return compatibleFurnaces.sort((a, b) => {
    const costA = calculateSinteringCost(a.id, materialId, sinteringAtmosphere) / a.processingVolume.volume;
    const costB = calculateSinteringCost(b.id, materialId, sinteringAtmosphere) / b.processingVolume.volume;
    return costA - costB;
  })[0];
}

/**
 * Calculate furnace utilization cost per hour
 */
export function calculateFurnaceHourlyCost(furnaceId: string): number {
  const furnace = getFurnaceById(furnaceId);
  if (!furnace) return 0;

  const { equipmentMSRP, annualMaintenanceCost } = furnace.pricing;

  // Depreciation over 10 years (furnaces have longer life than printers)
  const annualDepreciation = equipmentMSRP / 10;

  // Assume 4000 hours of operation per year (continuous operation)
  const operatingHoursPerYear = 4000;

  const hourlyDepreciation = annualDepreciation / operatingHoursPerYear;
  const hourlyMaintenance = (annualMaintenanceCost || 0) / operatingHoursPerYear;

  // Average power cost per hour
  const powerCostPerHour = furnace.power.ratedPower * 0.12;

  return hourlyDepreciation + hourlyMaintenance + powerCostPerHour;
}

/**
 * Estimate total furnace time including heating, sintering, and cooling
 */
export function estimateTotalCycleTime(furnaceId: string, sinteringTemp: number): number {
  const furnace = getFurnaceById(furnaceId);
  if (!furnace) return 0;

  const { heatingRate, coolingRate, typicalCycleTime } = furnace.cycleSpecs;

  // Use typical cycle time as baseline
  return typicalCycleTime;
}
