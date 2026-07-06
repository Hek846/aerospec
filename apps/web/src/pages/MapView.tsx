import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '../lib/api';
import { useHomes } from '../hooks/useData';
import { MapCell, OpenAQStation } from '../types';
import './MapView.css';

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

function aqiColor(aqi: number | null): string {
  if (aqi === null) return '#9ca3af';
  if (aqi <= 50) return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#a855f7';
  return '#7f1d1d';
}

export function MapView() {
  const homes = useHomes();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [showAeroSpec, setShowAeroSpec] = useState(true);
  const [showOpenAQ, setShowOpenAQ] = useState(true);
  const [cells, setCells] = useState<MapCell[]>([]);
  const [stations, setStations] = useState<OpenAQStation[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    const bbox = [
      bounds.getWest().toFixed(4),
      bounds.getSouth().toFixed(4),
      bounds.getEast().toFixed(4),
      bounds.getNorth().toFixed(4),
    ].join(',');

    setLoading(true);
    const [cellsResult, stationsResult] = await Promise.allSettled([
      api.getMapCells(bbox, 24),
      api.getOpenAQLatest(bbox),
    ]);
    setLoading(false);

    if (cellsResult.status === 'fulfilled') {
      setCells(cellsResult.value.cells as MapCell[]);
    }
    if (stationsResult.status === 'fulfilled') {
      setStations(stationsResult.value.stations as OpenAQStation[]);
    }
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: OSM_STYLE,
      center: [-122.3053, 47.8279], // Lynnwood, WA default
      zoom: 10,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const debouncedLoad = () => {
      clearTimeout(timer);
      timer = setTimeout(loadData, 400);
    };

    map.on('load', loadData);
    map.on('moveend', debouncedLoad);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, [loadData]);

  // Recenter on the user's first home once homes load
  useEffect(() => {
    const home = homes[0];
    if (home && mapRef.current && home.location) {
      mapRef.current.setCenter([home.location.lon, home.location.lat]);
    }
  }, [homes]);

  // Render markers whenever data or layer toggles change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (showAeroSpec) {
      for (const cell of cells) {
        const el = document.createElement('div');
        el.className = 'map-marker map-marker--cell';
        el.style.backgroundColor = aqiColor(cell.avgAqi);
        el.textContent = cell.avgAqi !== null ? String(Math.round(cell.avgAqi)) : '?';

        const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
          `<div class="map-popup">
            <strong>AeroSpec area</strong><br/>
            ${cell.deviceCount} device${cell.deviceCount === 1 ? '' : 's'}<br/>
            Avg AQI: ${cell.avgAqi !== null ? Math.round(cell.avgAqi) : '—'}<br/>
            Avg PM2.5: ${cell.avgPm25 !== null ? cell.avgPm25.toFixed(1) + ' µg/m³' : '—'}
          </div>`
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([cell.lon, cell.lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      }
    }

    if (showOpenAQ) {
      for (const station of stations) {
        const el = document.createElement('div');
        el.className = 'map-marker map-marker--station';
        el.style.borderColor = aqiColor(station.aqi);

        const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
          `<div class="map-popup">
            <strong>${station.name}</strong><br/>
            OpenAQ public station<br/>
            PM2.5: ${station.pm25 !== null ? station.pm25.toFixed(1) + ' µg/m³' : '—'}<br/>
            AQI: ${station.aqi !== null ? Math.round(station.aqi) : '—'}
          </div>`
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([station.lon, station.lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      }
    }
  }, [cells, stations, showAeroSpec, showOpenAQ]);

  return (
    <div className="map-view">
      <header className="map-header">
        <div>
          <h1>Regional Map</h1>
          <p className="map-subtitle">
            Crowd-sourced AeroSpec readings (aggregated by area for privacy) and OpenAQ public stations
          </p>
        </div>
        <div className="map-controls">
          <label className="map-toggle">
            <input
              type="checkbox"
              checked={showAeroSpec}
              onChange={e => setShowAeroSpec(e.target.checked)}
            />
            AeroSpec sensors ({cells.length})
          </label>
          <label className="map-toggle">
            <input
              type="checkbox"
              checked={showOpenAQ}
              onChange={e => setShowOpenAQ(e.target.checked)}
            />
            OpenAQ stations ({stations.length})
          </label>
          {loading && <span className="map-loading-indicator">Updating…</span>}
        </div>
      </header>

      <div ref={mapContainer} className="map-canvas" />

      <div className="map-legend">
        <span className="legend-title">AQI</span>
        <span className="legend-chip" style={{ background: '#22c55e' }}>0-50</span>
        <span className="legend-chip" style={{ background: '#eab308' }}>51-100</span>
        <span className="legend-chip" style={{ background: '#f97316' }}>101-150</span>
        <span className="legend-chip" style={{ background: '#ef4444' }}>151-200</span>
        <span className="legend-chip" style={{ background: '#a855f7' }}>201-300</span>
        <span className="legend-chip" style={{ background: '#7f1d1d' }}>300+</span>
        <span className="legend-note">● filled = AeroSpec area avg, ○ ring = OpenAQ station</span>
      </div>
    </div>
  );
}
