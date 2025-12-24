import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  Database,
  Calculator,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Thermometer,
  Box,
  Search,
  TrendingUp,
  DollarSign,
  Package,
  Cpu,
  Factory,
  Zap,
} from 'lucide-react';

// Types
interface Printer {
  id: string;
  name: string;
  model: string;
  status: 'online' | 'printing' | 'maintenance' | 'offline';
  currentJob?: string;
  progress?: number;
  temperature?: number;
  uptimeHours: number;
  totalPrints: number;
}

interface Material {
  id: string;
  name: string;
  composition: string;
  category: string;
  stockKg: number;
  costPerKg: number;
  applications: string[];
  properties: {
    density: number;
    meltingPoint: number;
    hardness?: number;
  };
}

interface CostEstimate {
  materialCost: number;
  energyCost: number;
  laborCost: number;
  machineCost: number;
  total: number;
}

// Mock data for printers
const mockPrinters: Printer[] = [
  { id: 'p1', name: 'X25Pro-01', model: 'X25Pro', status: 'printing', currentJob: 'Fe-Co Sample Batch A', progress: 67, temperature: 185, uptimeHours: 4521, totalPrints: 892 },
  { id: 'p2', name: 'X25Pro-02', model: 'X25Pro', status: 'online', uptimeHours: 3892, totalPrints: 756 },
  { id: 'p3', name: 'X25Pro-03', model: 'X25Pro', status: 'printing', currentJob: 'MnBi Magnet Array', progress: 23, temperature: 192, uptimeHours: 5102, totalPrints: 1023 },
  { id: 'p4', name: 'P50-01', model: 'P50', status: 'online', uptimeHours: 2341, totalPrints: 445 },
  { id: 'p5', name: 'P50-02', model: 'P50', status: 'maintenance', uptimeHours: 6721, totalPrints: 1342 },
  { id: 'p6', name: 'P50-03', model: 'P50', status: 'printing', currentJob: 'AlSi10Mg Test Coupons', progress: 89, temperature: 178, uptimeHours: 4102, totalPrints: 867 },
  { id: 'p7', name: 'S-Max-01', model: 'S-Max', status: 'online', uptimeHours: 1892, totalPrints: 234 },
  { id: 'p8', name: 'S-Max-02', model: 'S-Max', status: 'offline', uptimeHours: 7234, totalPrints: 1567 },
  { id: 'p9', name: 'X160Pro-01', model: 'X160Pro', status: 'printing', currentJob: 'NASICON Electrolyte Grid', progress: 45, temperature: 195, uptimeHours: 3456, totalPrints: 678 },
  { id: 'p10', name: 'X160Pro-02', model: 'X160Pro', status: 'online', uptimeHours: 2987, totalPrints: 543 },
  { id: 'p11', name: 'Shop-01', model: 'Shop System', status: 'printing', currentJob: 'Steel Alloy Samples', progress: 56, temperature: 182, uptimeHours: 5678, totalPrints: 1123 },
  { id: 'p12', name: 'Shop-02', model: 'Shop System', status: 'online', uptimeHours: 4321, totalPrints: 876 },
  { id: 'p13', name: 'Studio-01', model: 'Studio System 2', status: 'online', uptimeHours: 1234, totalPrints: 321 },
];

// Mock data for materials
const mockMaterials: Material[] = [
  { id: 'm1', name: '17-4PH Stainless Steel', composition: 'Fe-Cr-Ni-Cu', category: 'Steel', stockKg: 245, costPerKg: 85, applications: ['Aerospace', 'Medical'], properties: { density: 7.78, meltingPoint: 1404, hardness: 36 } },
  { id: 'm2', name: '316L Stainless Steel', composition: 'Fe-Cr-Ni-Mo', category: 'Steel', stockKg: 312, costPerKg: 72, applications: ['Medical', 'Marine'], properties: { density: 7.99, meltingPoint: 1375, hardness: 25 } },
  { id: 'm3', name: 'H13 Tool Steel', composition: 'Fe-Cr-Mo-V', category: 'Steel', stockKg: 156, costPerKg: 95, applications: ['Tooling', 'Dies'], properties: { density: 7.80, meltingPoint: 1427, hardness: 52 } },
  { id: 'm4', name: 'Inconel 625', composition: 'Ni-Cr-Mo-Nb', category: 'Superalloy', stockKg: 89, costPerKg: 320, applications: ['Aerospace', 'Energy'], properties: { density: 8.44, meltingPoint: 1350 } },
  { id: 'm5', name: 'Ti-6Al-4V', composition: 'Ti-Al-V', category: 'Titanium', stockKg: 67, costPerKg: 450, applications: ['Aerospace', 'Medical'], properties: { density: 4.43, meltingPoint: 1660, hardness: 36 } },
  { id: 'm6', name: 'AlSi10Mg', composition: 'Al-Si-Mg', category: 'Aluminum', stockKg: 423, costPerKg: 55, applications: ['Automotive', 'Consumer'], properties: { density: 2.67, meltingPoint: 570 } },
  { id: 'm7', name: 'Copper', composition: 'Cu', category: 'Copper', stockKg: 198, costPerKg: 125, applications: ['Electrical', 'Thermal'], properties: { density: 8.96, meltingPoint: 1085 } },
  { id: 'm8', name: 'MnBi', composition: 'Mn-Bi', category: 'Magnetic', stockKg: 34, costPerKg: 890, applications: ['Magnets', 'Motors'], properties: { density: 8.88, meltingPoint: 446 } },
  { id: 'm9', name: 'Fe-Co Alloy', composition: 'Fe-Co', category: 'Magnetic', stockKg: 56, costPerKg: 780, applications: ['Magnets', 'Electronics'], properties: { density: 8.12, meltingPoint: 1480 } },
  { id: 'm10', name: 'FeNi (L10)', composition: 'Fe-Ni', category: 'Magnetic', stockKg: 23, costPerKg: 950, applications: ['Rare-earth-free magnets'], properties: { density: 8.25, meltingPoint: 1455 } },
  { id: 'm11', name: 'Bronze 90/10', composition: 'Cu-Sn', category: 'Bronze', stockKg: 145, costPerKg: 95, applications: ['Bearings', 'Marine'], properties: { density: 8.78, meltingPoint: 1000 } },
  { id: 'm12', name: 'Tungsten Carbide', composition: 'WC-Co', category: 'Carbide', stockKg: 28, costPerKg: 520, applications: ['Cutting tools', 'Wear parts'], properties: { density: 15.63, meltingPoint: 2870, hardness: 91 } },
  { id: 'm13', name: 'Silicon Carbide', composition: 'SiC', category: 'Ceramic', stockKg: 67, costPerKg: 380, applications: ['Abrasives', 'Electronics'], properties: { density: 3.21, meltingPoint: 2730, hardness: 93 } },
  { id: 'm14', name: 'Zirconia', composition: 'ZrO2', category: 'Ceramic', stockKg: 45, costPerKg: 290, applications: ['Dental', 'Cutting tools'], properties: { density: 5.68, meltingPoint: 2715, hardness: 83 } },
  { id: 'm15', name: 'Alumina', composition: 'Al2O3', category: 'Ceramic', stockKg: 78, costPerKg: 180, applications: ['Electronics', 'Abrasives'], properties: { density: 3.95, meltingPoint: 2072, hardness: 85 } },
  { id: 'm16', name: 'Hastelloy X', composition: 'Ni-Cr-Fe-Mo', category: 'Superalloy', stockKg: 34, costPerKg: 410, applications: ['Gas turbines', 'Furnaces'], properties: { density: 8.22, meltingPoint: 1355 } },
  { id: 'm17', name: 'Cobalt Chrome', composition: 'Co-Cr-Mo', category: 'Cobalt', stockKg: 56, costPerKg: 340, applications: ['Medical implants', 'Dental'], properties: { density: 8.30, meltingPoint: 1330, hardness: 36 } },
  { id: 'm18', name: 'Maraging Steel', composition: 'Fe-Ni-Co-Mo', category: 'Steel', stockKg: 89, costPerKg: 165, applications: ['Aerospace', 'Tooling'], properties: { density: 8.10, meltingPoint: 1413, hardness: 54 } },
  { id: 'm19', name: 'NASICON', composition: 'Na3Zr2Si2PO12', category: 'Electrolyte', stockKg: 12, costPerKg: 1200, applications: ['Solid-state batteries'], properties: { density: 3.27, meltingPoint: 1200 } },
  { id: 'm20', name: 'Kovar', composition: 'Fe-Ni-Co', category: 'Specialty', stockKg: 67, costPerKg: 210, applications: ['Electronics', 'Seals'], properties: { density: 8.36, meltingPoint: 1450 } },
  { id: 'm21', name: 'Pure Iron', composition: 'Fe', category: 'Iron', stockKg: 234, costPerKg: 45, applications: ['Magnetic cores', 'Research'], properties: { density: 7.87, meltingPoint: 1538 } },
  { id: 'm22', name: 'Pure Nickel', composition: 'Ni', category: 'Nickel', stockKg: 123, costPerKg: 185, applications: ['Electrochemistry', 'Plating'], properties: { density: 8.91, meltingPoint: 1455 } },
  { id: 'm23', name: 'AM Copper', composition: 'Cu (AM Grade)', category: 'Copper', stockKg: 89, costPerKg: 145, applications: ['Heat exchangers', 'Induction'], properties: { density: 8.94, meltingPoint: 1085 } },
  { id: 'm24', name: '4140 Steel', composition: 'Fe-Cr-Mo', category: 'Steel', stockKg: 267, costPerKg: 68, applications: ['Gears', 'Shafts'], properties: { density: 7.85, meltingPoint: 1416, hardness: 28 } },
  { id: 'm25', name: 'M2 Tool Steel', composition: 'Fe-W-Mo-Cr-V', category: 'Steel', stockKg: 78, costPerKg: 135, applications: ['Cutting tools', 'Drills'], properties: { density: 8.16, meltingPoint: 1430, hardness: 64 } },
  { id: 'm26', name: 'Stellite 6', composition: 'Co-Cr-W', category: 'Cobalt', stockKg: 45, costPerKg: 380, applications: ['Wear parts', 'Valves'], properties: { density: 8.44, meltingPoint: 1285, hardness: 40 } },
];

type TabType = 'fleet' | 'materials' | 'calculator';

export function HardwareIntegration() {
  const [activeTab, setActiveTab] = useState<TabType>('fleet');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // Cost calculator state
  const [calcParams, setCalcParams] = useState({
    material: mockMaterials[0],
    volumeCm3: 10,
    quantity: 5,
    complexity: 'medium' as 'low' | 'medium' | 'high',
  });

  const getStatusColor = (status: Printer['status']) => {
    switch (status) {
      case 'online': return 'text-green-400 bg-green-400/10';
      case 'printing': return 'text-blue-400 bg-blue-400/10';
      case 'maintenance': return 'text-yellow-400 bg-yellow-400/10';
      case 'offline': return 'text-red-400 bg-red-400/10';
    }
  };

  const getStatusIcon = (status: Printer['status']) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4" />;
      case 'printing': return <Activity className="w-4 h-4 animate-pulse" />;
      case 'maintenance': return <AlertTriangle className="w-4 h-4" />;
      case 'offline': return <XCircle className="w-4 h-4" />;
    }
  };

  const filteredMaterials = mockMaterials.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.composition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(mockMaterials.map((m) => m.category)))];

  const calculateCost = (): CostEstimate => {
    const { material, volumeCm3, quantity, complexity } = calcParams;
    const complexityMultipliers: Record<'low' | 'medium' | 'high', number> = { low: 1, medium: 1.3, high: 1.8 };
    const complexityMultiplier = complexityMultipliers[complexity];
    const densityGPerCm3 = material.properties.density;
    const weightKg = (volumeCm3 * densityGPerCm3 * quantity) / 1000;

    const materialCost = weightKg * material.costPerKg;
    const energyCost = quantity * volumeCm3 * 0.15 * complexityMultiplier;
    const laborCost = quantity * 12 * complexityMultiplier;
    const machineCost = quantity * volumeCm3 * 0.45 * complexityMultiplier;

    return {
      materialCost: Math.round(materialCost * 100) / 100,
      energyCost: Math.round(energyCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      machineCost: Math.round(machineCost * 100) / 100,
      total: Math.round((materialCost + energyCost + laborCost + machineCost) * 100) / 100,
    };
  };

  const cost = calculateCost();

  const fleetStats = {
    total: mockPrinters.length,
    online: mockPrinters.filter((p) => p.status === 'online').length,
    printing: mockPrinters.filter((p) => p.status === 'printing').length,
    maintenance: mockPrinters.filter((p) => p.status === 'maintenance').length,
    offline: mockPrinters.filter((p) => p.status === 'offline').length,
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-[#2a2a2a] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Factory className="w-6 h-6 text-purple-400" />
            <div>
              <h3 className="text-white font-bold">Hardware Integration</h3>
              <p className="text-gray-400 text-xs">
                Fleet Status • Materials Database • Cost Calculator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              {fleetStats.online + fleetStats.printing} Active
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2a2a2a]">
        {[
          { id: 'fleet' as TabType, label: 'Fleet Status', icon: Printer, count: mockPrinters.length },
          { id: 'materials' as TabType, label: 'Materials DB', icon: Database, count: mockMaterials.length },
          { id: 'calculator' as TabType, label: 'Cost Calculator', icon: Calculator },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white bg-[#1a1a1a] border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count && (
              <span className="px-1.5 py-0.5 text-xs bg-[#2a2a2a] rounded">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* Fleet Status Tab */}
          {activeTab === 'fleet' && (
            <motion.div
              key="fleet"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Fleet Overview */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Online', value: fleetStats.online, color: 'green' },
                  { label: 'Printing', value: fleetStats.printing, color: 'blue' },
                  { label: 'Maintenance', value: fleetStats.maintenance, color: 'yellow' },
                  { label: 'Offline', value: fleetStats.offline, color: 'red' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`bg-${stat.color}-500/10 border border-${stat.color}-500/20 rounded-lg p-4 text-center`}
                  >
                    <div className={`text-2xl font-bold text-${stat.color}-400`}>
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Printer Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
                {mockPrinters.map((printer) => (
                  <div
                    key={printer.id}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-blue-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-white">{printer.name}</div>
                        <div className="text-xs text-gray-500">{printer.model}</div>
                      </div>
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getStatusColor(
                          printer.status
                        )}`}
                      >
                        {getStatusIcon(printer.status)}
                        {printer.status}
                      </div>
                    </div>

                    {printer.status === 'printing' && (
                      <div className="mb-3">
                        <div className="text-xs text-gray-400 mb-1">{printer.currentJob}</div>
                        <div className="w-full bg-[#2a2a2a] rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${printer.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{printer.progress}%</span>
                          {printer.temperature && (
                            <span className="flex items-center gap-1">
                              <Thermometer className="w-3 h-3" />
                              {printer.temperature}°C
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {printer.uptimeHours.toLocaleString()}h
                      </span>
                      <span className="flex items-center gap-1">
                        <Box className="w-3 h-3" />
                        {printer.totalPrints.toLocaleString()} prints
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Materials Database Tab */}
          {activeTab === 'materials' && (
            <motion.div
              key="materials"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Search and Filter */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search materials..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Materials List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[450px] overflow-y-auto">
                {filteredMaterials.map((material) => (
                  <div
                    key={material.id}
                    onClick={() => setSelectedMaterial(material)}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-purple-500/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-white">{material.name}</div>
                        <div className="text-xs text-gray-500">{material.composition}</div>
                      </div>
                      <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded">
                        {material.category}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-gray-500">Stock</div>
                        <div className="text-white">{material.stockKg} kg</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Cost</div>
                        <div className="text-white">${material.costPerKg}/kg</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Density</div>
                        <div className="text-white">{material.properties.density} g/cm³</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Material Detail Modal */}
              <AnimatePresence>
                {selectedMaterial && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedMaterial(null)}
                  >
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.9 }}
                      className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg max-w-lg w-full p-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white">
                            {selectedMaterial.name}
                          </h3>
                          <p className="text-gray-400">{selectedMaterial.composition}</p>
                        </div>
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                          {selectedMaterial.category}
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-[#1a1a1a] rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1">Stock Available</div>
                            <div className="text-lg font-bold text-white">
                              {selectedMaterial.stockKg} kg
                            </div>
                          </div>
                          <div className="bg-[#1a1a1a] rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1">Cost per kg</div>
                            <div className="text-lg font-bold text-green-400">
                              ${selectedMaterial.costPerKg}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-gray-400 mb-2">Properties</div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-[#1a1a1a] rounded p-2 text-center">
                              <div className="text-xs text-gray-500">Density</div>
                              <div className="text-white">
                                {selectedMaterial.properties.density} g/cm³
                              </div>
                            </div>
                            <div className="bg-[#1a1a1a] rounded p-2 text-center">
                              <div className="text-xs text-gray-500">Melting Point</div>
                              <div className="text-white">
                                {selectedMaterial.properties.meltingPoint}°C
                              </div>
                            </div>
                            {selectedMaterial.properties.hardness && (
                              <div className="bg-[#1a1a1a] rounded p-2 text-center">
                                <div className="text-xs text-gray-500">Hardness</div>
                                <div className="text-white">
                                  {selectedMaterial.properties.hardness} HRC
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-gray-400 mb-2">Applications</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedMaterial.applications.map((app) => (
                              <span
                                key={app}
                                className="px-2 py-1 bg-[#1a1a1a] text-gray-300 text-xs rounded"
                              >
                                {app}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedMaterial(null)}
                        className="mt-6 w-full py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded transition-colors"
                      >
                        Close
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Cost Calculator Tab */}
          {activeTab === 'calculator' && (
            <motion.div
              key="calculator"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Input Parameters */}
              <div className="space-y-4">
                <h4 className="text-white font-semibold flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  Job Parameters
                </h4>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Material</label>
                  <select
                    value={calcParams.material.id}
                    onChange={(e) =>
                      setCalcParams({
                        ...calcParams,
                        material: mockMaterials.find((m) => m.id === e.target.value)!,
                      })
                    }
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  >
                    {mockMaterials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (${m.costPerKg}/kg)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Part Volume (cm³)
                  </label>
                  <input
                    type="number"
                    value={calcParams.volumeCm3}
                    onChange={(e) =>
                      setCalcParams({ ...calcParams, volumeCm3: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Quantity</label>
                  <input
                    type="number"
                    value={calcParams.quantity}
                    onChange={(e) =>
                      setCalcParams({ ...calcParams, quantity: parseInt(e.target.value) || 1 })
                    }
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Complexity</label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setCalcParams({ ...calcParams, complexity: level })}
                        className={`flex-1 py-2 rounded capitalize transition-colors ${
                          calcParams.complexity === level
                            ? 'bg-blue-500 text-white'
                            : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
                <h4 className="text-white font-semibold flex items-center gap-2 mb-6">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  Cost Estimate
                </h4>

                <div className="space-y-4">
                  {[
                    { label: 'Material Cost', value: cost.materialCost, icon: Package },
                    { label: 'Energy Cost', value: cost.energyCost, icon: Zap },
                    { label: 'Labor Cost', value: cost.laborCost, icon: Activity },
                    { label: 'Machine Time', value: cost.machineCost, icon: Printer },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-400">
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </div>
                      <div className="text-white">${item.value.toFixed(2)}</div>
                    </div>
                  ))}

                  <div className="border-t border-[#2a2a2a] pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-white">Total</div>
                      <div className="text-2xl font-bold text-green-400">
                        ${cost.total.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 text-right mt-1">
                      ${(cost.total / calcParams.quantity).toFixed(2)} per unit
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-400 text-sm mb-2">
                    <TrendingUp className="w-4 h-4" />
                    Cost Optimization
                  </div>
                  <p className="text-xs text-gray-400">
                    Batch size of 20+ units reduces per-unit cost by ~15%. Consider nesting
                    multiple parts in a single print job.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
