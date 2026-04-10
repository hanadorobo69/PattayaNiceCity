"use client"

import { useEffect, useRef } from "react"

// Module-level Leaflet cache
let leafletPromise: Promise<any> | null = null
function getLeaflet(): Promise<any> {
  if (!leafletPromise) {
    leafletPromise = import("leaflet").then((L) => {
      // Fix Leaflet default icon issue in webpack/Next.js
      if (L.Icon?.Default?.prototype) {
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==",
          iconRetinaUrl: "",
          shadowUrl: "",
        })
      }
      return L
    }).catch((err) => {
      leafletPromise = null
      throw err
    })
  }
  return leafletPromise
}

const FREELANCE_ZONE_COLORS: Record<string, string> = {
  "freelance": "#e8a840",
  "ladyboy-freelance": "#a855f7",
  "gay-freelance": "#3b82f6",
}
const FREELANCE_SLUGS = new Set(Object.keys(FREELANCE_ZONE_COLORS))

interface VenueMapProps {
  lat: number
  lng: number
  name: string
  locale?: string
  categorySlug?: string
  categoryColor?: string
  geometryType?: string | null
  geometryPath?: string | null
  areaRadius?: number | null
  widthHintMeters?: number | null
}

export function VenueMap({ lat, lng, name, locale = "en", categorySlug, categoryColor, geometryType, geometryPath, areaRadius, widthHintMeters }: VenueMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let cancelled = false

    getLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return

      // Wait for container to have dimensions before initializing
      const container = containerRef.current
      if (container.clientWidth === 0 || container.clientHeight === 0) {
        const ro = new ResizeObserver((entries) => {
          const rect = entries[0]?.contentRect
          if (rect && rect.width > 0 && rect.height > 0) {
            ro.disconnect()
            if (!cancelled && containerRef.current && !mapRef.current) initMap(L)
          }
        })
        ro.observe(container)
        return
      }

      initMap(L)
    })

    function initMap(L: any) {
      if (cancelled || !containerRef.current || mapRef.current) return

      function createButterflyIcon(size = 34) {
        const half = Math.round(size / 2)
        return L.divIcon({
          className: "",
          iconSize: [size, size],
          iconAnchor: [half, size],
          html: `<div style="
            width:${size}px;height:${size}px;
            display:flex;align-items:center;justify-content:center;
            font-size:${Math.round(size * 0.6)}px;
            background:rgba(59,130,246,0.15);
            border:2px solid rgba(59,130,246,0.5);
            border-radius:50%;
            box-shadow:0 0 10px rgba(59,130,246,0.4);
          ">🦋</div>`,
        })
      }

      const isFreelance = categorySlug && FREELANCE_SLUGS.has(categorySlug)
      const zoneColor = (categorySlug && FREELANCE_ZONE_COLORS[categorySlug]) || categoryColor || "#e8a840"
      const geoType = geometryType || (areaRadius && areaRadius > 0 ? "circle" : null)

      const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0
      const map = L.map(containerRef.current!, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
        dragging: !isTouchDevice,
        scrollWheelZoom: !isTouchDevice,
        touchZoom: true,
      })

      // Show overlay hint on single-finger touch
      if (isTouchDevice) {
        const overlay = document.createElement("div")
        overlay.textContent = "Use two fingers to move the map"
        Object.assign(overlay.style, {
          position: "absolute", inset: "0", zIndex: "999",
          display: "none", alignItems: "center", justifyContent: "center",
          background: "rgba(26,21,16,0.7)", color: "#fff",
          fontSize: "14px", fontWeight: "600", pointerEvents: "none",
          borderRadius: "inherit",
        })
        containerRef.current!.style.position = "relative"
        containerRef.current!.appendChild(overlay)
        let hideTimer: ReturnType<typeof setTimeout>
        containerRef.current!.addEventListener("touchstart", (e) => {
          if (e.touches.length === 1) {
            overlay.style.display = "flex"
            clearTimeout(hideTimer)
            hideTimer = setTimeout(() => { overlay.style.display = "none" }, 1500)
          }
        }, { passive: true })
        containerRef.current!.addEventListener("touchend", () => {
          clearTimeout(hideTimer)
          hideTimer = setTimeout(() => { overlay.style.display = "none" }, 800)
        }, { passive: true })
      }

      const tileLayer = L.tileLayer(
        "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=" + locale,
        { subdomains: ["0", "1", "2", "3"], maxZoom: 20, errorTileUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==" }
      ).addTo(map)
      tileLayer.on("tileerror", (e: any) => {
        const tile = e.tile; const src = tile?.src
        if (src && !tile._retried) { tile._retried = true; setTimeout(() => { tile.src = src }, 2000) }
      })
      map.whenReady(() => { requestAnimationFrame(() => map.invalidateSize()) })

      // Draw geometry for freelance zones
      const boundsPoints: [number, number][] = [[lat, lng]]

      if (geoType === "circle" && areaRadius && areaRadius > 0) {
        L.circle([lat, lng], {
          radius: areaRadius,
          color: zoneColor,
          fillColor: zoneColor,
          fillOpacity: 0.12,
          weight: 2,
          opacity: 0.5,
          dashArray: "6 4",
        }).addTo(map)
        const r = areaRadius / 111320
        boundsPoints.push([lat + r, lng], [lat - r, lng], [lat, lng + r], [lat, lng - r])
      } else if (geoType === "polyline" && geometryPath) {
        try {
          const path = JSON.parse(geometryPath) as [number, number][]
          if (path.length >= 2) {
            L.polyline(path, {
              color: zoneColor,
              weight: 4,
              opacity: 0.8,
              dashArray: "8 6",
            }).addTo(map)
            const width = widthHintMeters || 30
            L.polyline(path, {
              color: zoneColor,
              weight: Math.max(8, width / 3),
              opacity: 0.15,
              lineCap: "round",
              lineJoin: "round",
            }).addTo(map)
            for (const p of path) boundsPoints.push(p)
          }
        } catch {}
      } else if (geoType === "polygon" && geometryPath) {
        try {
          const path = JSON.parse(geometryPath) as [number, number][]
          if (path.length >= 3) {
            L.polygon(path, {
              color: zoneColor,
              fillColor: zoneColor,
              fillOpacity: 0.12,
              weight: 2,
              opacity: 0.6,
              dashArray: "6 4",
            }).addTo(map)
            for (const p of path) boundsPoints.push(p)
          }
        } catch {}
      }

      // Marker - butterfly for freelance, pin for others
      if (isFreelance) {
        L.marker([lat, lng], { icon: createButterflyIcon(36) })
          .addTo(map)
          .bindTooltip(name, { direction: "top", offset: [0, -20] })
      } else {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:32px;height:32px;background:rgba(232,168,64,0.9);border:2px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center"><svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="rgba(232,168,64,0.9)" stroke="rgba(232,168,64,0.9)"/></svg></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        })
        L.marker([lat, lng], { icon }).addTo(map).bindTooltip(name, { direction: "top", offset: [0, -34] })
      }

      // Fit bounds to show full geometry
      if (boundsPoints.length > 1) {
        map.fitBounds(L.latLngBounds(boundsPoints), { padding: [40, 40], maxZoom: 14 })
      }

      mapRef.current = map
      requestAnimationFrame(() => { map.invalidateSize() })
    }

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [lat, lng, name, locale, categorySlug, categoryColor, geometryType, geometryPath, areaRadius, widthHintMeters])

  // ResizeObserver to keep Leaflet in sync with container size changes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => { mapRef.current?.invalidateSize() })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return <div ref={containerRef} className="w-full h-[280px] md:h-[300px]" />
}
