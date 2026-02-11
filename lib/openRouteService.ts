/**
 * OpenRouteService (ORS) Client — Serviço compartilhado para todos os mapas SISUP
 * 
 * Features:
 * - Geocoding (forward + reverse)
 * - Routing / Directions (com polyline decode)
 * - Isochrones
 * - Supabase cache automático para economizar quota
 * 
 * @see https://openrouteservice.org/dev/#/api-docs
 */

import { supabase } from './supabase';

// ==================== CONFIG ====================

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjMzYTI2YWU1NmQxZTRmNzRiNjhlZWZiZWYxZGZhZGY1IiwiaCI6Im11cm11cjY0In0=';
const ORS_BASE_URL = 'https://api.openrouteservice.org';

// Sede TJPA — Belém, PA
export const TJPA_SEDE: [number, number] = [-1.45502, -48.50240];

// ==================== TYPES ====================

export interface OrsGeocodingResult {
  label: string;
  lat: number;
  lng: number;
  confidence: number;
  country: string;
  region: string;
  locality: string;
}

export interface OrsRouteResult {
  distanceKm: number;
  durationMinutes: number;
  durationFormatted: string;
  geometry: [number, number][]; // [lat, lng] pairs for Leaflet polyline
  summary: string;
}

export interface OrsIsochroneResult {
  geometry: any; // GeoJSON polygon
  range: number; // seconds or meters
  center: [number, number];
}

// Tile layer options
export interface OrsTileConfig {
  url: string;
  attribution: string;
  name: string;
}

// ==================== TILE LAYERS ====================

export const ORS_TILE_LAYERS: Record<string, OrsTileConfig> = {
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
    name: 'Voyager (Claro)',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
    name: 'Escuro',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    name: 'Satélite',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
    name: 'Topográfico',
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
    name: 'OpenStreetMap',
  },
};

// ==================== HELPERS ====================

/** Decode ORS encoded polyline to [lat, lng] array */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** Generate deterministic cache key for routes */
function routeCacheKey(from: [number, number], to: [number, number]): string {
  return `${from[0].toFixed(4)},${from[1].toFixed(4)}|${to[0].toFixed(4)},${to[1].toFixed(4)}`;
}

// ==================== CACHE LAYER ====================

async function getCachedRoute(cacheKey: string): Promise<OrsRouteResult | null> {
  try {
    const { data } = await supabase
      .from('ors_route_cache')
      .select('route_data, expires_at')
      .eq('cache_key', cacheKey)
      .single();

    if (data && new Date(data.expires_at) > new Date()) {
      return data.route_data as OrsRouteResult;
    }
    return null;
  } catch {
    return null;
  }
}

async function setCachedRoute(cacheKey: string, routeData: OrsRouteResult, fromLabel: string, toLabel: string): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Cache 30 dias

    await supabase
      .from('ors_route_cache')
      .upsert({
        cache_key: cacheKey,
        from_label: fromLabel,
        to_label: toLabel,
        distance_km: routeData.distanceKm,
        duration_minutes: routeData.durationMinutes,
        route_data: routeData,
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'cache_key' });
  } catch (err) {
    console.warn('[ORS Cache] Falha ao salvar cache:', err);
  }
}

// ==================== API METHODS ====================

/**
 * Forward Geocoding — Busca coordenadas por nome/endereço
 */
export async function geocodeAddress(query: string, options?: { countryCode?: string; limit?: number }): Promise<OrsGeocodingResult[]> {
  const params = new URLSearchParams({
    api_key: ORS_API_KEY,
    text: query,
    size: String(options?.limit || 5),
    'boundary.country': options?.countryCode || 'BR',
  });

  const res = await fetch(`${ORS_BASE_URL}/geocode/search?${params}`);
  if (!res.ok) throw new Error(`ORS Geocoding error: ${res.status}`);

  const data = await res.json();
  return (data.features || []).map((f: any) => ({
    label: f.properties.label,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    confidence: f.properties.confidence || 0,
    country: f.properties.country || '',
    region: f.properties.region || '',
    locality: f.properties.locality || '',
  }));
}

/**
 * Reverse Geocoding — Busca endereço por coordenadas
 */
export async function reverseGeocode(lat: number, lng: number): Promise<OrsGeocodingResult | null> {
  const params = new URLSearchParams({
    api_key: ORS_API_KEY,
    'point.lat': String(lat),
    'point.lon': String(lng),
    size: '1',
    'boundary.country': 'BR',
  });

  const res = await fetch(`${ORS_BASE_URL}/geocode/reverse?${params}`);
  if (!res.ok) return null;

  const data = await res.json();
  const f = data.features?.[0];
  if (!f) return null;

  return {
    label: f.properties.label,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    confidence: f.properties.confidence || 0,
    country: f.properties.country || '',
    region: f.properties.region || '',
    locality: f.properties.locality || '',
  };
}

/**
 * Directions — Calcula rota entre dois pontos
 * Com cache automático no Supabase
 */
export async function getRoute(
  from: [number, number],
  to: [number, number],
  options?: { profile?: string; fromLabel?: string; toLabel?: string; skipCache?: boolean }
): Promise<OrsRouteResult> {
  const profile = options?.profile || 'driving-car';
  const cacheKey = `${profile}:${routeCacheKey(from, to)}`;

  // Check cache first
  if (!options?.skipCache) {
    const cached = await getCachedRoute(cacheKey);
    if (cached) return cached;
  }

  // ORS expects [lng, lat] format
  const body = {
    coordinates: [
      [from[1], from[0]], // [lng, lat]
      [to[1], to[0]],
    ],
    instructions: false,
    geometry: true,
  };

  const res = await fetch(`${ORS_BASE_URL}/v2/directions/${profile}/json`, {
    method: 'POST',
    headers: {
      'Authorization': ORS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ORS Directions error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error('Nenhuma rota encontrada');

  const distanceKm = Math.round((route.summary.distance / 1000) * 10) / 10;
  const durationMinutes = Math.round(route.summary.duration / 60);

  // Decode polyline geometry
  const geometry = decodePolyline(route.geometry);

  const result: OrsRouteResult = {
    distanceKm,
    durationMinutes,
    durationFormatted: formatDuration(durationMinutes),
    geometry,
    summary: `${distanceKm} km · ${formatDuration(durationMinutes)}`,
  };

  // Save to cache
  await setCachedRoute(
    cacheKey,
    result,
    options?.fromLabel || `${from[0].toFixed(4)}, ${from[1].toFixed(4)}`,
    options?.toLabel || `${to[0].toFixed(4)}, ${to[1].toFixed(4)}`
  );

  return result;
}

/**
 * Isochrones — Gera polígonos de alcance temporal
 */
export async function getIsochrones(
  center: [number, number],
  options?: { 
    profile?: string; 
    rangeSeconds?: number[]; 
    rangeType?: 'time' | 'distance' 
  }
): Promise<OrsIsochroneResult[]> {
  const profile = options?.profile || 'driving-car';
  const rangeType = options?.rangeType || 'time';
  const ranges = options?.rangeSeconds || [3600, 7200, 14400]; // 1h, 2h, 4h default

  const body = {
    locations: [[center[1], center[0]]], // [lng, lat]
    range: ranges,
    range_type: rangeType,
  };

  const res = await fetch(`${ORS_BASE_URL}/v2/isochrones/${profile}`, {
    method: 'POST',
    headers: {
      'Authorization': ORS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ORS Isochrones error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return (data.features || []).map((f: any) => ({
    geometry: f.geometry,
    range: f.properties.value,
    center,
  }));
}

/**
 * Calcula rota entre sede TJPA e uma comarca (com cache)
 * Atalho de conveniência para o caso de uso mais comum
 */
export async function getRouteFromSede(
  comarcaLat: number,
  comarcaLng: number,
  comarcaNome: string
): Promise<OrsRouteResult> {
  return getRoute(
    TJPA_SEDE,
    [comarcaLat, comarcaLng],
    {
      fromLabel: 'Sede TJPA — Belém',
      toLabel: comarcaNome,
    }
  );
}

/**
 * Batch: calcula rotas da sede para múltiplas comarcas
 * Respeita rate limits com delay entre chamadas
 */
export async function batchRoutesFromSede(
  comarcas: Array<{ lat: number; lng: number; nome: string }>,
  options?: { delayMs?: number; onProgress?: (done: number, total: number) => void }
): Promise<Map<string, OrsRouteResult>> {
  const results = new Map<string, OrsRouteResult>();
  const delay = options?.delayMs || 300;

  for (let i = 0; i < comarcas.length; i++) {
    const c = comarcas[i];
    try {
      const route = await getRouteFromSede(c.lat, c.lng, c.nome);
      results.set(c.nome, route);
    } catch (err) {
      console.warn(`[ORS] Falha na rota para ${c.nome}:`, err);
    }
    options?.onProgress?.(i + 1, comarcas.length);
    if (i < comarcas.length - 1) {
      await new Promise(r => setTimeout(r, delay));
    }
  }

  return results;
}
