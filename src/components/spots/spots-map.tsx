"use client"

import { useEffect, useRef, useCallback } from "react"

export interface MapVenue {
  id: string
  slug: string
  name: string
  imageUrl: string | null
  categoryName: string
  categorySlug?: string
  categoryIcon: string | null
  categoryColor: string
  avgRating: number | null
  ratingCount: number
  priceRange: string | null
  district: string | null
  lat: number | null
  lng: number | null
  areaRadius?: number | null
  geometryType?: string | null
  geometryPath?: string | null
  widthHintMeters?: number | null
}

const FREELANCE_ZONE_COLORS: Record<string, string> = {
  "freelance": "#e8a840",
  "ladyboy-freelance": "#a855f7",
  "gay-freelance": "#3b82f6",
}
const FREELANCE_SLUGS = new Set(Object.keys(FREELANCE_ZONE_COLORS))

interface SpotsMapProps {
  venues: MapVenue[]
  locale?: string
  highlightedId?: string | null
  onSpotClick?: (venue: MapVenue) => void
  /** On mobile, clustering is automatic based on viewport marker count */
  mobile?: boolean
}

const PATTAYA_CENTER: [number, number] = [12.9336, 100.8825]
const ZOOM_CITY = 13
// Zoom level at which clusters dissolve into individual markers
const DISABLE_CLUSTERING_ZOOM = 16

// Module-level Leaflet cache
let leafletPromise: Promise<any> | null = null
function getLeaflet(): Promise<any> {
  if (!leafletPromise) {
    leafletPromise = import("leaflet").then(async (L) => {
      if (L.Icon?.Default?.prototype) {
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==",
          iconRetinaUrl: "",
          shadowUrl: "",
        })
      }
      // Make L available globally for markercluster plugin
      ;(window as any).L = L
      await import("leaflet.markercluster")
      return L
    }).catch((err) => {
      leafletPromise = null
      throw err
    })
  }
  return leafletPromise
}

const geoCache = new Map<string, [number, number][]>()
function parseGeometry(path: string): [number, number][] {
  let parsed = geoCache.get(path)
  if (!parsed) {
    try { parsed = JSON.parse(path) as [number, number][] } catch { parsed = [] }
    geoCache.set(path, parsed)
  }
  return parsed
}

function buildPopupHtml(venue: MapVenue, locale: string): string {
  const img = venue.imageUrl
    ? `<img src="${venue.imageUrl}" alt="${venue.name}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:32px;opacity:0.3;background:rgba(36,28,20,0.9);">${venue.categoryIcon || "📍"}</div>`
  const rating = venue.avgRating
    ? `<div style="display:flex;align-items:center;gap:4px;"><span style="color:#ff9f43;font-size:12px;">⭐</span><span style="font-size:13px;font-weight:700;color:#ff9f43;">${venue.avgRating}</span><span style="font-size:11px;color:#888;">(${venue.ratingCount})</span></div>`
    : `<span style="font-size:11px;color:#666;">No ratings yet</span>`
  const price = venue.priceRange
    ? `<span style="padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700;color:#3db8a0;background:rgba(61,184,160,0.12);border:1px solid rgba(61,184,160,0.30);">${venue.priceRange}</span>`
    : ""
  return `<a href="/${locale}/places/${venue.slug}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;color:inherit;width:240px;cursor:pointer;" class="pvc-popup-card"><div style="width:100%;height:140px;border-radius:10px 10px 0 0;overflow:hidden;background:rgba(36,28,20,0.9);">${img}</div><div style="padding:10px 12px 12px;"><div style="font-weight:600;font-size:14px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${venue.name}</div><div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap;"><span style="padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:500;background:${venue.categoryColor}30;color:${venue.categoryColor};border:1px solid ${venue.categoryColor}40;">${venue.categoryName}</span>${price}</div><div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">${rating}<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#666" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></div></div></a>`
}

function collectVenuePoints(v: MapVenue): [number, number][] {
  const pts: [number, number][] = [[v.lat!, v.lng!]]
  if (v.geometryPath) for (const p of parseGeometry(v.geometryPath)) pts.push(p)
  if (v.areaRadius && v.areaRadius > 0) {
    const r = v.areaRadius / 111320
    pts.push([v.lat! + r, v.lng!], [v.lat! - r, v.lng!], [v.lat!, v.lng! + r], [v.lat!, v.lng! - r])
  }
  return pts
}

export function SpotsMap({ venues, locale = "en", highlightedId, onSpotClick, mobile = false }: SpotsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerLayerRef = useRef<any>(null)
  const circlesRef = useRef<any>(null)
  const markerMapRef = useRef<Map<string, { marker: any; venue: MapVenue }>>(new Map())
  const prevHighlightRef = useRef<string | null>(null)
  const LRef = useRef<any>(null)
  const getVenueIconRef = useRef<((venue: MapVenue, highlighted?: boolean) => any) | null>(null)
  const venuesRef = useRef(venues)
  venuesRef.current = venues
  const localeRef = useRef(locale)
  localeRef.current = locale
  const onSpotClickRef = useRef(onSpotClick)
  onSpotClickRef.current = onSpotClick
  const mobileRef = useRef(mobile)
  mobileRef.current = mobile

  const drawGeometry = useCallback((L: any, circles: any, venuesToDraw: MapVenue[]) => {
    circles.clearLayers()
    for (const venue of venuesToDraw) {
      if (!venue.lat || !venue.lng) continue
      const zoneColor = (venue.categorySlug && FREELANCE_ZONE_COLORS[venue.categorySlug]) || venue.categoryColor || "#e8a840"
      const geoType = venue.geometryType || (venue.areaRadius ? "circle" : null)
      if (!geoType) continue
      if (geoType === "circle" && venue.areaRadius && venue.areaRadius > 0) {
        circles.addLayer(L.circle([venue.lat, venue.lng], { radius: venue.areaRadius, color: zoneColor, fillColor: zoneColor, fillOpacity: 0.12, weight: 2, opacity: 0.5, dashArray: "6 4" }).bindTooltip(venue.name, { sticky: true, className: "pvc-zone-tooltip" }))
      } else if (geoType === "polyline" && venue.geometryPath) {
        const path = parseGeometry(venue.geometryPath)
        if (path.length >= 2) {
          circles.addLayer(L.polyline(path, { color: zoneColor, weight: 4, opacity: 0.8, dashArray: "8 6" }).bindTooltip(venue.name, { sticky: true, className: "pvc-zone-tooltip" }))
          circles.addLayer(L.polyline(path, { color: zoneColor, weight: Math.max(8, (venue.widthHintMeters || 30) / 3), opacity: 0.15, lineCap: "round", lineJoin: "round" }))
        }
      } else if (geoType === "polygon" && venue.geometryPath) {
        const path = parseGeometry(venue.geometryPath)
        if (path.length >= 3) {
          circles.addLayer(L.polygon(path, { color: zoneColor, fillColor: zoneColor, fillOpacity: 0.12, weight: 2, opacity: 0.6, dashArray: "6 4" }).bindTooltip(venue.name, { sticky: true, className: "pvc-zone-tooltip" }))
        }
      }
    }
  }, [])

  const createMarker = useCallback((L: any, venue: MapVenue, getVenueIcon: (v: MapVenue, h?: boolean) => any, loc: string) => {
    const marker = L.marker([venue.lat!, venue.lng!], { icon: getVenueIcon(venue) })
    let popupBound = false
    marker.on("click", () => {
      if (!popupBound) {
        marker.bindPopup(L.popup({ className: "pvc-map-popup", closeButton: true, maxWidth: 260, minWidth: 180, offset: [0, -2], autoPan: true, autoPanPadding: [20, 20] }).setContent(buildPopupHtml(venue, loc)))
        popupBound = true
        marker.openPopup()
      }
      onSpotClickRef.current?.(venue)
    })
    return marker
  }, [])

  // Create a MarkerClusterGroup for mobile with real positions at high zoom
  const createClusterGroup = useCallback((L: any) => {
    const mcg = (L.markerClusterGroup || L.MarkerClusterGroup)
    if (!mcg) {
      console.warn("[SpotsMap] MarkerClusterGroup not available, falling back to layerGroup")
      return L.layerGroup()
    }
    return mcg({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: false,
      disableClusteringAtZoom: DISABLE_CLUSTERING_ZOOM,
      chunkedLoading: true,
      chunkInterval: 100,
      chunkDelay: 20,
      animate: false,
      removeOutsideVisibleBounds: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount()
        const size = count < 20 ? 36 : count < 50 ? 44 : 52
        return L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:rgba(232,168,64,0.85);border:2px solid rgba(255,255,255,0.9);border-radius:50%;color:white;font-weight:700;font-size:${size < 40 ? 13 : 15}px;box-shadow:0 2px 8px rgba(232,168,64,0.4);">${count}</div>`,
          className: "",
          iconSize: [size, size],
        })
      },
    })
  }, [])

  // ── Initialize map once ──
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    let cancelled = false
    let resizeObserver: ResizeObserver | null = null

    function initMap(L: any) {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return
      LRef.current = L

      const iconCache = new Map<string, any>()
      function makeMarkerIcon(color: string, highlighted = false) {
        const key = `m-${color}-${highlighted ? 1 : 0}`
        let icon = iconCache.get(key)
        if (icon) return icon
        const s = highlighted ? 38 : 28, a = highlighted ? 19 : 14, d = highlighted ? 14 : 10
        icon = L.divIcon({
          className: "", iconSize: [s, s], iconAnchor: [a, s], popupAnchor: [0, -s + 2],
          html: `<div style="width:${s}px;height:${s}px;background:${highlighted ? "#e8a840" : color};border:${highlighted ? "3px" : "2px"} solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 1px 3px rgba(0,0,0,0.4);"><div style="width:${d}px;height:${d}px;background:white;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);"></div></div>`,
        })
        iconCache.set(key, icon)
        return icon
      }
      function makeButterflyIcon(highlighted = false) {
        const key = `b-${highlighted ? 1 : 0}`
        let icon = iconCache.get(key)
        if (icon) return icon
        const s = highlighted ? 40 : 32, h = Math.round(s / 2)
        icon = L.divIcon({
          className: "", iconSize: [s, s], iconAnchor: [h, s], popupAnchor: [0, -s + 4],
          html: `<div style="width:${s}px;height:${s}px;display:flex;align-items:center;justify-content:center;font-size:${highlighted ? 26 : 20}px;background:rgba(59,130,246,${highlighted ? 0.25 : 0.15});border:2px solid rgba(59,130,246,${highlighted ? 0.8 : 0.5});border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.4);">🦋</div>`,
        })
        iconCache.set(key, icon)
        return icon
      }
      function getVenueIcon(venue: MapVenue, highlighted = false) {
        return (venue.categorySlug && FREELANCE_SLUGS.has(venue.categorySlug))
          ? makeButterflyIcon(highlighted) : makeMarkerIcon(venue.categoryColor || "#e8a840", highlighted)
      }
      getVenueIconRef.current = getVenueIcon

      const valid = venuesRef.current.filter(v => v.lat && v.lng)
      const isMobile = mobileRef.current
      const initialZoom = isMobile ? ZOOM_CITY : 14

      const map = L.map(mapRef.current!, {
        center: PATTAYA_CENTER,
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
        touchZoom: true,
      })
      L.control.zoom({ position: "bottomright" }).addTo(map)

      // Google Maps tiles
      const tileLayer = L.tileLayer(
        "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=" + localeRef.current,
        { subdomains: ["0", "1", "2", "3"], maxZoom: 20, errorTileUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==" }
      ).addTo(map)
      tileLayer.on("tileerror", (e: any) => {
        const tile = e.tile; const src = tile?.src
        if (src && !tile._retried) { tile._retried = true; setTimeout(() => { tile.src = src }, 2000) }
      })

      const circles = L.layerGroup().addTo(map)
      // Mobile: use MarkerClusterGroup; Desktop: plain layerGroup
      const markerLayer = isMobile ? createClusterGroup(L) : L.layerGroup()
      markerLayer.addTo(map)

      mapInstanceRef.current = map
      markerLayerRef.current = markerLayer
      circlesRef.current = circles

      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize()
      })
      resizeObserver.observe(mapRef.current!)

      map.whenReady(() => {
        if (cancelled) return
        map.invalidateSize()
        drawGeometry(L, circles, venuesRef.current)

        // Add all markers - MarkerClusterGroup handles perf on mobile
        const loc = localeRef.current
        for (const v of valid) {
          const marker = createMarker(L, v, getVenueIcon, loc)
          markerMapRef.current.set(v.id, { marker, venue: v })
          markerLayer.addLayer(marker)
        }

        if (!isMobile && valid.length > 0) {
          const pts: [number, number][] = []
          for (const v of valid) for (const p of collectVenuePoints(v)) pts.push(p)
          map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] })
        }
      })

      requestAnimationFrame(() => { map.invalidateSize() })
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize() }, 300)
    }

    getLeaflet().then((L) => {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return
      const c = mapRef.current
      if (c.clientWidth === 0 || c.clientHeight === 0) {
        const ro = new ResizeObserver((entries) => {
          const rect = entries[0]?.contentRect
          if (rect && rect.width > 0 && rect.height > 0) { ro.disconnect(); initMap(L) }
        })
        ro.observe(c)
        resizeObserver = ro
        return
      }
      initMap(L)
    }).catch((err) => console.error("[SpotsMap] load failed:", err))

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerLayerRef.current = null
        circlesRef.current = null
        markerMapRef.current.clear()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Update when venues change ──
  useEffect(() => {
    const map = mapInstanceRef.current
    const L = LRef.current
    const circles = circlesRef.current
    const getVenueIcon = getVenueIconRef.current
    if (!map || !L || !circles || !getVenueIcon) return

    // Rebuild marker layer - always use clustering on mobile for perf
    const oldLayer = markerLayerRef.current
    if (oldLayer) {
      oldLayer.clearLayers()
      map.removeLayer(oldLayer)
    }
    const newLayer = mobile ? createClusterGroup(L) : L.layerGroup()
    newLayer.addTo(map)
    markerLayerRef.current = newLayer

    drawGeometry(L, circles, venues)

    markerMapRef.current.clear()
    const valid = venues.filter(v => v.lat && v.lng)
    const loc = localeRef.current
    for (const v of valid) {
      const marker = createMarker(L, v, getVenueIcon, loc)
      markerMapRef.current.set(v.id, { marker, venue: v })
      newLayer.addLayer(marker)
    }
    if (valid.length > 0 && !mobile) {
      const pts: [number, number][] = []
      for (const v of valid) for (const p of collectVenuePoints(v)) pts.push(p)
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], animate: true })
    }

    requestAnimationFrame(() => map.invalidateSize())
  }, [venues, locale, mobile, drawGeometry, createMarker, createClusterGroup])

  // ── Highlight ──
  useEffect(() => {
    const map = mapInstanceRef.current
    const getVenueIcon = getVenueIconRef.current
    if (!map || !getVenueIcon) return
    const entries = markerMapRef.current
    const prevId = prevHighlightRef.current
    if (prevId && prevId !== highlightedId) {
      const prev = entries.get(prevId)
      if (prev) { prev.marker.setIcon(getVenueIcon(prev.venue, false)); prev.marker.setZIndexOffset(0) }
    }
    if (highlightedId) {
      const entry = entries.get(highlightedId)
      if (entry) { entry.marker.setIcon(getVenueIcon(entry.venue, true)); entry.marker.setZIndexOffset(1000); entry.marker.openPopup() }
    } else if (prevId) {
      map.closePopup()
    }
    prevHighlightRef.current = highlightedId || null
  }, [highlightedId])

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden border border-[rgba(232,168,64,0.15)]">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  )
}
