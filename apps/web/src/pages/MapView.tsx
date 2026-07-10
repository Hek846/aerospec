import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useHomes } from '../hooks/useData';
import { MapCell, OpenAQStation } from '../types';
import './MapView.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const HEX_SOURCE_ID = 'aerospec-hex-cells';
const HEX_FILL_LAYER_ID = 'aerospec-hex-fill';
const HEX_LINE_LAYER_ID = 'aerospec-hex-line';
const HEX_LABEL_LAYER_ID = 'aerospec-hex-label';
const DATA_HOURS = 24;

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  // Required by any symbol layer using text-field (AQI hex labels)
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
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

type LngLatPair = [number, number];

type HexMapCell = MapCell & {
  h3?: string;
  resolution?: number;
  centerLat?: number;
  centerLon?: number;
  boundary?: LngLatPair[];
};

type MapCellsResponse = {
  cells: HexMapCell[];
  total: number;
  hours: number;
  resolution: number;
};

type OpenAQResponse = {
  stations: OpenAQStation[];
};

type HexFeatureProperties = {
  id: string;
  label: string;
  avgAqi: number | null;
  avgPm25: number | null;
  deviceCount: number;
  lastTs: string | null;
  updatedText: string;
};

type HexFeature = GeoJSON.Feature<GeoJSON.Polygon, HexFeatureProperties>;

type AqiTokenSet = {
  solid: string;
  soft: string;
  hover: string;
};

type MapTokens = {
  aqi: {
    unknown: AqiTokenSet;
    good: AqiTokenSet;
    moderate: AqiTokenSet;
    sensitive: AqiTokenSet;
    unhealthy: AqiTokenSet;
    veryUnhealthy: AqiTokenSet;
    hazardous: AqiTokenSet;
  };
  text: string;
  textInverse: string;
};

function cssVar(styles: CSSStyleDeclaration, name: string): string {
  return styles.getPropertyValue(name).trim();
}

function withStrongerAlpha(color: string): string {
  const rgba = color.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgba) return color;

  const parts = rgba[1].split(',').map(part => part.trim());
  const [red, green, blue] = parts;
  const alpha = parts[3] ? Number(parts[3]) : 1;
  const hoverAlpha = Math.min(1, alpha + 0.16);

  return `rgba(${red}, ${green}, ${blue}, ${hoverAlpha})`;
}

function readMapTokens(): MapTokens {
  const styles = getComputedStyle(document.documentElement);

  const set = (solidVar: string, softVar: string): AqiTokenSet => {
    const solid = cssVar(styles, solidVar);
    const soft = cssVar(styles, softVar);

    return {
      solid,
      soft,
      hover: withStrongerAlpha(soft),
    };
  };

  const unknown = set('--color-gray-400', '--chip-bg');

  return {
    aqi: {
      unknown,
      good: set('--color-aqi-good', '--color-aqi-good-soft'),
      moderate: set('--color-aqi-moderate', '--color-aqi-moderate-soft'),
      sensitive: set('--color-aqi-sensitive', '--color-aqi-sensitive-soft'),
      unhealthy: set('--color-aqi-unhealthy', '--color-aqi-unhealthy-soft'),
      veryUnhealthy: set('--color-aqi-very-unhealthy', '--color-aqi-very-unhealthy-soft'),
      hazardous: set('--color-aqi-hazardous', '--color-aqi-hazardous-soft'),
    },
    text: cssVar(styles, '--color-text-primary'),
    textInverse: cssVar(styles, '--color-text-inverse'),
  };
}

function aqiTokenForValue(tokens: MapTokens, aqi: number | null): AqiTokenSet {
  if (aqi === null) return tokens.aqi.unknown;
  if (aqi <= 50) return tokens.aqi.good;
  if (aqi <= 100) return tokens.aqi.moderate;
  if (aqi <= 150) return tokens.aqi.sensitive;
  if (aqi <= 200) return tokens.aqi.unhealthy;
  if (aqi <= 300) return tokens.aqi.veryUnhealthy;
  return tokens.aqi.hazardous;
}

function aqiBandClass(aqi: number | null): string {
  if (aqi === null) return 'unknown';
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'very-unhealthy';
  return 'hazardous';
}

function aqiStepExpression(tokens: MapTokens, colorKey: keyof AqiTokenSet): maplibregl.ExpressionSpecification {
  const aqiValue: maplibregl.ExpressionSpecification = ['coalesce', ['get', 'avgAqi'], -1];

  return [
    'step',
    aqiValue,
    tokens.aqi.unknown[colorKey],
    0,
    tokens.aqi.good[colorKey],
    51,
    tokens.aqi.moderate[colorKey],
    101,
    tokens.aqi.sensitive[colorKey],
    151,
    tokens.aqi.unhealthy[colorKey],
    201,
    tokens.aqi.veryUnhealthy[colorKey],
    301,
    tokens.aqi.hazardous[colorKey],
  ];
}

function closeBoundary(boundary: LngLatPair[]): LngLatPair[] {
  if (boundary.length === 0) return boundary;

  const first = boundary[0];
  const last = boundary[boundary.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return boundary;

  return [...boundary, first];
}

function relativeTime(timestamp: string | null): string {
  if (!timestamp) return 'No recent update';

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'No recent update';

  return formatDistanceToNow(date, { addSuffix: true });
}

function formatAqi(aqi: number | null): string {
  return aqi === null ? '—' : String(Math.round(aqi));
}

function formatPm25(pm25: number | null): string {
  return pm25 === null ? '—' : `${pm25.toFixed(1)} µg/m³`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMetric(label: string, value: string): string {
  return `
    <div class="map-popup__metric">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function renderCellPopup(properties: HexFeatureProperties): string {
  const aqi = properties.avgAqi;

  return `
    <div class="map-popup">
      <div class="map-popup__header">
        <strong>AeroSpec area</strong>
        <span class="map-popup__badge map-popup__badge--${aqiBandClass(aqi)}">AQI ${formatAqi(aqi)}</span>
      </div>
      <div class="map-popup__metrics">
        ${renderMetric('Avg PM2.5', formatPm25(properties.avgPm25))}
        ${renderMetric('Devices', String(properties.deviceCount))}
      </div>
      <p class="map-popup__updated">Updated ${escapeHtml(properties.updatedText)}</p>
    </div>
  `;
}

function renderStationPopup(station: OpenAQStation): string {
  return `
    <div class="map-popup">
      <div class="map-popup__header">
        <strong>${escapeHtml(station.name)}</strong>
        <span class="map-popup__badge map-popup__badge--${aqiBandClass(station.aqi)}">AQI ${formatAqi(station.aqi)}</span>
      </div>
      <div class="map-popup__eyebrow">OpenAQ public station</div>
      <div class="map-popup__metrics">
        ${renderMetric('PM2.5', formatPm25(station.pm25))}
      </div>
      <p class="map-popup__updated">Updated ${escapeHtml(relativeTime(station.lastUpdated))}</p>
    </div>
  `;
}

function buildCellGeoJson(cells: HexMapCell[]): GeoJSON.FeatureCollection<GeoJSON.Polygon, HexFeatureProperties> {
  const features: HexFeature[] = cells
    .filter(cell => Array.isArray(cell.boundary) && cell.boundary.length >= 3)
    .map((cell, index) => {
      const id = cell.h3 ?? `${cell.lon},${cell.lat},${index}`;

      return {
        type: 'Feature',
        id,
        geometry: {
          type: 'Polygon',
          coordinates: [closeBoundary(cell.boundary ?? [])],
        },
        properties: {
          id,
          label: formatAqi(cell.avgAqi),
          avgAqi: cell.avgAqi,
          avgPm25: cell.avgPm25,
          deviceCount: cell.deviceCount,
          lastTs: cell.lastTs,
          updatedText: relativeTime(cell.lastTs),
        },
      };
    });

  return {
    type: 'FeatureCollection',
    features,
  };
}

function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

async function apiRequest<T>(endpoint: string, signal: AbortSignal): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers,
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function ensureHexLayers(map: maplibregl.Map, tokens: MapTokens): void {
  if (!map.getSource(HEX_SOURCE_ID)) {
    map.addSource(HEX_SOURCE_ID, {
      type: 'geojson',
      data: buildCellGeoJson([]),
    });
  }

  if (!map.getLayer(HEX_FILL_LAYER_ID)) {
    const fillColor: maplibregl.ExpressionSpecification = [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      aqiStepExpression(tokens, 'hover'),
      aqiStepExpression(tokens, 'soft'),
    ];

    map.addLayer({
      id: HEX_FILL_LAYER_ID,
      type: 'fill',
      source: HEX_SOURCE_ID,
      paint: {
        'fill-color': fillColor,
        'fill-opacity': 1,
      },
    });
  }

  if (!map.getLayer(HEX_LINE_LAYER_ID)) {
    map.addLayer({
      id: HEX_LINE_LAYER_ID,
      type: 'line',
      source: HEX_SOURCE_ID,
      paint: {
        'line-color': aqiStepExpression(tokens, 'solid'),
        'line-opacity': 0.52,
        'line-width': 1,
      },
    });
  }

  if (!map.getLayer(HEX_LABEL_LAYER_ID)) {
    map.addLayer({
      id: HEX_LABEL_LAYER_ID,
      type: 'symbol',
      source: HEX_SOURCE_ID,
      layout: {
        'text-field': ['get', 'label'],
        // Must exist on the glyphs server declared in OSM_STYLE
        'text-font': ['Open Sans Semibold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 13, 15, 16],
        'text-allow-overlap': false,
        'text-ignore-placement': false,
      },
      paint: {
        'text-color': tokens.text,
        'text-halo-color': tokens.textInverse,
        'text-halo-width': 1.5,
      },
    });
  }
}

function setHexLayerVisibility(map: maplibregl.Map, visible: boolean): void {
  const visibility = visible ? 'visible' : 'none';

  for (const layerId of [HEX_FILL_LAYER_ID, HEX_LINE_LAYER_ID, HEX_LABEL_LAYER_ID]) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visibility);
    }
  }
}

function updateHexSource(map: maplibregl.Map, cells: HexMapCell[]): void {
  const source = map.getSource(HEX_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  source?.setData(buildCellGeoJson(cells));
}

export function MapView() {
  const homes = useHomes();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const stationMarkersRef = useRef<maplibregl.Marker[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const hoveredCellIdRef = useRef<string | number | null>(null);
  const tokensRef = useRef<MapTokens | null>(null);
  const [showAeroSpec, setShowAeroSpec] = useState(true);
  const showAeroSpecRef = useRef(showAeroSpec);
  const [showOpenAQ, setShowOpenAQ] = useState(true);
  const [cells, setCells] = useState<HexMapCell[]>([]);
  const [stations, setStations] = useState<OpenAQStation[]>([]);
  const [loading, setLoading] = useState(false);

  const clearHoveredCell = useCallback(() => {
    const map = mapRef.current;
    const hoveredCellId = hoveredCellIdRef.current;
    if (!map || hoveredCellId === null) return;

    map.setFeatureState({ source: HEX_SOURCE_ID, id: hoveredCellId }, { hover: false });
    hoveredCellIdRef.current = null;
  }, []);

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

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);

    const [cellsResult, stationsResult] = await Promise.allSettled([
      apiRequest<MapCellsResponse>(`/map/cells?bbox=${bbox}&hours=${DATA_HOURS}`, controller.signal),
      apiRequest<OpenAQResponse>(`/external/openaq/latest?bbox=${bbox}`, controller.signal),
    ]);

    if (requestId !== requestIdRef.current || controller.signal.aborted) return;

    setLoading(false);

    if (cellsResult.status === 'fulfilled') {
      setCells(cellsResult.value.cells);
    } else if (!isAbortError(cellsResult.reason)) {
      setCells([]);
    }

    if (stationsResult.status === 'fulfilled') {
      setStations(stationsResult.value.stations);
    } else if (!isAbortError(stationsResult.reason)) {
      setStations([]);
    }
  }, []);

  useEffect(() => {
    showAeroSpecRef.current = showAeroSpec;
  }, [showAeroSpec]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: OSM_STYLE,
      center: [-122.3053, 47.8279],
      zoom: 10,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const debouncedLoad = () => {
      clearTimeout(timer);
      timer = setTimeout(loadData, 300);
    };

    map.on('load', () => {
      const tokens = readMapTokens();
      tokensRef.current = tokens;
      ensureHexLayers(map, tokens);
      setHexLayerVisibility(map, showAeroSpecRef.current);
      map.on('mousemove', HEX_FILL_LAYER_ID, event => {
        if (!event.features?.length) return;

        const featureId = event.features[0].id;
        if (featureId === undefined) return;

        map.getCanvas().style.cursor = 'pointer';
        if (hoveredCellIdRef.current !== null && hoveredCellIdRef.current !== featureId) {
          map.setFeatureState({ source: HEX_SOURCE_ID, id: hoveredCellIdRef.current }, { hover: false });
        }
        hoveredCellIdRef.current = featureId;
        map.setFeatureState({ source: HEX_SOURCE_ID, id: featureId }, { hover: true });
      });
      map.on('mouseleave', HEX_FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
        clearHoveredCell();
      });
      map.on('click', HEX_FILL_LAYER_ID, event => {
        const feature = event.features?.[0] as maplibregl.MapGeoJSONFeature | undefined;
        if (!feature?.properties) return;

        new maplibregl.Popup({
          offset: 12,
          className: 'map-popup-shell',
        })
          .setLngLat(event.lngLat)
          .setHTML(renderCellPopup(feature.properties as HexFeatureProperties))
          .addTo(map);
      });
      loadData();
    });
    map.on('moveend', debouncedLoad);
    map.on('zoomend', debouncedLoad);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
      stationMarkersRef.current.forEach(marker => marker.remove());
      stationMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [clearHoveredCell, loadData]);

  useEffect(() => {
    const home = homes[0];
    if (home && mapRef.current && home.location) {
      mapRef.current.setCenter([home.location.lon, home.location.lat]);
    }
  }, [homes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // setData on an existing source is safe regardless of isStyleLoaded(),
    // and isStyleLoaded() can be transiently false when cells arrive —
    // gating on it silently drops updates. Retry via styledata until the
    // source exists (it is added in the map's load handler).
    const apply = () => {
      if (!map.getSource(HEX_SOURCE_ID)) return false;
      clearHoveredCell();
      updateHexSource(map, cells);
      return true;
    };

    if (apply()) return;

    const onStyleData = () => {
      if (apply()) map.off('styledata', onStyleData);
    };
    map.on('styledata', onStyleData);
    return () => {
      map.off('styledata', onStyleData);
    };
  }, [cells, clearHoveredCell]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    setHexLayerVisibility(map, showAeroSpec);
  }, [showAeroSpec]);

  useEffect(() => {
    const map = mapRef.current;
    const tokens = tokensRef.current;
    if (!map || !tokens) return;

    stationMarkersRef.current.forEach(marker => marker.remove());
    stationMarkersRef.current = [];

    if (!showOpenAQ) return;

    for (const station of stations) {
      const token = aqiTokenForValue(tokens, station.aqi);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'map-marker map-marker--station';
      el.setAttribute('aria-label', `${station.name} OpenAQ station`);
      el.style.setProperty('--station-color', token.solid);
      el.style.setProperty('--station-soft-color', token.soft);

      const popup = new maplibregl.Popup({
        offset: 12,
        className: 'map-popup-shell',
      }).setHTML(renderStationPopup(station));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([station.lon, station.lat])
        .setPopup(popup)
        .addTo(map);
      stationMarkersRef.current.push(marker);
    }
  }, [stations, showOpenAQ]);

  return (
    <div className="map-view">
      <header className="map-header">
        <div>
          <h1>Regional Map</h1>
          <p className="map-subtitle">
            Crowd-sourced AeroSpec readings (aggregated by area for privacy) and OpenAQ public stations
          </p>
        </div>
      </header>

      <div className="map-shell">
        <div ref={mapContainer} className="map-canvas" />

        <div className="map-controls" aria-label="Map layers">
          <label className="map-toggle">
            <input
              type="checkbox"
              checked={showAeroSpec}
              onChange={e => setShowAeroSpec(e.target.checked)}
            />
            <span>AeroSpec hexes</span>
            <strong>{cells.length}</strong>
          </label>
          <label className="map-toggle">
            <input
              type="checkbox"
              checked={showOpenAQ}
              onChange={e => setShowOpenAQ(e.target.checked)}
            />
            <span>OpenAQ stations</span>
            <strong>{stations.length}</strong>
          </label>
          {loading && <span className="map-loading-indicator">Updating…</span>}
        </div>

        <div className="map-legend" aria-label="AQI legend">
          <span className="legend-title">AQI</span>
          <span className="legend-chip legend-chip--good">0-50</span>
          <span className="legend-chip legend-chip--moderate">51-100</span>
          <span className="legend-chip legend-chip--sensitive">101-150</span>
          <span className="legend-chip legend-chip--unhealthy">151-200</span>
          <span className="legend-chip legend-chip--very-unhealthy">201-300</span>
          <span className="legend-chip legend-chip--hazardous">300+</span>
        </div>
      </div>
    </div>
  );
}
