/**
 * ProductShowcase - Carousel showcasing Desktop Metal printer fleet
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Box,
  ArrowUpRight,
  Ruler,
  X,
  Cpu,
  Layers,
  Zap,
  Gauge,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import styles from './ProductShowcase.module.css'

interface ProductSpecs {
  volume: string
  speed: string
  resolution?: string
  layerThickness?: string
  technology?: string
  materials?: string[]
}

interface Product {
  id: string
  name: string
  tagline: string
  image: string
  specs: ProductSpecs
  description: string
  fullSpecs?: {
    buildVolume: string
    maxBuildRate: string
    resolution: string
    layerThickness: string
    technology: string
    materials: string[]
    features: string[]
  }
}

const products: Product[] = [
  {
    id: 'x160',
    name: "X160Pro\u2122",
    tagline: "World's Largest Binder Jet",
    image:
      'https://www.desktopmetal.com/uploads/_image720x720/463071/X160Pro_DarkBG_2022-02-15-135646.jpg',
    specs: {
      volume: '800 x 500 x 400 mm',
      speed: '3,120 cc/hr',
      resolution: '>30 \u00b5m voxels',
    },
    description:
      "The world's largest binder jet 3D printer. Industrial-scale continuous 24/7 production with Triple ACT technology for metals and ceramics.",
    fullSpecs: {
      buildVolume: '800 x 500 x 400 mm (160L)',
      maxBuildRate: '3,120 cc/hr @ 65\u03bcm layer',
      resolution: 'Industrial piezoelectric printhead',
      layerThickness: '30\u2013200 \u03bcm',
      technology: 'Triple ACT\u2122 Binder Jetting',
      materials: [
        'Stainless Steels (17-4PH, 316L)',
        'Tool Steels',
        'Nickel Alloys',
        'Titanium',
        'Silicon Carbide (SiC)',
        'Boron Carbide',
      ],
      features: [
        "World's largest binder jet build volume",
        'Triple Advanced Compaction Technology',
        'Continuous 24/7 production',
        'Metal and ceramic capable',
        'AquaFuse\u2122, CleanFuse\u2122, FluidFuse\u2122 binders',
      ],
    },
  },
  {
    id: 'x25',
    name: 'X25Pro\u2122',
    tagline: 'Agile Volume Production',
    image:
      'https://www.desktopmetal.com/uploads/_image720x720/463073/X25Pro_DarkBG.jpg',
    specs: {
      volume: '400 x 250 x 250 mm',
      speed: '1,200 cc/hr',
      resolution: '>30 \u00b5m voxels',
    },
    description:
      'Mid-sized binder jetting system featuring patented Triple ACT (Advanced Compaction Technology) for industry-leading part density and repeatability at volume.',
    fullSpecs: {
      buildVolume: '400 x 250 x 250 mm (25L)',
      maxBuildRate: '1,200 cc/hr',
      resolution: '>30 \u03bcm voxels (10 picoliter printhead)',
      layerThickness: '30\u2013200 \u03bcm',
      technology: 'Triple ACT\u2122 Binder Jetting',
      materials: [
        'Stainless Steels (17-4PH, 316L)',
        'Tool Steels (H13, M2)',
        'Copper',
        'Inconel 625',
        'Titanium Ti-6Al-4V',
      ],
      features: [
        'Triple Advanced Compaction Technology',
        'Excellent surface quality',
        'Specialty materials capability',
        '10 picoliter printhead',
      ],
    },
  },
  {
    id: 'shop',
    name: 'Shop System\u2122',
    tagline: 'Best-Selling Metal Binder Jet',
    image:
      'https://www.rapidmodel.com.my/beta/wp-content/uploads/2022/04/shop10.jpg',
    specs: {
      volume: '350 x 220 x 200 mm',
      speed: '3,120 cc/hr',
      resolution: '1600 dpi',
    },
    description:
      "The world's best-selling metal binder jet system. Turnkey batch production of fully dense, customer-ready metal parts with unparalleled surface finish.",
    fullSpecs: {
      buildVolume: '350 x 220 x 200 mm (16L)',
      maxBuildRate: '3,120 cc/hr',
      resolution: '1600 dpi native',
      layerThickness: '50\u2013100 \u03bcm',
      technology: 'Binder Jetting',
      materials: [
        '17-4PH Stainless Steel',
        '316L Stainless Steel',
        'H13 Tool Steel',
        'Copper',
        '4140 Low-Alloy Steel',
      ],
      features: [
        '70,000+ nozzle printhead',
        '1.2 picoliter droplets',
        'Turnkey solution',
        'Production-ready parts',
      ],
    },
  },
  {
    id: 'studio',
    name: 'Studio System\u2122 2',
    tagline: 'Office-Friendly Metal',
    image:
      'https://www.desktopmetal.com/uploads/_1024x680_crop_center-center_75_none/Studio2_Printer_1024x680.png',
    specs: {
      volume: '300 x 200 x 200 mm',
      speed: '800 cc/hr',
      resolution: '0.25\u20130.40 mm',
    },
    description:
      'Office-friendly production of metal prototypes and one-off parts. Just Print. And Sinter. No special facilities required.',
    fullSpecs: {
      buildVolume: '300 x 200 x 200 mm',
      maxBuildRate: '800 cc/hr',
      resolution:
        '0.40 mm nozzle (standard) or 0.25 mm (high resolution)',
      layerThickness:
        '50\u2013150 \u03bcm (high res) or 150\u2013300 \u03bcm (standard)',
      technology: 'Bound Metal Deposition (BMD)',
      materials: [
        '17-4PH Stainless Steel',
        '316L Stainless Steel',
        'H13 Tool Steel',
        'Copper',
        '4140 Steel',
      ],
      features: [
        'Office-safe operation',
        'No loose powder handling',
        'Integrated debind & sinter',
        'Rapid prototyping',
      ],
    },
  },
  {
    id: 'innovent',
    name: 'InnoventX\u2122',
    tagline: 'Open Architecture R&D',
    image:
      'https://www.desktopmetal.com/uploads/_image720x720/470872/InnoventX_DarkBG_a.jpg',
    specs: {
      volume: '160 x 65 x 65 mm',
      speed: '54 cc/hr',
      resolution: '>30 \u00b5m voxels',
    },
    description:
      "The world's best-selling binder jetting system for research and education. Open architecture for developing new material parameters.",
    fullSpecs: {
      buildVolume: '160 x 65 x 65 mm',
      maxBuildRate: '54 cc/hr',
      resolution: '>30 \u03bcm voxels',
      layerThickness: '30\u2013200 \u03bcm',
      technology: 'Binder Jetting',
      materials: [
        'Open material platform',
        'Custom alloy development',
        'Research materials',
      ],
      features: [
        'Open architecture',
        'Same printhead as X-Series',
        'Material development',
        'Research & education',
      ],
    },
  },
]

export function ProductShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const goToPrevious = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length)
  }

  const goToNext = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev + 1) % products.length)
  }

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false)
    setCurrentIndex(index)
  }

  const currentProduct = products[currentIndex]

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={styles.label}>Technology Stack</span>
          <h2 className={styles.title}>THE FLEET</h2>
        </div>
        <div className={styles.controls}>
          <span className={styles.counter}>
            {currentIndex + 1} / {products.length}
          </span>
          <div className={styles.arrows}>
            <button onClick={goToPrevious} className={styles.arrowBtn}>
              <ChevronLeft size={20} />
            </button>
            <button onClick={goToNext} className={styles.arrowBtn}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel */}
      <div
        className={styles.carousel}
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
            className={styles.carouselContent}
          >
            {/* Image Section */}
            <div className={styles.imageSection}>
              <div className={styles.imageContainer}>
                {currentProduct.image ? (
                  <img
                    src={currentProduct.image}
                    alt={currentProduct.name}
                    className={styles.productImage}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                ) : (
                  <Box size={120} strokeWidth={0.5} className={styles.placeholder} />
                )}
              </div>

              {/* Badge */}
              <div className={styles.badge}>
                {currentProduct.fullSpecs?.technology || 'Metal'}
              </div>

              {/* Dots */}
              <div className={styles.dots}>
                {products.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ''}`}
                  />
                ))}
              </div>
            </div>

            {/* Content Section */}
            <div className={styles.contentSection}>
              <div className={styles.productHeader}>
                <h3 className={styles.productName}>
                  {currentProduct.name}
                  <ArrowUpRight size={28} className={styles.arrowIcon} />
                </h3>
                <p className={styles.tagline}>{currentProduct.tagline}</p>
              </div>

              {/* Specs Grid */}
              <div className={styles.specsGrid}>
                <div className={styles.specCard}>
                  <div className={styles.specLabel}>
                    <Ruler size={14} />
                    <span>Build Volume</span>
                  </div>
                  <div className={styles.specValue}>{currentProduct.specs.volume}</div>
                </div>
                <div className={styles.specCard}>
                  <div className={styles.specLabel}>
                    <Zap size={14} />
                    <span>Build Rate</span>
                  </div>
                  <div className={styles.specValue}>{currentProduct.specs.speed}</div>
                </div>
                <div className={styles.specCard}>
                  <div className={styles.specLabel}>
                    <Gauge size={14} />
                    <span>Resolution</span>
                  </div>
                  <div className={styles.specValue}>{currentProduct.specs.resolution}</div>
                </div>
                <div className={styles.specCard}>
                  <div className={styles.specLabel}>
                    <Layers size={14} />
                    <span>Layer</span>
                  </div>
                  <div className={styles.specValue}>
                    {currentProduct.fullSpecs?.layerThickness || '30-200 \u03bcm'}
                  </div>
                </div>
              </div>

              <p className={styles.description}>{currentProduct.description}</p>

              <button
                onClick={() => setSelectedProduct(currentProduct)}
                className={styles.viewSpecsBtn}
              >
                View Full Specifications
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnails */}
      <div className={styles.thumbnails}>
        {products.map((product, index) => (
          <button
            key={product.id}
            onClick={() => goToSlide(index)}
            className={`${styles.thumbnail} ${index === currentIndex ? styles.thumbnailActive : ''}`}
          >
            <div className={styles.thumbnailImage}>
              <img
                src={product.image}
                alt={product.name}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            </div>
            <p className={styles.thumbnailName}>{product.name}</p>
          </button>
        ))}
      </div>

      {/* Footer Stats */}
      <div className={styles.footerStats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>30+ ALLOYS</span>
          <span className={styles.statLabel}>Qualified Materials</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>100x FASTER</span>
          <span className={styles.statLabel}>Than Laser PBF</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>&lt;1% POROSITY</span>
          <span className={styles.statLabel}>Sintered Density</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>AI OPTIMIZED</span>
          <span className={styles.statLabel}>Live Sinter\u2122 Ready</span>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedProduct && selectedProduct.fullSpecs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.modal}
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={styles.modalContent}
            >
              {/* Modal Header */}
              <div className={styles.modalHeader}>
                <div>
                  <h2>{selectedProduct.name}</h2>
                  <p>{selectedProduct.tagline}</p>
                </div>
                <button onClick={() => setSelectedProduct(null)} className={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className={styles.modalBody}>
                {/* Product Image */}
                <div className={styles.modalImage}>
                  <img src={selectedProduct.image} alt={selectedProduct.name} />
                  <span className={styles.techBadge}>
                    {selectedProduct.fullSpecs.technology}
                  </span>
                </div>

                {/* Key Specs */}
                <div className={styles.modalSpecs}>
                  <div className={styles.modalSpecCard}>
                    <div className={styles.specLabel}>
                      <Ruler size={16} />
                      <span>Build Volume</span>
                    </div>
                    <div className={styles.specValue}>{selectedProduct.fullSpecs.buildVolume}</div>
                  </div>
                  <div className={styles.modalSpecCard}>
                    <div className={styles.specLabel}>
                      <Zap size={16} />
                      <span>Build Rate</span>
                    </div>
                    <div className={styles.specValue}>{selectedProduct.fullSpecs.maxBuildRate}</div>
                  </div>
                  <div className={styles.modalSpecCard}>
                    <div className={styles.specLabel}>
                      <Gauge size={16} />
                      <span>Resolution</span>
                    </div>
                    <div className={styles.specValue}>{selectedProduct.fullSpecs.resolution}</div>
                  </div>
                  <div className={styles.modalSpecCard}>
                    <div className={styles.specLabel}>
                      <Layers size={16} />
                      <span>Layer Thickness</span>
                    </div>
                    <div className={styles.specValue}>{selectedProduct.fullSpecs.layerThickness}</div>
                  </div>
                </div>

                {/* Materials */}
                <div className={styles.materialsSection}>
                  <h3>
                    <Cpu size={16} />
                    Supported Materials
                  </h3>
                  <div className={styles.materialTags}>
                    {selectedProduct.fullSpecs.materials.map((material, index) => (
                      <span key={index} className={styles.materialTag}>
                        {material}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div className={styles.featuresSection}>
                  <h3>Key Features</h3>
                  <ul className={styles.featuresList}>
                    {selectedProduct.fullSpecs.features.map((feature, index) => (
                      <li key={index}>
                        <span className={styles.bullet} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Description */}
                <div className={styles.modalDescription}>
                  <p>{selectedProduct.description}</p>
                </div>

                {/* Actions */}
                <div className={styles.modalActions}>
                  <a
                    href="https://www.desktopmetal.com/products/xseries"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.primaryBtn}
                  >
                    Visit Desktop Metal
                  </a>
                  <button onClick={() => setSelectedProduct(null)} className={styles.secondaryBtn}>
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProductShowcase
