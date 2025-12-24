import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Thermometer,
  AlertTriangle,
  Clock,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Layers,
  Database,
  Calculator,
  ChevronDown,
  Search,
  X,
  Package,
  Zap,
  Activity,
  Printer,
  DollarSign,
  TrendingUp,
  Cpu,
  Gauge,
  Timer,
  Droplets,
  Settings2,
  ShoppingCart,
} from 'lucide-react';
import { SupplyOrderForm } from './SupplyOrderForm';

interface PrinterTelemetry {
  jobProgress: number;
  jobElapsedTime: string;
  timeRemaining: string;
  layersPrinted: number;
  totalLayers: number;
  printResolution: string;
  binderLimit: number[];
  wiperCount: number;
  wiperMax: number;
  printheadLife: number;
  printheadMax: number;
  printedLayers: number;
  binderTrayVaporSponge: number;
  binderTrayMax: number;
}

interface PrinterUnit {
  id: string;
  name: string;
  model: string;
  status: 'printing' | 'idle' | 'maintenance' | 'error' | 'sintering';
  progress?: number;
  temperature?: number;
  currentJob?: string;
  position: { x: number; y: number };
  rotation?: number;
  telemetry?: PrinterTelemetry;
}

interface RobotArm {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'moving';
  position: { x: number; y: number };
  targetPrinter?: string;
}

interface Material {
  id: string;
  name: string;
  composition: string;
  category: string;
  stockKg: number;
  costPerKg: number;
  properties: {
    density: number;
    meltingPoint: number;
    hardness?: number;
  };
}

interface FactoryFloorCanvasProps {
  onPrinterSelect?: (printer: PrinterUnit | null) => void;
}

type PanelType = 'none' | 'materials' | 'calculator';

// Materials database
const materials: Material[] = [
  { id: 'm1', name: '17-4PH Stainless Steel', composition: 'Fe-Cr-Ni-Cu', category: 'Steel', stockKg: 245, costPerKg: 85, properties: { density: 7.78, meltingPoint: 1404, hardness: 36 } },
  { id: 'm2', name: '316L Stainless Steel', composition: 'Fe-Cr-Ni-Mo', category: 'Steel', stockKg: 312, costPerKg: 72, properties: { density: 7.99, meltingPoint: 1375, hardness: 25 } },
  { id: 'm3', name: 'H13 Tool Steel', composition: 'Fe-Cr-Mo-V', category: 'Steel', stockKg: 156, costPerKg: 95, properties: { density: 7.80, meltingPoint: 1427, hardness: 52 } },
  { id: 'm4', name: 'Inconel 625', composition: 'Ni-Cr-Mo-Nb', category: 'Superalloy', stockKg: 89, costPerKg: 320, properties: { density: 8.44, meltingPoint: 1350 } },
  { id: 'm5', name: 'Ti-6Al-4V', composition: 'Ti-Al-V', category: 'Titanium', stockKg: 67, costPerKg: 450, properties: { density: 4.43, meltingPoint: 1660, hardness: 36 } },
  { id: 'm6', name: 'AlSi10Mg', composition: 'Al-Si-Mg', category: 'Aluminum', stockKg: 423, costPerKg: 55, properties: { density: 2.67, meltingPoint: 570 } },
  { id: 'm7', name: 'Copper', composition: 'Cu', category: 'Copper', stockKg: 198, costPerKg: 125, properties: { density: 8.96, meltingPoint: 1085 } },
  { id: 'm8', name: 'MnBi', composition: 'Mn-Bi', category: 'Magnetic', stockKg: 34, costPerKg: 890, properties: { density: 8.88, meltingPoint: 446 } },
  { id: 'm9', name: 'Fe-Co Alloy', composition: 'Fe-Co', category: 'Magnetic', stockKg: 56, costPerKg: 780, properties: { density: 8.12, meltingPoint: 1480 } },
  { id: 'm10', name: 'FeNi (L10)', composition: 'Fe-Ni', category: 'Magnetic', stockKg: 23, costPerKg: 950, properties: { density: 8.25, meltingPoint: 1455 } },
  { id: 'm11', name: 'Bronze 90/10', composition: 'Cu-Sn', category: 'Bronze', stockKg: 145, costPerKg: 95, properties: { density: 8.78, meltingPoint: 1000 } },
  { id: 'm12', name: 'Tungsten Carbide', composition: 'WC-Co', category: 'Carbide', stockKg: 28, costPerKg: 520, properties: { density: 15.63, meltingPoint: 2870, hardness: 91 } },
  { id: 'm13', name: 'NASICON', composition: 'Na3Zr2Si2PO12', category: 'Electrolyte', stockKg: 12, costPerKg: 1200, properties: { density: 3.27, meltingPoint: 1200 } },
  { id: 'm14', name: 'Cobalt Chrome', composition: 'Co-Cr-Mo', category: 'Cobalt', stockKg: 56, costPerKg: 340, properties: { density: 8.30, meltingPoint: 1330, hardness: 36 } },
  { id: 'm15', name: 'Maraging Steel', composition: 'Fe-Ni-Co-Mo', category: 'Steel', stockKg: 89, costPerKg: 165, properties: { density: 8.10, meltingPoint: 1413, hardness: 54 } },
  { id: 'm16', name: 'Pure Iron', composition: 'Fe', category: 'Iron', stockKg: 234, costPerKg: 45, properties: { density: 7.87, meltingPoint: 1538 } },
];

// Generate mock telemetry data for a printer
const generateTelemetry = (progress: number = 0): PrinterTelemetry => ({
  jobProgress: progress,
  jobElapsedTime: `${Math.floor(progress * 0.5)}h ${Math.floor(Math.random() * 60)}m`,
  timeRemaining: `${Math.floor((100 - progress) * 0.3)}h ${Math.floor(Math.random() * 60)}m`,
  layersPrinted: Math.floor(progress * 6.64),
  totalLayers: 664,
  printResolution: '50μm',
  binderLimit: [0.19, 0.267, 0.186, 0.26, 0.19, 0.151, 0.195],
  wiperCount: Math.floor(progress * 1.64),
  wiperMax: 164,
  printheadLife: Math.floor(1.03 * 1000),
  printheadMax: 5000,
  printedLayers: Math.floor(progress * 6.61),
  binderTrayVaporSponge: Math.floor(progress * 1.12),
  binderTrayMax: 112,
});

// Generate telemetry for idle/inactive machines (shows consumable wear from past jobs)
const generateIdleTelemetry = (): PrinterTelemetry => ({
  jobProgress: 0,
  jobElapsedTime: '0h 0m',
  timeRemaining: '--',
  layersPrinted: 0,
  totalLayers: 0,
  printResolution: '50μm',
  binderLimit: [0.15, 0.18, 0.12, 0.22, 0.16, 0.14, 0.17],
  wiperCount: Math.floor(Math.random() * 80 + 20),
  wiperMax: 164,
  printheadLife: Math.floor(Math.random() * 2000 + 500),
  printheadMax: 5000,
  printedLayers: 0,
  binderTrayVaporSponge: Math.floor(Math.random() * 60 + 10),
  binderTrayMax: 112,
});

// Generate telemetry for machines in maintenance (shows high consumable wear)
const generateMaintenanceTelemetry = (): PrinterTelemetry => ({
  jobProgress: 0,
  jobElapsedTime: '0h 0m',
  timeRemaining: '--',
  layersPrinted: 0,
  totalLayers: 0,
  printResolution: '50μm',
  binderLimit: [0.08, 0.12, 0.06, 0.15, 0.09, 0.07, 0.11],
  wiperCount: 152, // High - needs replacement
  wiperMax: 164,
  printheadLife: 4650, // High - needs replacement
  printheadMax: 5000,
  printedLayers: 0,
  binderTrayVaporSponge: 98, // High - needs replacement
  binderTrayMax: 112,
});

// Generate telemetry for machines with errors
const generateErrorTelemetry = (): PrinterTelemetry => ({
  jobProgress: 23, // Job failed mid-print
  jobElapsedTime: '4h 12m',
  timeRemaining: 'ERR',
  layersPrinted: 153,
  totalLayers: 664,
  printResolution: '50μm',
  binderLimit: [0.42, 0.38, 0.45, 0.31, 0.39, 0.44, 0.36], // Elevated - possible issue
  wiperCount: 89,
  wiperMax: 164,
  printheadLife: 2340,
  printheadMax: 5000,
  printedLayers: 153,
  binderTrayVaporSponge: 67,
  binderTrayMax: 112,
});

// Factory floor layout - isometric grid positions
const createPrinters = (): PrinterUnit[] => [
  // Row 1
  { id: 'X25-01', name: 'X25Pro-01', model: 'X25Pro', status: 'printing', progress: 67, temperature: 185, currentJob: 'EXP-1251-A', position: { x: 200, y: 60 }, telemetry: generateTelemetry(67) },
  { id: 'X25-02', name: 'X25Pro-02', model: 'X25Pro', status: 'printing', progress: 34, temperature: 192, currentJob: 'EXP-1251-B', position: { x: 350, y: 60 }, telemetry: generateTelemetry(34) },
  { id: 'X25-03', name: 'X25Pro-03', model: 'X25Pro', status: 'idle', temperature: 24, position: { x: 500, y: 60 }, telemetry: generateIdleTelemetry() },
  { id: 'X25-04', name: 'X25Pro-04', model: 'X25Pro', status: 'sintering', progress: 89, temperature: 1350, currentJob: 'EXP-1248-C', position: { x: 650, y: 60 }, telemetry: generateTelemetry(89) },
  // Row 2
  { id: 'X25-05', name: 'X25Pro-05', model: 'X25Pro', status: 'printing', progress: 12, temperature: 178, currentJob: 'EXP-1252-A', position: { x: 200, y: 200 }, telemetry: generateTelemetry(12) },
  { id: 'X25-06', name: 'X25Pro-06', model: 'X25Pro', status: 'maintenance', temperature: 22, position: { x: 350, y: 200 }, telemetry: generateMaintenanceTelemetry() },
  { id: 'X25-07', name: 'X25Pro-07', model: 'X25Pro', status: 'printing', progress: 91, temperature: 188, currentJob: 'EXP-1250-D', position: { x: 500, y: 200 }, telemetry: generateTelemetry(91) },
  { id: 'X25-08', name: 'X25Pro-08', model: 'X25Pro', status: 'idle', temperature: 25, position: { x: 650, y: 200 }, telemetry: generateIdleTelemetry() },
  // Row 3
  { id: 'S12-01', name: 'Shop-01', model: 'Shop', status: 'printing', progress: 45, temperature: 165, currentJob: 'EXP-1253-A', position: { x: 200, y: 340 }, telemetry: generateTelemetry(45) },
  { id: 'S12-02', name: 'Shop-02', model: 'Shop', status: 'error', temperature: 45, currentJob: 'EXP-1254-A (FAILED)', position: { x: 350, y: 340 }, telemetry: generateErrorTelemetry() },
  { id: 'S12-03', name: 'Shop-03', model: 'Shop', status: 'idle', temperature: 23, position: { x: 500, y: 340 }, telemetry: generateIdleTelemetry() },
  { id: 'P50-01', name: 'P50-01', model: 'P50', status: 'sintering', progress: 56, temperature: 1280, currentJob: 'EXP-1249-B', position: { x: 650, y: 340 }, telemetry: generateTelemetry(56) },
  // Sinter furnaces
  { id: 'SF-01', name: 'Sinter-01', model: 'Furnace', status: 'sintering', progress: 78, temperature: 1420, currentJob: 'BATCH-47', position: { x: 850, y: 130 }, telemetry: generateTelemetry(78) },
];

const createRobots = (): RobotArm[] => [
  { id: 'R1', name: 'Handler-1', status: 'active', position: { x: 120, y: 180 }, targetPrinter: 'X25-05' },
  { id: 'R2', name: 'Handler-2', status: 'idle', position: { x: 780, y: 180 } },
];

const getStatusColor = (status: PrinterUnit['status']) => {
  switch (status) {
    case 'printing': return { bg: 'bg-blue-500', border: 'border-blue-400', glow: 'shadow-blue-500/50', text: 'text-blue-400' };
    case 'sintering': return { bg: 'bg-orange-500', border: 'border-orange-400', glow: 'shadow-orange-500/50', text: 'text-orange-400' };
    case 'idle': return { bg: 'bg-gray-600', border: 'border-gray-500', glow: '', text: 'text-gray-400' };
    case 'maintenance': return { bg: 'bg-yellow-500', border: 'border-yellow-400', glow: 'shadow-yellow-500/30', text: 'text-yellow-400' };
    case 'error': return { bg: 'bg-red-500', border: 'border-red-400', glow: 'shadow-red-500/50', text: 'text-red-400' };
    default: return { bg: 'bg-gray-600', border: 'border-gray-500', glow: '', text: 'text-gray-400' };
  }
};

export function FactoryFloorCanvas({ onPrinterSelect }: FactoryFloorCanvasProps) {
  const [printers, setPrinters] = useState<PrinterUnit[]>(createPrinters());
  const [robots] = useState<RobotArm[]>(createRobots());
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const [telemetryPrinter, setTelemetryPrinter] = useState<PrinterUnit | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPos = React.useRef({ x: 0, y: 0 });

  // Panel state
  const [activePanel, setActivePanel] = useState<PanelType>('none');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Supply Order Form state
  const [showSupplyOrderForm, setShowSupplyOrderForm] = useState(false);
  const [selectedMaterialForOrder, setSelectedMaterialForOrder] = useState<Material | undefined>(undefined);

  // Cost calculator state
  const [calcParams, setCalcParams] = useState({
    material: materials[0],
    volumeCm3: 10,
    quantity: 5,
    complexity: 'medium' as 'low' | 'medium' | 'high',
  });

  const categories = ['all', ...Array.from(new Set(materials.map(m => m.category)))];

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.composition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const calculateCost = () => {
    const { material, volumeCm3, quantity, complexity } = calcParams;
    const complexityMultipliers = { low: 1, medium: 1.3, high: 1.8 };
    const multiplier = complexityMultipliers[complexity];
    const weightKg = (volumeCm3 * material.properties.density * quantity) / 1000;

    const materialCost = weightKg * material.costPerKg;
    const energyCost = quantity * volumeCm3 * 0.15 * multiplier;
    const laborCost = quantity * 12 * multiplier;
    const machineCost = quantity * volumeCm3 * 0.45 * multiplier;

    return {
      materialCost: Math.round(materialCost * 100) / 100,
      energyCost: Math.round(energyCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      machineCost: Math.round(machineCost * 100) / 100,
      total: Math.round((materialCost + energyCost + laborCost + machineCost) * 100) / 100,
    };
  };

  const cost = calculateCost();

  // Simulate progress updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPrinters(prev => prev.map(p => {
        if ((p.status === 'printing' || p.status === 'sintering') && p.progress !== undefined) {
          const newProgress = Math.min(100, p.progress + Math.random() * 2);
          return {
            ...p,
            progress: newProgress,
            status: newProgress >= 100 ? 'idle' : p.status,
            temperature: p.status === 'sintering'
              ? p.temperature! + (Math.random() - 0.5) * 10
              : p.temperature! + (Math.random() - 0.5) * 2,
          };
        }
        return p;
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handlePrinterClick = (printer: PrinterUnit) => {
    setSelectedPrinter(printer.id);
    setTelemetryPrinter(printer);
    onPrinterSelect?.(printer);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('factory-bg')) {
      setSelectedPrinter(null);
      onPrinterSelect?.(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow panning with middle-click, Alt+left-click, or left-click on canvas background
    const target = e.target as HTMLElement;
    const isCanvasBackground = target.classList.contains('factory-bg') ||
                               target.closest('.factory-bg') === e.currentTarget;

    if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && isCanvasBackground)) {
      setIsPanning(true);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  // Stats calculations
  const activePrinters = printers.filter(p => p.status === 'printing' || p.status === 'sintering').length;
  const idlePrinters = printers.filter(p => p.status === 'idle').length;
  const errorPrinters = printers.filter(p => p.status === 'error' || p.status === 'maintenance').length;

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Toolbar */}
      <div className="h-12 border-b border-[#2a2a2a] flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-gray-400">Factory Floor • Live View</span>
          </div>
          <div className="w-px h-6 bg-[#2a2a2a]" />
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-blue-400">{activePrinters} Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-gray-400">{idlePrinters} Idle</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-400">{errorPrinters} Issues</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tools Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activePanel !== 'none'
                  ? 'bg-purple-500 text-white'
                  : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Tools
              <ChevronDown className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50 overflow-hidden min-w-[180px]"
                >
                  <button
                    onClick={() => { setActivePanel('materials'); setShowDropdown(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                      activePanel === 'materials' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-300 hover:bg-[#2a2a2a]'
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    Materials Database
                    <span className="ml-auto text-xs text-gray-500">{materials.length}</span>
                  </button>
                  <button
                    onClick={() => { setActivePanel('calculator'); setShowDropdown(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                      activePanel === 'calculator' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-300 hover:bg-[#2a2a2a]'
                    }`}
                  >
                    <Calculator className="w-4 h-4" />
                    Cost Calculator
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-6 bg-[#2a2a2a]" />
          <button
            onClick={() => setPrinters(createPrinters())}
            className="p-2 rounded bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-[#2a2a2a]" />
          <button
            onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            className="p-2 rounded bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            className="p-2 rounded bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-[#2a2a2a]" />
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-2 rounded bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button className="p-2 rounded bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors">
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Factory Canvas */}
      <div
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing factory-bg"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          background: `
            linear-gradient(rgba(20, 30, 20, 0.9), rgba(10, 15, 10, 0.95)),
            radial-gradient(circle at 1px 1px, #1a3a1a 1px, transparent 0)
          `,
          backgroundSize: `100% 100%, ${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `0 0, ${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Isometric grid overlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(30deg, #1a4a1a 1px, transparent 1px),
              linear-gradient(-30deg, #1a4a1a 1px, transparent 1px)
            `,
            backgroundSize: `${60 * zoom}px ${34 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Floor sections / zones */}
          <div className="absolute left-[150px] top-[30px] w-[560px] h-[440px] border border-green-900/30 rounded-lg bg-green-950/10" />
          <div className="absolute left-[150px] top-[30px] px-2 py-1 bg-green-900/30 text-green-500 text-[10px] font-mono rounded-br">
            PRINT ZONE A
          </div>

          <div className="absolute left-[800px] top-[70px] w-[150px] h-[200px] border border-orange-900/30 rounded-lg bg-orange-950/10" />
          <div className="absolute left-[800px] top-[70px] px-2 py-1 bg-orange-900/30 text-orange-500 text-[10px] font-mono rounded-br">
            SINTER BAY
          </div>

          {/* Robot Arms */}
          {robots.map(robot => (
            <motion.div
              key={robot.id}
              className="absolute"
              style={{ left: robot.position.x, top: robot.position.y }}
              animate={robot.status === 'active' ? { rotate: [0, 15, -15, 0] } : {}}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="relative">
                {/* Robot base */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-600 flex items-center justify-center shadow-lg">
                  <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-500" />
                </div>
                {/* Robot arm */}
                <div
                  className={`absolute top-1/2 left-1/2 w-16 h-2 rounded-full origin-left ${
                    robot.status === 'active' ? 'bg-orange-500' : 'bg-gray-600'
                  }`}
                  style={{ transform: 'translateY(-50%)' }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-700 border border-gray-500" />
                </div>
                {/* Status indicator */}
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                  robot.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                }`} />
              </div>
              <div className="text-[9px] text-gray-500 text-center mt-1 font-mono">{robot.name}</div>
            </motion.div>
          ))}

          {/* Printer Units */}
          {printers.map(printer => {
            const colors = getStatusColor(printer.status);
            const isSelected = selectedPrinter === printer.id;
            const isFurnace = printer.model === 'Furnace';

            return (
              <motion.div
                key={printer.id}
                className={`absolute cursor-pointer transition-all duration-200 ${isSelected ? 'z-20' : 'z-10'}`}
                style={{ left: printer.position.x, top: printer.position.y }}
                onClick={(e) => { e.stopPropagation(); handlePrinterClick(printer); }}
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {/* Machine body */}
                <div
                  className={`relative ${isFurnace ? 'w-[100px] h-[120px]' : 'w-[90px] h-[100px]'} rounded-lg border-2 transition-all ${
                    isSelected ? `${colors.border} shadow-lg ${colors.glow}` : 'border-[#2a2a2a]'
                  }`}
                  style={{
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                  }}
                >
                  {/* Status glow effect */}
                  {(printer.status === 'printing' || printer.status === 'sintering') && (
                    <div className={`absolute inset-0 rounded-lg ${colors.bg} opacity-10 animate-pulse`} />
                  )}

                  {/* Machine top / viewport */}
                  <div className="absolute top-2 left-2 right-2 h-12 rounded bg-black/60 border border-[#2a2a2a] overflow-hidden">
                    {printer.status === 'printing' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          className="w-1 h-8 bg-blue-400"
                          animate={{ x: [-15, 15, -15] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                    )}
                    {printer.status === 'sintering' && (
                      <div className="absolute inset-0 bg-gradient-to-t from-orange-600/50 to-transparent animate-pulse" />
                    )}
                    {printer.status === 'error' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                      </div>
                    )}
                    {printer.status === 'maintenance' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-yellow-500" />
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  {printer.progress !== undefined && (
                    <div className="absolute bottom-8 left-2 right-2 h-1.5 bg-black/60 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${colors.bg}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${printer.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Temperature display */}
                  {printer.temperature && (
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px]">
                      <div className="flex items-center gap-1">
                        <Thermometer className={`w-3 h-3 ${colors.text}`} />
                        <span className={colors.text}>{Math.round(printer.temperature)}°</span>
                      </div>
                      {printer.progress !== undefined && (
                        <span className="text-gray-500">{Math.round(printer.progress)}%</span>
                      )}
                    </div>
                  )}

                  {/* Status LED */}
                  <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${colors.bg} ${
                    printer.status === 'printing' || printer.status === 'sintering' ? 'animate-pulse' : ''
                  }`} />
                </div>

                {/* Label */}
                <div className="mt-1 text-center">
                  <div className="text-[10px] font-mono text-white">{printer.id}</div>
                  <div className={`text-[8px] font-mono uppercase ${colors.text}`}>{printer.status}</div>
                </div>
              </motion.div>
            );
          })}

          {/* Conveyor belts (decorative) */}
          <div className="absolute left-[100px] top-[160px] w-[50px] h-[220px] border-l-2 border-dashed border-gray-700 opacity-50" />
          <div className="absolute left-[750px] top-[90px] w-[50px] h-[160px] border-r-2 border-dashed border-gray-700 opacity-50" />
        </div>

        {/* Stats overlay - top right */}
        <div className="absolute top-4 right-4 bg-black/80 border border-[#2a2a2a] rounded-lg p-4 backdrop-blur-sm">
          <div className="text-xs text-gray-500 uppercase mb-3">Fleet Status</div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <span className="text-2xl font-bold text-green-400">{activePrinters}</span>
              </div>
              <div>
                <div className="text-white font-semibold">{activePrinters}</div>
                <div className="text-[10px] text-gray-500">Active Jobs</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-400">{printers.length}</span>
              </div>
              <div>
                <div className="text-white font-semibold">{printers.length}</div>
                <div className="text-[10px] text-gray-500">Total Units</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Layers className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-white font-semibold">26</div>
                <div className="text-[10px] text-gray-500">Materials</div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend - bottom right */}
        <div className="absolute bottom-4 right-4 bg-black/80 border border-[#2a2a2a] rounded-lg p-3 backdrop-blur-sm">
          <div className="text-[10px] text-gray-500 uppercase mb-2">Status Legend</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-400">Printing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-gray-400">Sintering</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-gray-400">Idle</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-gray-400">Maintenance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-400">Error</span>
            </div>
          </div>
        </div>

        {/* Materials Database Panel */}
        <AnimatePresence>
          {activePanel === 'materials' && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 h-full w-[400px] bg-[#0f0f0f] border-l border-[#2a2a2a] flex flex-col overflow-hidden"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-400" />
                  <span className="font-semibold text-white">Materials Database</span>
                  <span className="text-xs text-gray-500">({materials.length})</span>
                </div>
                <button
                  onClick={() => setActivePanel('none')}
                  className="p-1 hover:bg-[#2a2a2a] rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Search & Filter */}
              <div className="p-3 border-b border-[#2a2a2a] space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search materials..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
                {/* Supply Order Button */}
                <button
                  onClick={() => {
                    setSelectedMaterialForOrder(undefined);
                    setShowSupplyOrderForm(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Order Supplies
                </button>
              </div>

              {/* Materials List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredMaterials.map(material => (
                  <div
                    key={material.id}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 hover:border-purple-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-white text-sm">{material.name}</div>
                        <div className="text-xs text-gray-500">{material.composition}</div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 rounded">
                        {material.category}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <div className="text-gray-500">Stock</div>
                        <div className="text-white font-medium">{material.stockKg} kg</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Cost</div>
                        <div className="text-green-400 font-medium">${material.costPerKg}/kg</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Density</div>
                        <div className="text-white font-medium">{material.properties.density} g/cm³</div>
                      </div>
                    </div>
                    {/* Quick Order Button */}
                    <button
                      onClick={() => {
                        setSelectedMaterialForOrder(material);
                        setShowSupplyOrderForm(true);
                      }}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded text-[10px] font-medium transition-colors"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      Quick Order
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cost Calculator Panel */}
        <AnimatePresence>
          {activePanel === 'calculator' && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 h-full w-[400px] bg-[#0f0f0f] border-l border-[#2a2a2a] flex flex-col overflow-hidden"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-green-400" />
                  <span className="font-semibold text-white">Cost Calculator</span>
                </div>
                <button
                  onClick={() => setActivePanel('none')}
                  className="p-1 hover:bg-[#2a2a2a] rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Calculator Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Job Parameters */}
                <div>
                  <h4 className="text-white font-semibold flex items-center gap-2 mb-3">
                    <Cpu className="w-4 h-4 text-blue-400" />
                    Job Parameters
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Material</label>
                      <select
                        value={calcParams.material.id}
                        onChange={(e) => setCalcParams({
                          ...calcParams,
                          material: materials.find(m => m.id === e.target.value)!,
                        })}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                      >
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} (${m.costPerKg}/kg)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Part Volume (cm³)</label>
                      <input
                        type="number"
                        value={calcParams.volumeCm3}
                        onChange={(e) => setCalcParams({ ...calcParams, volumeCm3: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Quantity</label>
                      <input
                        type="number"
                        value={calcParams.quantity}
                        onChange={(e) => setCalcParams({ ...calcParams, quantity: parseInt(e.target.value) || 1 })}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Complexity</label>
                      <div className="flex gap-2">
                        {(['low', 'medium', 'high'] as const).map(level => (
                          <button
                            key={level}
                            onClick={() => setCalcParams({ ...calcParams, complexity: level })}
                            className={`flex-1 py-2 rounded text-xs font-medium capitalize transition-colors ${
                              calcParams.complexity === level
                                ? 'bg-green-500 text-white'
                                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                  <h4 className="text-white font-semibold flex items-center gap-2 mb-4">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    Cost Estimate
                  </h4>

                  <div className="space-y-3">
                    {[
                      { label: 'Material Cost', value: cost.materialCost, icon: Package },
                      { label: 'Energy Cost', value: cost.energyCost, icon: Zap },
                      { label: 'Labor Cost', value: cost.laborCost, icon: Activity },
                      { label: 'Machine Time', value: cost.machineCost, icon: Printer },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </div>
                        <div className="text-white">${item.value.toFixed(2)}</div>
                      </div>
                    ))}

                    <div className="border-t border-[#2a2a2a] pt-3 mt-3">
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-white">Total</div>
                        <div className="text-2xl font-bold text-green-400">${cost.total.toFixed(2)}</div>
                      </div>
                      <div className="text-xs text-gray-500 text-right mt-1">
                        ${(cost.total / calcParams.quantity).toFixed(2)} per unit
                      </div>
                    </div>
                  </div>
                </div>

                {/* Optimization Tip */}
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-400 text-sm mb-1">
                    <TrendingUp className="w-4 h-4" />
                    Cost Optimization
                  </div>
                  <p className="text-xs text-gray-400">
                    Batch size of 20+ units reduces per-unit cost by ~15%. Consider nesting multiple parts in a single print job.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Telemetry Popup Panel - Slides in from right */}
        <AnimatePresence>
          {telemetryPrinter && telemetryPrinter.telemetry && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 h-full w-[380px] bg-[#0a0a0a] border-l border-[#2a2a2a] flex flex-col overflow-hidden z-50"
            >
              {/* Panel Header - matches factory floor style */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    telemetryPrinter.status === 'printing' ? 'bg-blue-500 animate-pulse' :
                    telemetryPrinter.status === 'sintering' ? 'bg-orange-500 animate-pulse' :
                    telemetryPrinter.status === 'idle' ? 'bg-gray-500' :
                    telemetryPrinter.status === 'error' ? 'bg-red-500' :
                    'bg-yellow-500'
                  }`} />
                  <div>
                    <div className="text-[11px] font-mono text-white">{telemetryPrinter.id}</div>
                    <div className={`text-[9px] font-mono uppercase ${
                      telemetryPrinter.status === 'printing' ? 'text-blue-400' :
                      telemetryPrinter.status === 'sintering' ? 'text-orange-400' :
                      telemetryPrinter.status === 'idle' ? 'text-gray-400' :
                      telemetryPrinter.status === 'error' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>{telemetryPrinter.status}</div>
                  </div>
                </div>
                <button
                  onClick={() => setTelemetryPrinter(null)}
                  className="p-1.5 hover:bg-[#2a2a2a] rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Machine Info Bar */}
              <div className="px-4 py-2 bg-[#111] border-b border-[#2a2a2a] flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-500">{telemetryPrinter.model}</span>
                {telemetryPrinter.currentJob && (
                  <span className="text-[10px] font-mono text-gray-400">{telemetryPrinter.currentJob}</span>
                )}
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Status Banner for non-printing machines */}
                {(telemetryPrinter.status === 'idle' || telemetryPrinter.status === 'maintenance' || telemetryPrinter.status === 'error') && (
                  <div className={`rounded-lg p-3 ${
                    telemetryPrinter.status === 'idle' ? 'bg-gray-500/10 border border-gray-500/30' :
                    telemetryPrinter.status === 'maintenance' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                    'bg-red-500/10 border border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        telemetryPrinter.status === 'idle' ? 'bg-gray-500/20' :
                        telemetryPrinter.status === 'maintenance' ? 'bg-yellow-500/20' :
                        'bg-red-500/20'
                      }`}>
                        {telemetryPrinter.status === 'idle' && <Clock className="w-5 h-5 text-gray-400" />}
                        {telemetryPrinter.status === 'maintenance' && <Settings2 className="w-5 h-5 text-yellow-400" />}
                        {telemetryPrinter.status === 'error' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                      </div>
                      <div>
                        <div className={`text-sm font-mono font-bold uppercase ${
                          telemetryPrinter.status === 'idle' ? 'text-gray-400' :
                          telemetryPrinter.status === 'maintenance' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {telemetryPrinter.status === 'idle' && 'MACHINE IDLE'}
                          {telemetryPrinter.status === 'maintenance' && 'MAINTENANCE MODE'}
                          {telemetryPrinter.status === 'error' && 'ERROR - JOB FAILED'}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500">
                          {telemetryPrinter.status === 'idle' && 'Ready for new job'}
                          {telemetryPrinter.status === 'maintenance' && 'Consumables replacement required'}
                          {telemetryPrinter.status === 'error' && 'Job stopped at layer 153/664'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Job Progress - Only show for active jobs */}
                {(telemetryPrinter.status === 'printing' || telemetryPrinter.status === 'sintering') && (
                  <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3">
                    <div className="text-[9px] font-mono text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                      <Gauge className="w-3 h-3" />
                      JOB PROGRESS
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="#1a1a1a" strokeWidth="8" />
                          <circle
                            cx="40" cy="40" r="34" fill="none"
                            stroke={telemetryPrinter.status === 'sintering' ? '#f97316' : '#3b82f6'}
                            strokeWidth="8" strokeLinecap="round"
                            strokeDasharray={`${(telemetryPrinter.telemetry.jobProgress / 100) * 214} 214`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-mono font-bold text-white">
                            {Math.round(telemetryPrinter.telemetry.jobProgress)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <div className="text-[8px] font-mono text-gray-500 uppercase">Elapsed</div>
                          <div className="text-sm font-mono text-white">{telemetryPrinter.telemetry.jobElapsedTime}</div>
                        </div>
                        <div>
                          <div className="text-[8px] font-mono text-gray-500 uppercase">Remaining</div>
                          <div className="text-sm font-mono text-green-400">{telemetryPrinter.telemetry.timeRemaining}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error job info */}
                {telemetryPrinter.status === 'error' && (
                  <div className="bg-[#111] border border-red-500/30 rounded-lg p-3">
                    <div className="text-[9px] font-mono text-red-400 uppercase mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" />
                      FAILED JOB
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="#1a1a1a" strokeWidth="8" />
                          <circle
                            cx="40" cy="40" r="34" fill="none"
                            stroke="#ef4444"
                            strokeWidth="8" strokeLinecap="round"
                            strokeDasharray={`${(telemetryPrinter.telemetry.jobProgress / 100) * 214} 214`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-lg font-mono font-bold text-red-400">
                            {Math.round(telemetryPrinter.telemetry.jobProgress)}%
                          </span>
                          <span className="text-[8px] font-mono text-red-500">STOPPED</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <div className="text-[8px] font-mono text-gray-500 uppercase">Elapsed</div>
                          <div className="text-sm font-mono text-white">{telemetryPrinter.telemetry.jobElapsedTime}</div>
                        </div>
                        <div>
                          <div className="text-[8px] font-mono text-gray-500 uppercase">Status</div>
                          <div className="text-sm font-mono text-red-400">ERROR</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Layers Printed - Show for active/error jobs */}
                {(telemetryPrinter.status === 'printing' || telemetryPrinter.status === 'sintering' || telemetryPrinter.status === 'error') && telemetryPrinter.telemetry.totalLayers > 0 && (
                  <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3">
                    <div className="text-[9px] font-mono text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                      <Layers className="w-3 h-3" />
                      LAYERS PRINTED
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-xl font-mono font-bold text-white">{telemetryPrinter.telemetry.layersPrinted}</span>
                      <span className="text-[10px] font-mono text-gray-500">of {telemetryPrinter.telemetry.totalLayers}</span>
                    </div>
                    <div className="h-1.5 bg-black/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          telemetryPrinter.status === 'error' ? 'bg-red-500' :
                          telemetryPrinter.status === 'sintering' ? 'bg-orange-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${(telemetryPrinter.telemetry.layersPrinted / telemetryPrinter.telemetry.totalLayers) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Print Resolution & Temperature Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3">
                    <div className="text-[9px] font-mono text-gray-500 uppercase mb-1 flex items-center gap-1">
                      <Settings2 className="w-3 h-3" />
                      RESOLUTION
                    </div>
                    <div className="text-lg font-mono font-bold text-white">{telemetryPrinter.telemetry.printResolution}</div>
                  </div>
                  {telemetryPrinter.temperature !== undefined && (
                    <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3">
                      <div className="text-[9px] font-mono text-gray-500 uppercase mb-1 flex items-center gap-1">
                        <Thermometer className="w-3 h-3" />
                        TEMP
                      </div>
                      <div className={`text-lg font-mono font-bold ${
                        telemetryPrinter.status === 'sintering' ? 'text-orange-400' :
                        telemetryPrinter.status === 'error' ? 'text-red-400' :
                        'text-white'
                      }`}>
                        {Math.round(telemetryPrinter.temperature)}°C
                      </div>
                    </div>
                  )}
                </div>

                {/* Binder Limit Chart */}
                <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3">
                  <div className="text-[9px] font-mono text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                    <Activity className="w-3 h-3" />
                    BINDER LIMIT
                  </div>
                  <div className="flex items-end justify-between gap-1 h-12">
                    {telemetryPrinter.telemetry.binderLimit.map((value, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-cyan-500 rounded-t"
                          style={{ height: `${value * 160}px` }}
                        />
                        <span className="text-[7px] font-mono text-gray-600 mt-0.5">{value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Consumables Section */}
                <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3">
                  <div className="text-[9px] font-mono text-gray-500 uppercase mb-3 flex items-center gap-1.5">
                    <Droplets className="w-3 h-3" />
                    CONSUMABLES
                  </div>
                  <div className="space-y-2.5">
                    {/* Wiper Count */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-gray-400">Wiper Count</span>
                        <span className="text-[10px] font-mono text-white">
                          {telemetryPrinter.telemetry.wiperCount}/{telemetryPrinter.telemetry.wiperMax}
                        </span>
                      </div>
                      <div className="h-1.5 bg-black/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (telemetryPrinter.telemetry.wiperCount / telemetryPrinter.telemetry.wiperMax) > 0.8
                              ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${(telemetryPrinter.telemetry.wiperCount / telemetryPrinter.telemetry.wiperMax) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Printhead Life */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-gray-400">Printhead Life</span>
                        <span className="text-[10px] font-mono text-white">
                          {(telemetryPrinter.telemetry.printheadLife / 1000).toFixed(1)}k/{telemetryPrinter.telemetry.printheadMax / 1000}k
                        </span>
                      </div>
                      <div className="h-1.5 bg-black/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (telemetryPrinter.telemetry.printheadLife / telemetryPrinter.telemetry.printheadMax) > 0.8
                              ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${(telemetryPrinter.telemetry.printheadLife / telemetryPrinter.telemetry.printheadMax) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Printed Layers */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-gray-400">Printed Layers</span>
                        <span className="text-[10px] font-mono text-white">
                          {telemetryPrinter.telemetry.printedLayers}
                        </span>
                      </div>
                      <div className="h-1.5 bg-black/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-500"
                          style={{ width: `${(telemetryPrinter.telemetry.printedLayers / telemetryPrinter.telemetry.totalLayers) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Binder Tray Vapor Sponge */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-gray-400">Binder Tray Sponge</span>
                        <span className="text-[10px] font-mono text-white">
                          {telemetryPrinter.telemetry.binderTrayVaporSponge}/{telemetryPrinter.telemetry.binderTrayMax}
                        </span>
                      </div>
                      <div className="h-1.5 bg-black/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (telemetryPrinter.telemetry.binderTrayVaporSponge / telemetryPrinter.telemetry.binderTrayMax) > 0.8
                              ? 'bg-red-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${(telemetryPrinter.telemetry.binderTrayVaporSponge / telemetryPrinter.telemetry.binderTrayMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel Footer */}
              <div className="px-4 py-2 border-t border-[#2a2a2a] bg-[#0a0a0a]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-gray-500">LIVE DATA</span>
                  </div>
                  <span className="text-[9px] font-mono text-gray-600">Updated every 1s</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Supply Order Form Modal */}
      <SupplyOrderForm
        isOpen={showSupplyOrderForm}
        onClose={() => setShowSupplyOrderForm(false)}
        materials={materials}
        initialMaterial={selectedMaterialForOrder}
      />
    </div>
  );
}
