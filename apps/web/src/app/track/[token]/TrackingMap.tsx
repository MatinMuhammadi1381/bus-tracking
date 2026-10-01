'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TrackingMapProps {
  tripData: any;
  locationStatus: string;
  token: string;
}

const iranCities: Record<string, [number, number]> = {
  تهران: [35.6892, 51.389],
  مشهد: [36.2605, 59.6168],
  اصفهان: [32.6546, 51.668],
  شیراز: [29.5918, 52.5837],
  تبریز: [38.0962, 46.2738],
  کرج: [35.84, 50.9391],
  قم: [34.6399, 50.8759],
  اهواز: [31.3183, 48.6706],
  رشت: [37.2808, 49.5832],
  کرمان: [30.2839, 57.0834],
  یزد: [31.8974, 54.3569],
  بندرعباس: [27.1832, 56.2666],
  ارومیه: [37.5527, 45.0761],
  همدان: [34.7988, 48.515],
  سنندج: [35.3219, 46.9862],
  زاهدان: [29.4963, 60.8629],
  ساری: [36.5659, 53.0586],
  گرگان: [36.8456, 54.4393],
  اردبیل: [38.2498, 48.2933],
  قزوین: [36.2688, 50.0041],
  بوشهر: [28.9234, 50.8203],
  اراک: [34.0917, 49.6892],
};

function cityCoordinates(name: unknown): [number, number] | null {
  const normalized = String(name || '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s*(شهرستان|شهر)\s*/g, '')
    .trim();
  return iranCities[normalized] || null;
}

function routeCoordinates(tripData: any): [number, number][] {
  const geometry = tripData.route?.geometry?.coordinates;
  if (Array.isArray(geometry) && geometry.length >= 2) {
    return geometry.map((coord: number[]) => [coord[1], coord[0]]);
  }
  const origin = cityCoordinates(tripData.origin);
  const destination = cityCoordinates(tripData.destination);
  return origin && destination ? [origin, destination] : [];
}

function TrackingMap({
  tripData,
  locationStatus,
  token,
}: {
  tripData: any;
  locationStatus: string;
  token: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapRefLeaflet = useRef<L.Map | null>(null);
  const tileProviderIndex = useRef(0);
  const markersRef = useRef<{ bus: L.Marker | null; route: L.Polyline | null }>({
    bus: null,
    route: null,
  });
  const [mapReady, setMapReady] = useState(false);

  // Default icons
  const busIcon = L.divIcon({
    className: 'bus-marker',
    html: '<div style="width:30px;height:30px;border-radius:50%;background:#2563eb;border:4px solid white;box-shadow:0 2px 8px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;color:white;font-size:16px">●</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });

  const startIcon = L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background: #22c55e; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  const endIcon = L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  useEffect(() => {
    if (!mapRef.current || mapRefLeaflet.current) return;

    // Initialize map
    const map = L.map(mapRef.current!, {
      center: [35.6892, 51.389], // Default to Tehran
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
    });

    mapRefLeaflet.current = map;

    const providers = [
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    ];
    const addTiles = () => {
      const tiles = L.tileLayer(providers[tileProviderIndex.current], {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      const normalizeTileSize = (tile: HTMLImageElement) => {
        tile.style.width = '256px';
        tile.style.height = '256px';
        tile.style.maxWidth = 'none';
        tile.style.maxHeight = 'none';
      };
      tiles.on('tileload', event => normalizeTileSize(event.tile));
      tiles.once('tileerror', () => {
        if (tileProviderIndex.current >= providers.length - 1) return;
        tileProviderIndex.current += 1;
        map.removeLayer(tiles);
        addTiles();
      });
    };
    addTiles();

    setMapReady(true);
    const invalidateMapSize = () => map.invalidateSize({ pan: false });
    window.requestAnimationFrame(invalidateMapSize);
    const resizeTimer = window.setTimeout(invalidateMapSize, 150);
    const resizeObserver = new ResizeObserver(invalidateMapSize);
    resizeObserver.observe(mapRef.current);

    return () => {
      window.clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      map.remove();
      mapRefLeaflet.current = null;
    };
  }, []);

  // Update map when trip data changes
  useEffect(() => {
    if (!mapRefLeaflet.current || !tripData) return;

    const map = mapRefLeaflet.current;

    const routeCoords = routeCoordinates(tripData);
    if (routeCoords.length >= 2) {
      if (markersRef.current.route) {
        map.removeLayer(markersRef.current.route);
      }

      markersRef.current.route = L.polyline(routeCoords, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10',
      }).addTo(map);

      // Add start/end markers
      if (routeCoords.length > 0) {
        L.marker(routeCoords[0], { icon: startIcon })
          .addTo(map)
          .bindPopup('مبدا: ' + tripData.origin);
        L.marker(routeCoords[routeCoords.length - 1], { icon: endIcon })
          .addTo(map)
          .bindPopup('مقصد: ' + tripData.destination);
      }
    }

    // Update bus marker
    if (tripData.currentLocation) {
      const lat = tripData.currentLocation.latitude;
      const lng = tripData.currentLocation.longitude;

      if (markersRef.current.bus) {
        markersRef.current.bus.setLatLng([lat, lng]);
      } else {
        markersRef.current.bus = L.marker([lat, lng], { icon: busIcon }).addTo(map).bindPopup(`
            <div style="text-align: center; padding: 5px;">
              <strong>${tripData.origin} → ${tripData.destination}</strong><br>
              سرعت: ${tripData.currentLocation?.speedKmh?.toFixed(1) || 0} km/h<br>
              دقت: ${tripData.currentLocation?.accuracyMeters?.toFixed(1) || '?'} m
            `);
      }

      // Center map on bus if status is LIVE
      if (locationStatus === 'LIVE') {
        map.setView([lat, lng], 13, { animate: true, duration: 1 });
      }
    }

    // Fit bounds to route on first load
    if (routeCoords.length >= 2) {
      const bounds = L.latLngBounds(routeCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [tripData, locationStatus]);

  if (!mapReady) {
    return (
      <div
        ref={mapRef}
        className="h-[420px] w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return <div ref={mapRef} className="h-[420px] w-full" />;
}

export default TrackingMap;
