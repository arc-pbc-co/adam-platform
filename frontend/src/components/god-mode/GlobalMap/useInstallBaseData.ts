/**
 * Hook for loading and geocoding install base data
 */

import { useState, useEffect, useMemo } from 'react'
import type { Site } from './types'
import { STATE_COORDS, CITY_COORDS } from './types'

interface UseInstallBaseDataReturn {
  sites: Site[]
  loading: boolean
  error: Error | null
}

// Extended site type that may have latitude/longitude from JSON
interface RawSite extends Omit<Site, 'lat' | 'lng'> {
  latitude?: number
  longitude?: number
  lat?: number
  lng?: number
}

// Geocode a site based on city/state or use existing coordinates
function geocodeSite(rawSite: RawSite): Site {
  const site = rawSite as Site

  // If site already has coordinates from JSON (latitude/longitude), use them
  if (rawSite.latitude && rawSite.longitude) {
    return { ...site, lat: rawSite.latitude, lng: rawSite.longitude }
  }

  // If site already has lat/lng, return as is
  if (site.lat && site.lng) {
    return site
  }

  // Try city-specific coordinates first
  const cityKey = site.city.toLowerCase()
  if (CITY_COORDS[cityKey]) {
    const [lng, lat] = CITY_COORDS[cityKey]
    return { ...site, lat, lng }
  }

  // Fall back to state centroid with jitter
  const stateCoords = STATE_COORDS[site.state]
  if (stateCoords) {
    const [lng, lat] = stateCoords
    // Add small random offset to prevent overlap
    const jitter = () => (Math.random() - 0.5) * 2
    return {
      ...site,
      lat: lat + jitter(),
      lng: lng + jitter(),
    }
  }

  // Default to center of US if no match
  return {
    ...site,
    lat: 39.8283 + (Math.random() - 0.5) * 2,
    lng: -98.5795 + (Math.random() - 0.5) * 2,
  }
}

export function useInstallBaseData(url: string): UseInstallBaseDataReturn {
  const [rawSites, setRawSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`)
        }
        const data = await response.json()
        // Handle both { sites: [...] } and flat array formats
        const sites = Array.isArray(data) ? data : (data.sites || [])
        setRawSites(sites)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [url])

  // Geocode all sites
  const sites = useMemo(() => {
    return rawSites
      .filter((site) => site.country === 'US') // Only US sites for now
      .map(geocodeSite)
  }, [rawSites])

  return { sites, loading, error }
}

export default useInstallBaseData
