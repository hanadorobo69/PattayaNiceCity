"use client"

import { useEffect, useRef } from "react"

interface DraggableMapProps {
  lat: number
  lng: number
  onMove: (lat: number, lng: number) => void
  locale?: string
}

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

export function DraggableMap({ lat, lng, onMove, locale = "en" }: DraggableMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    let cancelled = false

    getLeaflet().then((L) => {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return

      // Wait for container to have dimensions before initializing
      const container = mapRef.current
      if (container.clientWidth === 0 || container.clientHeight === 0) {
        const ro = new ResizeObserver((entries) => {
          const rect = entries[0]?.contentRect
          if (rect && rect.width > 0 && rect.height > 0) {
            ro.disconnect()
            if (!cancelled && mapRef.current && !mapInstanceRef.current) initMap(L)
          }
        })
        ro.observe(container)
        return
      }

      initMap(L)
    })

    function initMap(L: any) {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return

      const map = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 17,
        zoomControl: true,
        attributionControl: false,
      })

      const tileLayer = L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=" + locale, {
        maxZoom: 21, subdomains: ["0", "1", "2", "3"],
        errorTileUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==",
      }).addTo(map)
      tileLayer.on("tileerror", (e: any) => {
        const tile = e.tile; const src = tile?.src
        if (src && !tile._retried) { tile._retried = true; setTimeout(() => { tile.src = src }, 2000) }
      })
      map.whenReady(() => { requestAnimationFrame(() => map.invalidateSize()) })

      const icon = L.divIcon({
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        html: `<div style="width:32px;height:32px;background:#e8a840;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 0 15px #e8a840;cursor:grab;"><div style="width:12px;height:12px;background:white;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);"></div></div>`,
      })

      const marker = L.marker([lat, lng], { icon, draggable: true })
      marker.addTo(map)

      marker.on("dragend", () => {
        const pos = marker.getLatLng()
        onMoveRef.current(parseFloat(pos.lat.toFixed(7)), parseFloat(pos.lng.toFixed(7)))
      })

      mapInstanceRef.current = map
      markerRef.current = marker

      requestAnimationFrame(() => map.invalidateSize())
    }

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ResizeObserver to keep Leaflet in sync with container size changes
  useEffect(() => {
    const el = mapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => { mapInstanceRef.current?.invalidateSize() })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Update marker position when lat/lng props change (e.g. from geocoding)
  useEffect(() => {
    const map = mapInstanceRef.current
    const marker = markerRef.current
    if (!map || !marker) return
    marker.setLatLng([lat, lng])
    map.setView([lat, lng], map.getZoom())
  }, [lat, lng])

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">Drag the marker to adjust position</p>
      <div ref={mapRef} className="h-[280px] w-full rounded-lg" />
    </div>
  )
}
