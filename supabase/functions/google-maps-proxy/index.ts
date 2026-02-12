import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!GOOGLE_MAPS_API_KEY) {
    return new Response(
      JSON.stringify({
        error: true,
        message:
          "Configuração ausente: GOOGLE_MAPS_API_KEY não encontrada nos secrets do Supabase.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { action, text, from, to } = await req.json();

    if (action === "geocode") {
      return await handleGeocode(GOOGLE_MAPS_API_KEY, text);
    }

    if (action === "route") {
      return await handleRoute(GOOGLE_MAPS_API_KEY, from, to);
    }

    return new Response(
      JSON.stringify({ error: true, message: `Ação desconhecida: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: true, message: err.message || "Erro interno no proxy de mapas." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Geocode: address text -> [lng, lat] coordinates
 * Returns GeoJSON FeatureCollection format expected by the frontend.
 */
async function handleGeocode(apiKey: string, text: string) {
  if (!text || text.length < 3) {
    return jsonResponse({ error: true, message: "Texto de busca muito curto." });
  }

  const params = new URLSearchParams({
    address: text,
    components: "country:BR",
    language: "pt-BR",
    key: apiKey,
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params}`
  );
  const data = await res.json();

  if (data.status === "REQUEST_DENIED") {
    return jsonResponse({
      error: true,
      message: `Google API negou a requisição: ${data.error_message || "verifique a chave de API."}`,
    });
  }

  if (data.status === "ZERO_RESULTS" || !data.results?.length) {
    return jsonResponse({ type: "FeatureCollection", features: [] });
  }

  const features = data.results.map((result: any) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [
        result.geometry.location.lng,
        result.geometry.location.lat,
      ],
    },
    properties: {
      label: result.formatted_address,
      place_id: result.place_id,
      types: result.types,
    },
  }));

  return jsonResponse({ type: "FeatureCollection", features });
}

/**
 * Route: origin/destination coordinates -> polyline + summary
 * `from` and `to` are [lng, lat] arrays.
 * Returns GeoJSON FeatureCollection with route geometry and summary.
 */
async function handleRoute(
  apiKey: string,
  from: [number, number],
  to: [number, number]
) {
  if (!from || !to) {
    return jsonResponse({
      error: true,
      message: "Coordenadas de origem e destino são obrigatórias.",
    });
  }

  // from/to arrive as [lng, lat]; Google Directions API expects "lat,lng"
  const origin = `${from[1]},${from[0]}`;
  const destination = `${to[1]},${to[0]}`;

  const params = new URLSearchParams({
    origin,
    destination,
    mode: "driving",
    language: "pt-BR",
    key: apiKey,
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?${params}`
  );
  const data = await res.json();

  if (data.status === "REQUEST_DENIED") {
    return jsonResponse({
      error: true,
      message: `Google API negou a requisição: ${data.error_message || "verifique a chave de API."}`,
    });
  }

  if (data.status === "ZERO_RESULTS" || !data.routes?.length) {
    return jsonResponse({
      error: true,
      message: "Nenhuma rota encontrada entre os pontos informados.",
    });
  }

  const route = data.routes[0];
  const leg = route.legs[0];

  // Decode the overview polyline into [lng, lat] coordinate pairs
  const coordinates = decodePolyline(route.overview_polyline.points).map(
    ([lat, lng]) => [lng, lat] as [number, number]
  );

  const feature = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates,
    },
    properties: {
      summary: {
        distance: leg.distance.value, // meters
        duration: leg.duration.value, // seconds
      },
      distance_text: leg.distance.text,
      duration_text: leg.duration.text,
      start_address: leg.start_address,
      end_address: leg.end_address,
    },
  };

  return jsonResponse({ type: "FeatureCollection", features: [feature] });
}

/** Decode a Google encoded polyline string into an array of [lat, lng] pairs */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
