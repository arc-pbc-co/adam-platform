/**
 * Types for the GlobalMap install base visualization
 */

export interface Site {
  id: string
  name: string
  street: string
  city: string
  state: string
  zip: string
  country: string
  lat?: number
  lng?: number
  installations: number
  productLines: string
  priorityTier: 'A' | 'B' | 'C'
  priorityScore: number
  contactName: string | null
  contactEmail: string | null
  hasShop: boolean
  hasStudio: boolean
  hasInnX: boolean
}

export interface MapFilters {
  productLines: string[]
  priorityTiers: string[]
  states: string[]
  minInstallations: number
  searchQuery: string
}

export const TIER_COLORS: Record<string, string> = {
  A: '#ffd700',   // Gold - highest priority
  B: '#00d4ff',   // Cyan - medium priority
  C: '#6b7280',   // Gray - standard
}

export const PRODUCT_LINES = ['Shop', 'Studio', 'InnX'] as const

// US state coordinates for geocoding (centroid approximations)
export const STATE_COORDS: Record<string, [number, number]> = {
  AL: [-86.9023, 32.3182],
  AK: [-153.4937, 64.2008],
  AZ: [-111.0937, 34.0489],
  AR: [-92.3731, 34.7465],
  CA: [-119.4179, 36.7783],
  CO: [-105.3111, 39.5501],
  CT: [-72.7554, 41.6032],
  DE: [-75.5277, 38.9108],
  FL: [-81.5158, 27.6648],
  GA: [-83.5002, 32.1574],
  HI: [-155.5828, 19.8968],
  ID: [-114.4788, 44.0682],
  IL: [-89.3985, 40.6331],
  IN: [-86.1349, 40.2672],
  IA: [-93.2105, 41.8780],
  KS: [-98.4842, 39.0119],
  KY: [-84.2700, 37.8393],
  LA: [-91.9623, 31.1695],
  ME: [-69.4455, 45.2538],
  MD: [-76.6413, 39.0458],
  MA: [-71.3824, 42.4072],
  MI: [-85.6024, 44.3148],
  MN: [-94.6859, 46.7296],
  MS: [-89.3985, 32.3547],
  MO: [-91.8318, 38.4561],
  MT: [-110.3626, 46.8797],
  NE: [-99.9018, 41.4925],
  NV: [-116.4194, 38.8026],
  NH: [-71.5724, 43.1939],
  NJ: [-74.4057, 40.0583],
  NM: [-105.8701, 34.5199],
  NY: [-74.2179, 43.2994],
  NC: [-79.0193, 35.7596],
  ND: [-101.0020, 47.5515],
  OH: [-82.9071, 40.4173],
  OK: [-97.0929, 35.0078],
  OR: [-120.5542, 43.8041],
  PA: [-77.1945, 41.2033],
  RI: [-71.4774, 41.5801],
  SC: [-81.1637, 33.8361],
  SD: [-99.9018, 43.9695],
  TN: [-86.5804, 35.5175],
  TX: [-99.9018, 31.9686],
  UT: [-111.0937, 39.3210],
  VT: [-72.5778, 44.5588],
  VA: [-78.6569, 37.4316],
  WA: [-120.7401, 47.7511],
  WV: [-80.4549, 38.5976],
  WI: [-89.6165, 43.7844],
  WY: [-107.2903, 43.0759],
  DC: [-77.0369, 38.9072],
}

// City-specific coordinates for major cities
export const CITY_COORDS: Record<string, [number, number]> = {
  'new york': [-74.0060, 40.7128],
  'los angeles': [-118.2437, 34.0522],
  'chicago': [-87.6298, 41.8781],
  'houston': [-95.3698, 29.7604],
  'phoenix': [-112.0740, 33.4484],
  'philadelphia': [-75.1652, 39.9526],
  'san antonio': [-98.4936, 29.4241],
  'san diego': [-117.1611, 32.7157],
  'dallas': [-96.7970, 32.7767],
  'san jose': [-121.8863, 37.3382],
  'austin': [-97.7431, 30.2672],
  'jacksonville': [-81.6557, 30.3322],
  'san francisco': [-122.4194, 37.7749],
  'columbus': [-82.9988, 39.9612],
  'indianapolis': [-86.1581, 39.7684],
  'fort worth': [-97.3308, 32.7555],
  'charlotte': [-80.8431, 35.2271],
  'seattle': [-122.3321, 47.6062],
  'denver': [-104.9903, 39.7392],
  'boston': [-71.0589, 42.3601],
  'detroit': [-83.0458, 42.3314],
  'nashville': [-86.7816, 36.1627],
  'portland': [-122.6765, 45.5152],
  'las vegas': [-115.1398, 36.1699],
  'memphis': [-90.0490, 35.1495],
  'atlanta': [-84.3880, 33.7490],
  'miami': [-80.1918, 25.7617],
  'pittsburgh': [-79.9959, 40.4406],
  'minneapolis': [-93.2650, 44.9778],
  'cleveland': [-81.6944, 41.4993],
  'anaheim': [-117.9145, 33.8366],
  'irvine': [-117.8265, 33.6846],
  'cupertino': [-122.0322, 37.3230],
  'auburn': [-85.4808, 32.6099],
}
