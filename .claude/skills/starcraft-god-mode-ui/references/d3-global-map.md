# D3.js Global Network Map

Comprehensive patterns for implementing the ADAM install base visualization.

## Map Configuration

### Projections

```typescript
// US-focused Albers projection (best for continental US)
const usProjection = d3.geoAlbersUsa()
  .scale(1200)
  .translate([width / 2, height / 2]);

// For world view with US focus
const worldProjection = d3.geoMercator()
  .scale(150)
  .center([-95, 40])  // Center on US
  .translate([width / 2, height / 2]);

// Orthographic (3D globe effect)
const globeProjection = d3.geoOrthographic()
  .scale(300)
  .translate([width / 2, height / 2])
  .rotate([95, -35, 0]);  // Rotate to show US
```

### TopoJSON Sources

```typescript
// CDN sources for geographic data
const MAP_DATA = {
  // US States (10m resolution - good balance of detail and size)
  usStates: 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json',
  
  // US Counties (for detailed regional views)
  usCounties: 'https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json',
  
  // World countries
  world: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
};
```

## Complete Map Implementation

```tsx
// components/GlobalMap/AdamNetworkMap.tsx
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { useInstallBaseData } from '../../hooks/useInstallBaseData';
import { MapFilters } from './MapFilters';
import { SiteDetailPanel } from './SiteDetailPanel';
import { SelectionQueue } from './SelectionQueue';
import { MapLegend } from './MapLegend';
import './AdamNetworkMap.css';

// Types
interface Site {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  installations: number;
  productLines: string[];
  priorityTier: 'A' | 'B' | 'C';
  priorityScore: number;
  contactName?: string;
  contactEmail?: string;
  hasShop: boolean;
  hasStudio: boolean;
  hasInnX: boolean;
}

interface MapFilters {
  productLines: string[];
  priorityTiers: string[];
  states: string[];
  minInstallations: number;
  searchQuery: string;
}

// Constants
const TIER_COLORS: Record<string, string> = {
  A: '#ffd700',   // Gold - highest priority
  B: '#00d4ff',   // Cyan - medium priority
  C: '#445566',   // Muted - lower priority
};

const PRODUCT_ICONS: Record<string, string> = {
  Shop: '🏭',
  Studio: '🎨',
  InnX: '🔬',
};

export const AdamNetworkMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const [dimensions, setDimensions] = useState({ width: 960, height: 600 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredSite, setHoveredSite] = useState<Site | null>(null);
  const [zoom, setZoom] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [filters, setFilters] = useState<MapFilters>({
    productLines: [],
    priorityTiers: [],
    states: [],
    minInstallations: 0,
    searchQuery: '',
  });

  const { sites, loading, error } = useInstallBaseData('/api/install-base');

  // Filter sites based on current filters
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      // Product line filter
      if (filters.productLines.length > 0) {
        const hasMatch = filters.productLines.some((pl) =>
          site.productLines.includes(pl)
        );
        if (!hasMatch) return false;
      }

      // Priority tier filter
      if (filters.priorityTiers.length > 0) {
        if (!filters.priorityTiers.includes(site.priorityTier)) return false;
      }

      // State filter
      if (filters.states.length > 0) {
        if (!filters.states.includes(site.state)) return false;
      }

      // Min installations filter
      if (site.installations < filters.minInstallations) return false;

      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = site.name.toLowerCase().includes(query);
        const matchesCity = site.city.toLowerCase().includes(query);
        if (!matchesName && !matchesCity) return false;
      }

      return true;
    });
  }, [sites, filters]);

  // Selected sites list
  const selectedSites = useMemo(() => {
    return sites.filter((s) => selectedIds.has(s.id));
  }, [sites, selectedIds]);

  // Available states for filter
  const availableStates = useMemo(() => {
    return [...new Set(sites.map((s) => s.state))].sort();
  }, [sites]);

  // Handle responsive sizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height: height - 60 }); // Account for header
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Selection handlers
  const handleSiteSelect = useCallback((siteId: string, additive = false) => {
    setSelectedIds((prev) => {
      const next = new Set(additive ? prev : []);
      if (prev.has(siteId) && additive) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredSites.map((s) => s.id)));
  }, [filteredSites]);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || loading) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Create projection
    const projection = d3.geoAlbersUsa()
      .scale(width * 1.3)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Add gradient definitions
    const defs = svg.append('defs');

    // Glow filter
    const glowFilter = defs.append('filter')
      .attr('id', 'marker-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    glowFilter.append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    
    glowFilter.append('feMerge')
      .selectAll('feMergeNode')
      .data(['blur', 'SourceGraphic'])
      .join('feMergeNode')
      .attr('in', (d) => d);

    // Background gradient
    const bgGradient = defs.append('radialGradient')
      .attr('id', 'map-bg-gradient')
      .attr('cx', '30%')
      .attr('cy', '30%');
    
    bgGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'rgba(0, 212, 255, 0.05)');
    
    bgGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'transparent');

    // Background
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'var(--bg-primary)');

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#map-bg-gradient)');

    // Create zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 8])
      .on('zoom', (event) => {
        mapGroup.attr('transform', event.transform.toString());
        setZoom(event.transform);
      });

    svg.call(zoomBehavior);

    const mapGroup = svg.append('g').attr('class', 'map-group');

    // Load and render US states
    d3.json<Topology>('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
      .then((us) => {
        if (!us) return;

        const states = topojson.feature(
          us,
          us.objects.states as GeometryCollection
        );

        // State mesh for borders
        const stateMesh = topojson.mesh(
          us,
          us.objects.states as GeometryCollection,
          (a, b) => a !== b
        );

        // Draw states
        mapGroup.append('g')
          .attr('class', 'states-layer')
          .selectAll('path')
          .data(states.features)
          .join('path')
          .attr('class', 'state')
          .attr('d', path)
          .attr('fill', 'var(--bg-secondary)')
          .attr('stroke', 'none')
          .on('mouseenter', function () {
            d3.select(this).attr('fill', 'var(--bg-tertiary)');
          })
          .on('mouseleave', function () {
            d3.select(this).attr('fill', 'var(--bg-secondary)');
          });

        // Draw state borders
        mapGroup.append('path')
          .attr('class', 'state-borders')
          .datum(stateMesh)
          .attr('d', path)
          .attr('fill', 'none')
          .attr('stroke', 'var(--border-subtle)')
          .attr('stroke-width', 0.5);

        // Draw site markers
        const markersGroup = mapGroup.append('g').attr('class', 'markers-layer');

        // Sort so selected markers render on top
        const sortedSites = [...filteredSites].sort((a, b) => {
          const aSelected = selectedIds.has(a.id) ? 1 : 0;
          const bSelected = selectedIds.has(b.id) ? 1 : 0;
          return aSelected - bSelected;
        });

        const markers = markersGroup
          .selectAll('g.site-marker')
          .data(sortedSites, (d: any) => d.id)
          .join('g')
          .attr('class', (d) => `site-marker ${selectedIds.has(d.id) ? 'selected' : ''}`)
          .attr('transform', (d) => {
            const coords = projection([d.lng, d.lat]);
            return coords ? `translate(${coords[0]}, ${coords[1]})` : '';
          })
          .style('cursor', 'pointer');

        // Marker circles
        markers.append('circle')
          .attr('r', (d) => Math.max(6, Math.sqrt(d.installations) * 5))
          .attr('fill', (d) => selectedIds.has(d.id)
            ? 'var(--accent-secondary)'
            : TIER_COLORS[d.priorityTier]
          )
          .attr('stroke', (d) => selectedIds.has(d.id)
            ? 'var(--accent-secondary)'
            : 'var(--bg-primary)'
          )
          .attr('stroke-width', 2)
          .attr('opacity', 0.9);

        // Add installation count labels for larger sites
        markers.filter((d) => d.installations >= 3)
          .append('text')
          .attr('class', 'marker-label')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('fill', 'var(--bg-primary)')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'var(--font-mono)')
          .text((d) => d.installations);

        // Event handlers
        markers
          .on('click', (event, d) => {
            event.stopPropagation();
            handleSiteSelect(d.id, event.shiftKey || event.ctrlKey || event.metaKey);
          })
          .on('mouseenter', (event, d) => {
            setHoveredSite(d);
            
            // Highlight effect
            d3.select(event.currentTarget)
              .raise()
              .select('circle')
              .transition()
              .duration(150)
              .attr('r', (d: any) => Math.max(8, Math.sqrt(d.installations) * 6))
              .attr('filter', 'url(#marker-glow)');
          })
          .on('mouseleave', (event, d) => {
            setHoveredSite(null);
            
            d3.select(event.currentTarget)
              .select('circle')
              .transition()
              .duration(150)
              .attr('r', (d: any) => Math.max(6, Math.sqrt(d.installations) * 5))
              .attr('filter', selectedIds.has(d.id) ? 'url(#marker-glow)' : 'none');
          });

        // Apply glow to selected markers
        markers.filter((d) => selectedIds.has(d.id))
          .select('circle')
          .attr('filter', 'url(#marker-glow)');
      });

    // Click on background to deselect
    svg.on('click', () => {
      if (!d3.event?.defaultPrevented) {
        // Don't clear if clicking markers
      }
    });

  }, [dimensions, filteredSites, selectedIds, loading, handleSiteSelect]);

  if (loading) {
    return (
      <div className="adam-network-map loading">
        <div className="loading-spinner" />
        <p>Loading install base data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="adam-network-map error">
        <p>Error loading data: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="adam-network-map" ref={containerRef}>
      <div className="map-header" data-augmented-ui="bl-clip br-clip border">
        <h2>ADAM GLOBAL NETWORK</h2>
        <div className="map-header__stats">
          <span>{filteredSites.length} sites</span>
          <span>•</span>
          <span>
            {filteredSites.reduce((sum, s) => sum + s.installations, 0)} printers
          </span>
        </div>
        <div className="map-header__actions">
          <button onClick={handleSelectAll} className="action-btn">
            Select All Visible
          </button>
          <button onClick={handleClearSelection} className="action-btn">
            Clear Selection
          </button>
        </div>
      </div>

      <div className="map-content">
        <aside className="map-sidebar left">
          <MapFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableStates={availableStates}
          />
          <MapLegend />
        </aside>

        <main className="map-viewport" data-augmented-ui="tl-clip br-clip border">
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="network-map-svg"
          />
          
          {/* Zoom controls */}
          <div className="zoom-controls">
            <button onClick={() => {
              const svg = d3.select(svgRef.current);
              svg.transition().call(
                d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
                1.5
              );
            }}>+</button>
            <button onClick={() => {
              const svg = d3.select(svgRef.current);
              svg.transition().call(
                d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
                0.67
              );
            }}>−</button>
            <button onClick={() => {
              const svg = d3.select(svgRef.current);
              svg.transition().call(
                d3.zoom<SVGSVGElement, unknown>().transform as any,
                d3.zoomIdentity
              );
            }}>⌂</button>
          </div>
        </main>

        <aside className="map-sidebar right">
          <SiteDetailPanel
            site={hoveredSite}
            isSelected={hoveredSite ? selectedIds.has(hoveredSite.id) : false}
            onSelect={() => hoveredSite && handleSiteSelect(hoveredSite.id)}
            onDeselect={() => hoveredSite && handleSiteSelect(hoveredSite.id, true)}
          />
          <SelectionQueue
            selectedSites={selectedSites}
            onRemoveSite={(id) => handleSiteSelect(id, true)}
            onClearAll={handleClearSelection}
            onOnboardSelected={() => {
              console.log('Onboarding sites:', selectedSites);
              // Trigger ADAM onboarding workflow
            }}
          />
        </aside>
      </div>
    </div>
  );
};
```

## Map Legend Component

```tsx
// components/GlobalMap/MapLegend.tsx
export const MapLegend: React.FC = () => (
  <div className="map-legend" data-augmented-ui="tl-clip border">
    <h4>LEGEND</h4>
    
    <div className="legend-section">
      <h5>Priority Tier</h5>
      <div className="legend-items">
        <div className="legend-item">
          <span className="legend-marker tier-a" />
          <span>Tier A - High Priority</span>
        </div>
        <div className="legend-item">
          <span className="legend-marker tier-b" />
          <span>Tier B - Medium Priority</span>
        </div>
        <div className="legend-item">
          <span className="legend-marker tier-c" />
          <span>Tier C - Standard</span>
        </div>
        <div className="legend-item">
          <span className="legend-marker selected" />
          <span>Selected for Onboarding</span>
        </div>
      </div>
    </div>

    <div className="legend-section">
      <h5>Marker Size</h5>
      <div className="legend-items">
        <div className="legend-item">
          <span className="legend-marker size-small" />
          <span>1-2 Printers</span>
        </div>
        <div className="legend-item">
          <span className="legend-marker size-medium" />
          <span>3-4 Printers</span>
        </div>
        <div className="legend-item">
          <span className="legend-marker size-large" />
          <span>5+ Printers</span>
        </div>
      </div>
    </div>

    <div className="legend-section">
      <h5>Product Lines</h5>
      <div className="legend-items">
        <div className="legend-item">
          <span className="legend-icon">🏭</span>
          <span>Shop System</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon">🎨</span>
          <span>Studio System</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon">🔬</span>
          <span>InnoventX</span>
        </div>
      </div>
    </div>
  </div>
);
```

## Complete CSS for Map

```css
/* AdamNetworkMap.css */
.adam-network-map {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-void);
}

.map-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 0.75rem 1.5rem;
  background: var(--bg-panel);
  --aug-bl: 8px;
  --aug-br: 8px;
  --aug-border-all: 1px;
  --aug-border-bg: var(--border-subtle);
}

.map-header h2 {
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 0.15em;
  color: var(--accent-primary);
  margin: 0;
}

.map-header__stats {
  display: flex;
  gap: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.map-header__actions {
  margin-left: auto;
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.4rem 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  font-size: 0.75rem;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  border-color: var(--accent-primary);
  box-shadow: var(--glow-primary);
}

.map-content {
  display: grid;
  grid-template-columns: 240px 1fr 280px;
  gap: 2px;
  flex: 1;
  overflow: hidden;
}

.map-sidebar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.map-viewport {
  position: relative;
  background: var(--bg-primary);
  --aug-tl: 12px;
  --aug-br: 12px;
  --aug-border-all: 1px;
  --aug-border-bg: var(--border-subtle);
  overflow: hidden;
}

.network-map-svg {
  display: block;
}

/* Zoom controls */
.zoom-controls {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.zoom-controls button {
  width: 32px;
  height: 32px;
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.zoom-controls button:hover {
  border-color: var(--accent-primary);
  box-shadow: var(--glow-primary);
}

/* Map Filters */
.map-filters {
  background: var(--bg-panel);
  padding: 1rem;
  --aug-tl: 8px;
  --aug-border-all: 1px;
  --aug-border-bg: var(--border-subtle);
}

.map-filters h4 {
  font-family: var(--font-display);
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  margin: 0 0 1rem 0;
  text-transform: uppercase;
}

.map-filters__section {
  margin-bottom: 1rem;
}

.map-filters__section h5 {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
}

.map-filters__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.filter-btn {
  padding: 0.35rem 0.6rem;
  background: var(--bg-tertiary);
  border: 1px solid transparent;
  color: var(--text-secondary);
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-btn:hover {
  border-color: var(--border-default);
}

.filter-btn.active {
  background: var(--accent-primary);
  color: var(--bg-primary);
  border-color: var(--accent-primary);
}

.filter-btn.tier-A.active { background: #ffd700; }
.filter-btn.tier-B.active { background: #00d4ff; }
.filter-btn.tier-C.active { background: #556677; color: var(--text-primary); }

/* Search input */
.map-search {
  width: 100%;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 0.8rem;
}

.map-search:focus {
  outline: none;
  border-color: var(--accent-primary);
}

/* Legend */
.map-legend {
  background: var(--bg-panel);
  padding: 1rem;
  --aug-tl: 8px;
  --aug-border-all: 1px;
  --aug-border-bg: var(--border-subtle);
}

.map-legend h4 {
  font-family: var(--font-display);
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  margin: 0 0 1rem 0;
}

.legend-section {
  margin-bottom: 1rem;
}

.legend-section h5 {
  font-size: 0.65rem;
  color: var(--text-muted);
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.legend-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-marker.tier-a { background: #ffd700; }
.legend-marker.tier-b { background: #00d4ff; }
.legend-marker.tier-c { background: #556677; }
.legend-marker.selected { background: var(--accent-secondary); box-shadow: var(--glow-success); }

.legend-marker.size-small { width: 8px; height: 8px; background: var(--accent-primary); }
.legend-marker.size-medium { width: 12px; height: 12px; background: var(--accent-primary); }
.legend-marker.size-large { width: 18px; height: 18px; background: var(--accent-primary); }

.legend-icon {
  font-size: 1rem;
}

/* Site Detail Panel */
.site-detail-panel {
  background: var(--bg-panel);
  padding: 1rem;
  --aug-tl: 8px;
  --aug-br: 8px;
  --aug-border-all: 1px;
  --aug-border-bg: var(--border-subtle);
}

.site-detail-panel.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.site-detail-panel.selected {
  --aug-border-bg: var(--accent-secondary);
}

.site-detail-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.tier-badge {
  padding: 0.2rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 2px;
}

.tier-badge.tier-A { background: #ffd700; color: #000; }
.tier-badge.tier-B { background: #00d4ff; color: #000; }
.tier-badge.tier-C { background: #556677; color: #fff; }

.priority-score {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-muted);
}

.site-detail-panel__name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: var(--text-primary);
}

.site-detail-panel__location {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0 0 1rem 0;
}

.site-detail-panel__stats {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat__value {
  font-family: var(--font-mono);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--accent-primary);
}

.stat__label {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.site-detail-panel__products {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.product-badge {
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
  border-radius: 2px;
}

.product-badge.shop { background: rgba(0, 212, 255, 0.2); color: var(--accent-primary); }
.product-badge.studio { background: rgba(170, 68, 255, 0.2); color: var(--accent-purple); }
.product-badge.innx { background: rgba(255, 215, 0, 0.2); color: var(--accent-gold); }

.site-detail-panel__contact {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.site-detail-panel__contact a {
  color: var(--accent-primary);
}

.onboard-btn {
  width: 100%;
  padding: 0.75rem;
  background: var(--bg-tertiary);
  border: none;
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
  --aug-tl: 4px;
  --aug-br: 4px;
  --aug-border-all: 1px;
  --aug-border-bg: var(--accent-primary);
  transition: all 0.15s;
}

.onboard-btn:hover {
  background: var(--accent-primary);
  color: var(--bg-primary);
}

.onboard-btn.selected {
  --aug-border-bg: var(--accent-danger);
}

/* Selection Queue */
.selection-queue {
  background: var(--bg-panel);
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  --aug-tl: 8px;
  --aug-tr: 8px;
  --aug-border-all: 1px;
  --aug-border-bg: var(--border-subtle);
}

.selection-queue__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.selection-queue__header h4 {
  font-family: var(--font-display);
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  margin: 0;
}

.clear-btn {
  font-size: 0.65rem;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
}

.clear-btn:hover {
  color: var(--accent-danger);
}

.selection-queue__summary {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-subtle);
}

.summary-stat {
  display: flex;
  flex-direction: column;
}

.summary-stat__value {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--accent-secondary);
}

.summary-stat__label {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.selection-queue__list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  border-radius: 2px;
}

.queue-item__info {
  flex: 1;
  min-width: 0;
}

.queue-item__name {
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-item__meta {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.queue-item__remove {
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.queue-item__remove:hover {
  color: var(--accent-danger);
}

.onboard-all-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  margin-top: 1rem;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  border: none;
  color: var(--bg-primary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  --aug-tl: 6px;
  --aug-br: 6px;
  --aug-border-all: 0;
  transition: all 0.15s;
}

.onboard-all-btn:hover {
  box-shadow: var(--glow-success);
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 1rem;
}

/* Loading and error states */
.adam-network-map.loading,
.adam-network-map.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-subtle);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

## Data Export Script

Convert the Excel install base to JSON for the web app:

```python
# scripts/export_install_base.py
import pandas as pd
import json

# Load Excel data
df = pd.read_excel('installbase_consolidated.xlsx', sheet_name='Sites_Summary')

# Clean and transform
sites = []
for _, row in df.iterrows():
    site = {
        'id': row['Site Key'],
        'name': row['Site Name'],
        'street': row['Street'],
        'city': row['City'],
        'state': row['ST'],
        'zip': str(row['Zip']),
        'country': row['Country'],
        'installations': int(row['Installations'] or 0),
        'productLines': row['Product Lines'],
        'priorityTier': row['Priority Tier'] or 'C',
        'priorityScore': float(row['Priority Score'] or 0),
        'contactName': row['Contact Name'] if pd.notna(row['Contact Name']) else None,
        'contactEmail': row['Contact Email'] if pd.notna(row['Contact Email']) else None,
        'hasShop': bool(row['Has Shop']),
        'hasStudio': bool(row['Has Studio']),
        'hasInnX': bool(row['Has InnX']),
    }
    sites.append(site)

# Write JSON
with open('public/data/install-base.json', 'w') as f:
    json.dump(sites, f, indent=2)

print(f'Exported {len(sites)} sites to install-base.json')
```
