import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, ArrowUpRight, Ruler, Timer, X, Cpu, Layers, Zap, Gauge, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductSpecs {
  volume: string;
  speed: string;
  resolution?: string;
  layerThickness?: string;
  technology?: string;
  materials?: string[];
}

interface Product {
  id: string;
  name: string;
  tagline: string;
  image: string;
  specs: ProductSpecs;
  description: string;
  fullSpecs?: {
    buildVolume: string;
    maxBuildRate: string;
    resolution: string;
    layerThickness: string;
    technology: string;
    materials: string[];
    features: string[];
  };
}

const products: Product[] = [
  {
    id: 'x160',
    name: 'X160Pro™',
    tagline: 'World\'s Largest Binder Jet',
    image: 'https://www.desktopmetal.com/uploads/_image720x720/463071/X160Pro_DarkBG_2022-02-15-135646.jpg',
    specs: {
      volume: '800 x 500 x 400 mm',
      speed: '3,120 cc/hr',
      resolution: '>30 µm voxels',
    },
    description: 'The world\'s largest binder jet 3D printer. Industrial-scale continuous 24/7 production with Triple ACT technology for metals and ceramics.',
    fullSpecs: {
      buildVolume: '800 x 500 x 400 mm (160L)',
      maxBuildRate: '3,120 cc/hr @ 65μm layer',
      resolution: 'Industrial piezoelectric printhead',
      layerThickness: '30–200 μm',
      technology: 'Triple ACT™ Binder Jetting',
      materials: ['Stainless Steels (17-4PH, 316L)', 'Tool Steels', 'Nickel Alloys', 'Titanium', 'Silicon Carbide (SiC)', 'Boron Carbide'],
      features: ['World\'s largest binder jet build volume', 'Triple Advanced Compaction Technology', 'Continuous 24/7 production', 'Metal and ceramic capable', 'AquaFuse™, CleanFuse™, FluidFuse™ binders'],
    },
  },
  {
    id: 'x25',
    name: 'X25Pro™',
    tagline: 'Agile Volume Production',
    image: 'https://www.desktopmetal.com/uploads/_image720x720/463073/X25Pro_DarkBG.jpg',
    specs: {
      volume: '400 x 250 x 250 mm',
      speed: '1,200 cc/hr',
      resolution: '>30 µm voxels',
    },
    description: 'Mid-sized binder jetting system featuring patented Triple ACT (Advanced Compaction Technology) for industry-leading part density and repeatability at volume.',
    fullSpecs: {
      buildVolume: '400 x 250 x 250 mm (25L)',
      maxBuildRate: '1,200 cc/hr',
      resolution: '>30 µm voxels (10 picoliter printhead)',
      layerThickness: '30–200 μm',
      technology: 'Triple ACT™ Binder Jetting',
      materials: ['Stainless Steels (17-4PH, 316L)', 'Tool Steels (H13, M2)', 'Copper', 'Inconel 625', 'Titanium Ti-6Al-4V'],
      features: ['Triple Advanced Compaction Technology', 'Excellent surface quality', 'Specialty materials capability', '10 picoliter printhead'],
    },
  },
  {
    id: 'shop',
    name: 'Shop System™',
    tagline: 'Best-Selling Metal Binder Jet',
    image: 'https://www.rapidmodel.com.my/beta/wp-content/uploads/2022/04/shop10.jpg',
    specs: {
      volume: '350 x 220 x 200 mm',
      speed: '3,120 cc/hr',
      resolution: '1600 dpi',
    },
    description: 'The world\'s best-selling metal binder jet system. Turnkey batch production of fully dense, customer-ready metal parts with unparalleled surface finish.',
    fullSpecs: {
      buildVolume: '350 x 220 x 200 mm (16L)',
      maxBuildRate: '3,120 cc/hr',
      resolution: '1600 dpi native',
      layerThickness: '50–100 μm',
      technology: 'Binder Jetting',
      materials: ['17-4PH Stainless Steel', '316L Stainless Steel', 'H13 Tool Steel', 'Copper', '4140 Low-Alloy Steel'],
      features: ['70,000+ nozzle printhead', '1.2 picoliter droplets', 'Turnkey solution', 'Production-ready parts'],
    },
  },
  {
    id: 'studio',
    name: 'Studio System™ 2',
    tagline: 'Office-Friendly Metal',
    image: 'https://www.desktopmetal.com/uploads/_1024x680_crop_center-center_75_none/Studio2_Printer_1024x680.png',
    specs: {
      volume: '300 x 200 x 200 mm',
      speed: '800 cc/hr',
      resolution: '0.25–0.40 mm',
    },
    description: 'Office-friendly production of metal prototypes and one-off parts. Just Print. And Sinter. No special facilities required.',
    fullSpecs: {
      buildVolume: '300 x 200 x 200 mm',
      maxBuildRate: '800 cc/hr',
      resolution: '0.40 mm nozzle (standard) or 0.25 mm (high resolution)',
      layerThickness: '50–150 μm (high res) or 150–300 μm (standard)',
      technology: 'Bound Metal Deposition (BMD)',
      materials: ['17-4PH Stainless Steel', '316L Stainless Steel', 'H13 Tool Steel', 'Copper', '4140 Steel'],
      features: ['Office-safe operation', 'No loose powder handling', 'Integrated debind & sinter', 'Rapid prototyping'],
    },
  },
  {
    id: 'innovent',
    name: 'InnoventX™',
    tagline: 'Open Architecture R&D',
    image: 'https://www.desktopmetal.com/uploads/_image720x720/463073/X25Pro_DarkBG.jpg',
    specs: {
      volume: '160 x 65 x 65 mm',
      speed: '54 cc/hr',
      resolution: '>30 µm voxels',
    },
    description: 'The world\'s best-selling binder jetting system for research and education. Open architecture for developing new material parameters.',
    fullSpecs: {
      buildVolume: '160 x 65 x 65 mm',
      maxBuildRate: '54 cc/hr',
      resolution: '>30 µm voxels',
      layerThickness: '30–200 μm',
      technology: 'Binder Jetting',
      materials: ['Open material platform', 'Custom alloy development', 'Research materials'],
      features: ['Open architecture', 'Same printhead as X-Series', 'Material development', 'Research & education'],
    },
  },
];

const ProductShowcase: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % products.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  const currentProduct = products[currentIndex];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-arc-border pb-6">
        <div>
          <h3 className="text-sm font-mono text-arc-accent mb-2 tracking-widest uppercase">Technology Stack</h3>
          <h2 className="text-3xl md:text-4xl font-bold text-white">THE FLEET</h2>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <span className="text-sm text-arc-muted font-mono">
            {currentIndex + 1} / {products.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={goToPrevious}
              className="p-2 border border-arc-border hover:border-arc-accent hover:bg-arc-accent/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-arc-text" />
            </button>
            <button
              onClick={goToNext}
              className="p-2 border border-arc-border hover:border-arc-accent hover:bg-arc-accent/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-arc-text" />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={carouselRef}
        className="relative overflow-hidden"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentProduct.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Image Section */}
            <div className="relative aspect-square lg:aspect-auto lg:h-[500px] bg-arc-panel border border-arc-border overflow-hidden group">
              <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
              <div className="absolute inset-0 flex items-center justify-center p-8">
                {currentProduct.image ? (
                  <img
                    src={currentProduct.image}
                    alt={currentProduct.name}
                    className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <Box size={120} strokeWidth={0.5} className="text-arc-border" />
                )}
              </div>

              {/* Floating Badge */}
              <div className="absolute top-6 left-6">
                <span className="text-xs font-mono bg-arc-accent text-white px-3 py-1.5 uppercase tracking-wider">
                  {currentProduct.fullSpecs?.technology || 'Metal'}
                </span>
              </div>

              {/* Navigation Dots */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {products.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? 'bg-arc-accent w-6'
                        : 'bg-arc-border hover:bg-arc-muted'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col justify-center">
              <div className="mb-6">
                <h3 className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center gap-3">
                  {currentProduct.name}
                  <ArrowUpRight className="w-8 h-8 text-arc-accent" />
                </h3>
                <p className="text-lg font-mono text-arc-accent uppercase tracking-wider">
                  {currentProduct.tagline}
                </p>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-arc-panel border border-arc-border p-4">
                  <div className="flex items-center gap-2 text-arc-muted mb-2">
                    <Ruler size={14} />
                    <span className="text-[10px] uppercase tracking-wider">Build Volume</span>
                  </div>
                  <div className="text-lg font-mono text-white">{currentProduct.specs.volume}</div>
                </div>
                <div className="bg-arc-panel border border-arc-border p-4">
                  <div className="flex items-center gap-2 text-arc-muted mb-2">
                    <Zap size={14} />
                    <span className="text-[10px] uppercase tracking-wider">Build Rate</span>
                  </div>
                  <div className="text-lg font-mono text-white">{currentProduct.specs.speed}</div>
                </div>
                <div className="bg-arc-panel border border-arc-border p-4">
                  <div className="flex items-center gap-2 text-arc-muted mb-2">
                    <Gauge size={14} />
                    <span className="text-[10px] uppercase tracking-wider">Resolution</span>
                  </div>
                  <div className="text-lg font-mono text-white">{currentProduct.specs.resolution}</div>
                </div>
                <div className="bg-arc-panel border border-arc-border p-4">
                  <div className="flex items-center gap-2 text-arc-muted mb-2">
                    <Layers size={14} />
                    <span className="text-[10px] uppercase tracking-wider">Layer</span>
                  </div>
                  <div className="text-lg font-mono text-white">{currentProduct.fullSpecs?.layerThickness || '30-200 μm'}</div>
                </div>
              </div>

              <p className="text-arc-muted leading-relaxed mb-8 text-lg">
                {currentProduct.description}
              </p>

              <button
                onClick={() => setSelectedProduct(currentProduct)}
                className="w-full md:w-auto px-8 py-4 bg-transparent border-2 border-arc-accent text-arc-accent text-sm font-bold uppercase tracking-widest hover:bg-arc-accent hover:text-white transition-all"
              >
                View Full Specifications
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Product Thumbnails */}
      <div className="mt-8 grid grid-cols-5 gap-2">
        {products.map((product, index) => (
          <button
            key={product.id}
            onClick={() => goToSlide(index)}
            className={`relative p-3 border transition-all ${
              index === currentIndex
                ? 'border-arc-accent bg-arc-accent/10'
                : 'border-arc-border hover:border-arc-muted bg-arc-panel'
            }`}
          >
            <div className="aspect-square flex items-center justify-center">
              <img
                src={product.image}
                alt={product.name}
                className="max-w-full max-h-full object-contain opacity-70"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <p className={`text-[9px] font-mono mt-2 text-center truncate ${
              index === currentIndex ? 'text-arc-accent' : 'text-arc-muted'
            }`}>
              {product.name}
            </p>
          </button>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-arc-border pt-8 text-arc-muted font-mono text-xs">
        <div>
          <span className="block text-arc-text font-bold mb-1">30+ ALLOYS</span>
          <span>Qualified Materials</span>
        </div>
        <div>
          <span className="block text-arc-text font-bold mb-1">100x FASTER</span>
          <span>Than Laser PBF</span>
        </div>
        <div>
          <span className="block text-arc-text font-bold mb-1">&lt;1% POROSITY</span>
          <span>Sintered Density</span>
        </div>
        <div>
          <span className="block text-arc-text font-bold mb-1">AI OPTIMIZED</span>
          <span>Live Sinter™ Ready</span>
        </div>
      </div>

      {/* Specification Modal */}
      <AnimatePresence>
        {selectedProduct && selectedProduct.fullSpecs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-arc-black border border-arc-border max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-arc-black border-b border-arc-border p-6 flex items-start justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedProduct.name}</h2>
                  <p className="text-sm font-mono text-arc-accent uppercase tracking-wider mt-1">
                    {selectedProduct.tagline}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 hover:bg-arc-panel rounded transition-colors"
                >
                  <X className="w-5 h-5 text-arc-muted" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Product Image */}
                <div className="relative h-64 bg-arc-panel border border-arc-border mb-6 flex items-center justify-center overflow-hidden">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="max-h-full max-w-full object-contain p-4"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="text-[10px] font-mono bg-arc-accent text-white px-2 py-1 uppercase tracking-wider">
                      {selectedProduct.fullSpecs.technology}
                    </span>
                  </div>
                </div>

                {/* Key Specs Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-arc-panel border border-arc-border p-4">
                    <div className="flex items-center gap-2 text-arc-muted mb-2">
                      <Ruler className="w-4 h-4" />
                      <span className="text-[10px] uppercase">Build Volume</span>
                    </div>
                    <div className="text-sm font-mono text-white">{selectedProduct.fullSpecs.buildVolume}</div>
                  </div>
                  <div className="bg-arc-panel border border-arc-border p-4">
                    <div className="flex items-center gap-2 text-arc-muted mb-2">
                      <Zap className="w-4 h-4" />
                      <span className="text-[10px] uppercase">Build Rate</span>
                    </div>
                    <div className="text-sm font-mono text-white">{selectedProduct.fullSpecs.maxBuildRate}</div>
                  </div>
                  <div className="bg-arc-panel border border-arc-border p-4">
                    <div className="flex items-center gap-2 text-arc-muted mb-2">
                      <Gauge className="w-4 h-4" />
                      <span className="text-[10px] uppercase">Resolution</span>
                    </div>
                    <div className="text-sm font-mono text-white">{selectedProduct.fullSpecs.resolution}</div>
                  </div>
                  <div className="bg-arc-panel border border-arc-border p-4">
                    <div className="flex items-center gap-2 text-arc-muted mb-2">
                      <Layers className="w-4 h-4" />
                      <span className="text-[10px] uppercase">Layer Thickness</span>
                    </div>
                    <div className="text-sm font-mono text-white">{selectedProduct.fullSpecs.layerThickness}</div>
                  </div>
                </div>

                {/* Materials Section */}
                <div className="mb-8">
                  <h3 className="text-sm font-mono text-arc-accent uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    Supported Materials
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.fullSpecs.materials.map((material, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-arc-panel border border-arc-border text-sm text-arc-text font-mono"
                      >
                        {material}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Features Section */}
                <div className="mb-8">
                  <h3 className="text-sm font-mono text-arc-accent uppercase tracking-wider mb-4">
                    Key Features
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedProduct.fullSpecs.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3 text-arc-text">
                        <span className="w-1.5 h-1.5 bg-arc-accent flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Description */}
                <div className="p-4 bg-arc-panel border-l-2 border-arc-accent">
                  <p className="text-arc-muted leading-relaxed">{selectedProduct.description}</p>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-4 mt-8">
                  <a
                    href="https://www.desktopmetal.com/products/xseries"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 bg-arc-accent text-white text-center text-sm font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors"
                  >
                    Visit Desktop Metal
                  </a>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="px-8 py-3 border border-arc-border text-white text-sm font-bold uppercase tracking-widest hover:bg-arc-panel transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductShowcase;
