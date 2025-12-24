/**
 * Cost Calculation Service
 *
 * Comprehensive cost estimation for experiments including:
 * - Material costs based on part volume and powder usage
 * - Printing costs (equipment, consumables, labor)
 * - Sintering costs (gas, power, equipment)
 * - Total experiment cost prediction
 * - Cost optimization recommendations
 *
 * Integrates MaterialsDatabase, PrinterSpecifications, and FurnaceSpecifications
 */

import {
  MATERIALS_DATABASE,
  getMaterialById,
  getMaterialPrice,
} from '../data/MaterialsDatabase';
import {
  PRINTER_SPECIFICATIONS,
  getPrinterById,
  calculateBuildTime,
  calculatePrinterHourlyCost,
  getOptimalPrinter,
} from '../data/PrinterSpecifications';
import {
  FURNACE_SPECIFICATIONS,
  getFurnaceById,
  calculateSinteringCost,
  calculateFurnaceHourlyCost,
  getOptimalFurnace,
} from '../data/FurnaceSpecifications';

export interface PartSpecification {
  volume: number; // cm³
  dimensions: {
    x: number; // mm
    y: number; // mm
    z: number; // mm
  };
  materialId: string;
  quantity: number; // number of parts
  layerThickness?: number; // μm (default: 50)
}

export interface CostBreakdown {
  // Material costs
  materialCosts: {
    partMaterial: number; // $ - actual part material
    loosePowder: number; // $ - loose powder around part
    supportPowder: number; // $ - support material
    wasteAllowance: number; // $ - 10% waste
    totalMaterial: number; // $ - sum of above
  };

  // Printing costs
  printingCosts: {
    equipmentDepreciation: number; // $ - printer depreciation per job
    consumables: {
      printhead: number; // $ - printhead usage
      binder: number; // $ - binder usage
      wiperCartridge: number; // $ - wiper cartridge usage
      total: number; // $ - sum of consumables
    };
    power: number; // $ - electrical cost for printing
    labor: number; // $ - operator time
    totalPrinting: number; // $ - sum of above
  };

  // Sintering costs
  sinteringCosts: {
    equipmentDepreciation: number; // $ - furnace depreciation
    gas: number; // $ - hydrogen, nitrogen, or argon
    power: number; // $ - electrical cost for sintering
    labor: number; // $ - operator time for loading/unloading
    totalSintering: number; // $ - sum of above
  };

  // Summary
  summary: {
    totalMaterial: number;
    totalProcessing: number; // printing + sintering
    totalLabor: number;
    grandTotal: number;
    costPerPart: number;
  };

  // Metadata
  metadata: {
    printerId: string;
    printerName: string;
    furnaceId: string;
    furnaceName: string;
    materialName: string;
    estimatedPrintTime: number; // hours
    estimatedSinterTime: number; // hours
    totalLeadTime: number; // hours
  };
}

export interface CostOptimizationRecommendation {
  currentCost: number;
  optimizedCost: number;
  savings: number;
  savingsPercent: number;
  recommendations: Array<{
    category: 'printer' | 'material' | 'process' | 'batch';
    description: string;
    potentialSavings: number;
    tradeoffs: string;
  }>;
}

export class CostCalculationService {
  private laborRatePerHour = 50; // $ per hour for operator

  /**
   * Calculate complete cost for an experiment
   */
  calculateExperimentCost(
    part: PartSpecification,
    printerId?: string,
    furnaceId?: string
  ): CostBreakdown {
    const material = getMaterialById(part.materialId);
    if (!material) {
      throw new Error(`Material ${part.materialId} not found`);
    }

    // Select optimal printer if not specified
    let printer = printerId ? getPrinterById(printerId) : undefined;
    if (!printer) {
      printer = getOptimalPrinter(part.materialId, part.dimensions, 'cost');
      if (!printer) {
        throw new Error(`No compatible printer found for material ${part.materialId}`);
      }
    }

    // Select optimal furnace if not specified
    let furnace = furnaceId ? getFurnaceById(furnaceId) : undefined;
    if (!furnace) {
      const batchVolume = (part.volume * part.quantity) / 1000; // Convert cm³ to liters
      furnace = getOptimalFurnace(part.materialId, batchVolume, material.sinteringAtmosphere);
      if (!furnace) {
        throw new Error(`No compatible furnace found for material ${part.materialId}`);
      }
    }

    // Calculate material costs
    const materialCosts = this.calculateMaterialCosts(part, printer.id, printer.powderSystem);

    // Calculate printing costs
    const printTime = calculateBuildTime(printer.id, part.dimensions.z, part.layerThickness || 50);
    const printingCosts = this.calculatePrintingCosts(part, printer, printTime);

    // Calculate sintering costs
    const sinterTime = furnace.cycleSpecs.typicalCycleTime;
    const sinteringCosts = this.calculateSinteringCosts(
      furnace,
      material.sinteringAtmosphere,
      part.materialId
    );

    // Calculate totals
    const totalMaterial = materialCosts.totalMaterial;
    const totalProcessing = printingCosts.totalPrinting + sinteringCosts.totalSintering;
    const totalLabor = printingCosts.labor + sinteringCosts.labor;
    const grandTotal = totalMaterial + totalProcessing;
    const costPerPart = grandTotal / part.quantity;

    return {
      materialCosts,
      printingCosts,
      sinteringCosts,
      summary: {
        totalMaterial,
        totalProcessing,
        totalLabor,
        grandTotal,
        costPerPart,
      },
      metadata: {
        printerId: printer.id,
        printerName: printer.name,
        furnaceId: furnace.id,
        furnaceName: furnace.name,
        materialName: material.name,
        estimatedPrintTime: printTime,
        estimatedSinterTime: sinterTime,
        totalLeadTime: printTime + sinterTime,
      },
    };
  }

  /**
   * Calculate material costs
   */
  private calculateMaterialCosts(
    part: PartSpecification,
    printerId: string,
    powderSystem: any
  ): CostBreakdown['materialCosts'] {
    const materialPrice = getMaterialPrice(part.materialId, printerId);
    if (!materialPrice) {
      throw new Error(`Material ${part.materialId} not available for printer ${printerId}`);
    }

    // Calculate volumes
    const partVolume = part.volume * part.quantity; // cm³
    const loosePowderVolume = partVolume * powderSystem.loosePowderRatio;
    const supportPowderVolume = partVolume * powderSystem.supportPowderRatio;

    // Convert to kg (assuming bed density from powder system)
    const bedDensity = powderSystem.bedDensity; // g/cm³
    const partMassKg = (partVolume * bedDensity) / 1000;
    const loosePowderMassKg = (loosePowderVolume * bedDensity) / 1000;
    const supportPowderMassKg = (supportPowderVolume * bedDensity) / 1000;

    // Calculate costs
    const partMaterialCost = partMassKg * materialPrice;
    const loosePowderCost = loosePowderMassKg * materialPrice;
    const supportPowderCost = supportPowderMassKg * materialPrice;

    // Add 10% waste allowance
    const subtotal = partMaterialCost + loosePowderCost + supportPowderCost;
    const wasteAllowance = subtotal * 0.1;

    return {
      partMaterial: partMaterialCost,
      loosePowder: loosePowderCost,
      supportPowder: supportPowderCost,
      wasteAllowance,
      totalMaterial: subtotal + wasteAllowance,
    };
  }

  /**
   * Calculate printing costs
   */
  private calculatePrintingCosts(
    part: PartSpecification,
    printer: any,
    printTime: number
  ): CostBreakdown['printingCosts'] {
    // Equipment depreciation
    const printerHourlyCost = calculatePrinterHourlyCost(printer.id);
    const equipmentDepreciation = printerHourlyCost * printTime;

    // Consumables
    const binderUsage = this.estimateBinderUsage(part.volume * part.quantity, printer);
    const binderCost = (binderUsage / 1000) * printer.binderSystem.binderCostPerLiter;

    const printheadCost =
      (binderUsage / printer.binderSystem.printheadLifetime) * printer.binderSystem.printheadCost;

    const numLayers = (part.dimensions.z * 1000) / (part.layerThickness || 50);
    const wiperCost =
      (numLayers / printer.consumables.wiperLifetime) * printer.consumables.wiperCartridgeCost;

    const consumablesTotal = binderCost + printheadCost + wiperCost;

    // Power cost
    const powerCost = printer.physical.powerRequirement * printTime * 0.12; // $0.12/kWh

    // Labor (assume 0.5 hours for setup and 0.25 hours for unloading)
    const laborHours = 0.75;
    const labor = laborHours * this.laborRatePerHour;

    return {
      equipmentDepreciation,
      consumables: {
        printhead: printheadCost,
        binder: binderCost,
        wiperCartridge: wiperCost,
        total: consumablesTotal,
      },
      power: powerCost,
      labor,
      totalPrinting: equipmentDepreciation + consumablesTotal + powerCost + labor,
    };
  }

  /**
   * Calculate sintering costs
   */
  private calculateSinteringCosts(
    furnace: any,
    atmosphere: string,
    materialId: string
  ): CostBreakdown['sinteringCosts'] {
    // Equipment depreciation
    const furnaceHourlyCost = calculateFurnaceHourlyCost(furnace.id);
    const cycleTime = furnace.cycleSpecs.typicalCycleTime;
    const equipmentDepreciation = furnaceHourlyCost * cycleTime;

    // Gas cost
    const gasCost = calculateSinteringCost(furnace.id, materialId, atmosphere as any);

    // Power cost (already included in calculateSinteringCost, extract it)
    const powerCost = furnace.power.costPerCycle;

    // Labor (assume 1 hour for loading and 0.5 hours for unloading)
    const laborHours = 1.5;
    const labor = laborHours * this.laborRatePerHour;

    return {
      equipmentDepreciation,
      gas: gasCost - powerCost, // Subtract power to avoid double counting
      power: powerCost,
      labor,
      totalSintering: equipmentDepreciation + gasCost + labor,
    };
  }

  /**
   * Estimate binder usage based on part volume
   */
  private estimateBinderUsage(volume: number, printer: any): number {
    // Binder saturation is typically 3-5% of part volume
    const binderSaturation = 0.04; // 4% average
    const binderDensity = 1.0; // g/mL (water-based binder)

    // Volume in cm³, convert to mL, apply saturation
    const binderVolume = volume * binderSaturation;

    return binderVolume; // mL
  }

  /**
   * Batch multiple parts to calculate cost savings
   */
  calculateBatchCost(parts: PartSpecification[], printerId?: string): CostBreakdown {
    // Combine all parts into a single batch
    const totalVolume = parts.reduce((sum, p) => sum + p.volume * p.quantity, 0);
    const maxZ = Math.max(...parts.map(p => p.dimensions.z));

    // Use the material of the first part (assume all same material in batch)
    const materialId = parts[0].materialId;

    const batchPart: PartSpecification = {
      volume: totalVolume,
      dimensions: {
        x: 200, // Placeholder
        y: 200,
        z: maxZ,
      },
      materialId,
      quantity: parts.reduce((sum, p) => sum + p.quantity, 0),
    };

    return this.calculateExperimentCost(batchPart, printerId);
  }

  /**
   * Get cost optimization recommendations
   */
  getOptimizationRecommendations(
    part: PartSpecification,
    currentCost: CostBreakdown
  ): CostOptimizationRecommendation {
    const recommendations: CostOptimizationRecommendation['recommendations'] = [];

    // Check if a different printer could be more cost-effective
    const currentPrinter = getPrinterById(currentCost.metadata.printerId);
    const optimalPrinter = getOptimalPrinter(part.materialId, part.dimensions, 'cost');

    if (optimalPrinter && currentPrinter && optimalPrinter.id !== currentPrinter.id) {
      const optimizedCost = this.calculateExperimentCost(part, optimalPrinter.id);
      const savings = currentCost.summary.grandTotal - optimizedCost.summary.grandTotal;

      if (savings > 0) {
        recommendations.push({
          category: 'printer',
          description: `Switch to ${optimalPrinter.name} for lower equipment costs`,
          potentialSavings: savings,
          tradeoffs: 'May have different build volume or layer resolution',
        });
      }
    }

    // Check if batching could reduce costs
    if (part.quantity > 1) {
      const singlePartCost = this.calculateExperimentCost({ ...part, quantity: 1 });
      const batchSavingsPerPart =
        singlePartCost.summary.costPerPart - currentCost.summary.costPerPart;

      if (batchSavingsPerPart > 0) {
        recommendations.push({
          category: 'batch',
          description: `Batching ${part.quantity} parts saves ${batchSavingsPerPart.toFixed(2)} per part`,
          potentialSavings: batchSavingsPerPart * part.quantity,
          tradeoffs: 'None - already optimized for batching',
        });
      }
    }

    // Check if thicker layers could reduce costs
    const currentLayerThickness = part.layerThickness || 50;
    if (currentLayerThickness < 100) {
      const thickerLayerPart = { ...part, layerThickness: 100 };
      const thickerLayerCost = this.calculateExperimentCost(
        thickerLayerPart,
        currentCost.metadata.printerId
      );
      const savings = currentCost.summary.grandTotal - thickerLayerCost.summary.grandTotal;

      if (savings > 0) {
        recommendations.push({
          category: 'process',
          description: 'Increase layer thickness to 100μm to reduce print time',
          potentialSavings: savings,
          tradeoffs: 'Slightly reduced surface finish and feature resolution',
        });
      }
    }

    // Calculate total optimized cost
    const totalOptimizedSavings = recommendations.reduce((sum, r) => sum + r.potentialSavings, 0);
    const optimizedCost = currentCost.summary.grandTotal - totalOptimizedSavings;

    return {
      currentCost: currentCost.summary.grandTotal,
      optimizedCost,
      savings: totalOptimizedSavings,
      savingsPercent: (totalOptimizedSavings / currentCost.summary.grandTotal) * 100,
      recommendations,
    };
  }

  /**
   * Compare costs across multiple printer options
   */
  comparePrinterCosts(part: PartSpecification): Array<{
    printerId: string;
    printerName: string;
    totalCost: number;
    costPerPart: number;
    printTime: number;
  }> {
    const material = getMaterialById(part.materialId);
    if (!material) return [];

    const compatiblePrinters = PRINTER_SPECIFICATIONS.filter(p =>
      p.capabilities.materials.includes(part.materialId)
    );

    return compatiblePrinters
      .map(printer => {
        try {
          const cost = this.calculateExperimentCost(part, printer.id);
          return {
            printerId: printer.id,
            printerName: printer.name,
            totalCost: cost.summary.grandTotal,
            costPerPart: cost.summary.costPerPart,
            printTime: cost.metadata.estimatedPrintTime,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => a!.totalCost - b!.totalCost) as any;
  }

  /**
   * Estimate annual production cost
   */
  estimateAnnualCost(
    part: PartSpecification,
    partsPerYear: number,
    printerId?: string
  ): {
    totalAnnualCost: number;
    costPerPart: number;
    materialCost: number;
    processingCost: number;
    laborCost: number;
    numberOfBatches: number;
    totalProductionTime: number; // hours
  } {
    // Calculate single batch cost
    const batchSize = Math.min(part.quantity, 100); // Max 100 parts per batch
    const batchPart = { ...part, quantity: batchSize };
    const batchCost = this.calculateExperimentCost(batchPart, printerId);

    const numberOfBatches = Math.ceil(partsPerYear / batchSize);

    const totalAnnualCost = batchCost.summary.grandTotal * numberOfBatches;
    const costPerPart = totalAnnualCost / partsPerYear;

    return {
      totalAnnualCost,
      costPerPart,
      materialCost: batchCost.summary.totalMaterial * numberOfBatches,
      processingCost: batchCost.summary.totalProcessing * numberOfBatches,
      laborCost: batchCost.summary.totalLabor * numberOfBatches,
      numberOfBatches,
      totalProductionTime: batchCost.metadata.totalLeadTime * numberOfBatches,
    };
  }
}

// Export singleton instance
export const costCalculationService = new CostCalculationService();
