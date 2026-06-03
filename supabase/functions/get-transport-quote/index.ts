import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// WGS84 coordinates for the 8 supported Zimbabwe auction cities.
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Harare:   { lat: -17.8292, lng: 31.0522 },
  Bulawayo: { lat: -20.1325, lng: 28.6264 },
  Mutare:   { lat: -18.9707, lng: 32.6709 },
  Masvingo: { lat: -20.0696, lng: 30.8277 },
  Gweru:    { lat: -19.4500, lng: 29.8167 },
  Chinhoyi: { lat: -17.3617, lng: 30.2000 },
  Kadoma:   { lat: -18.3419, lng: 29.9103 },
  Kwekwe:   { lat: -18.9281, lng: 29.8131 },
};

const TRANSPORT_BASE_USD   = parseFloat(Deno.env.get("TRANSPORT_BASE_USD")   || "15");
const TRANSPORT_PER_KM_USD = parseFloat(Deno.env.get("TRANSPORT_PER_KM_USD") || "0.35");
const TRANSPORT_CAP_USD    = parseFloat(Deno.env.get("TRANSPORT_CAP_USD")    || "250");

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function nominatimGeocode(
  address: string
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  // Restrict to SADC region — buyers receiving delivery will be in-region.
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=zw,za,bw,mz,zm,mw`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ZimLivestock/1.0 (dev@paynow.co.zw)" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name as string,
  };
}

function calcQuoteUsd(distanceKm: number): number {
  const raw = TRANSPORT_BASE_USD + distanceKm * TRANSPORT_PER_KM_USD;
  return Number(Math.min(raw, TRANSPORT_CAP_USD).toFixed(2));
}

Deno.serve(async (req) => {
  // Per-request origin allowlist (ALLOWED_ORIGIN) instead of a wildcard, matching
  // the SEV-1 CORS hardening on the other user-facing functions.
  const cors = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const log = createLogger("get-transport-quote", req);

  // Authenticate the caller — buyer_id comes from their JWT.
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
  );
  const { data: { user }, error: authError } = await anonClient.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const { item_id, dropoff_address } = body ?? {};

  if (!item_id || typeof item_id !== "string") return json({ error: "item_id required" }, 400);
  if (!dropoff_address || typeof dropoff_address !== "string" || dropoff_address.trim().length < 3) {
    return json({ error: "dropoff_address required (min 3 chars)" }, 400);
  }

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch the item to verify transport is enabled and get pickup city.
  const { data: item, error: itemError } = await service
    .from("livestock_items")
    .select("id, location, transport_available, status")
    .eq("id", item_id)
    .single();

  if (itemError || !item) return json({ error: "Listing not found" }, 404);
  if (!item.transport_available) return json({ error: "Seller has not enabled delivery for this listing" }, 422);
  if (item.status !== "ended") return json({ error: "Transport quotes are only available after the auction ends" }, 422);

  const pickupCoords = CITY_COORDS[item.location];
  if (!pickupCoords) return json({ error: `No coordinates for city: ${item.location}` }, 422);

  // Geocode the dropoff address via Nominatim.
  const dropoff = await nominatimGeocode(dropoff_address.trim());
  if (!dropoff) {
    return json({
      error: "Could not locate that address. Try a more specific address within Zimbabwe or SADC.",
    }, 422);
  }

  const distanceKm = Number(haversineKm(pickupCoords.lat, pickupCoords.lng, dropoff.lat, dropoff.lng).toFixed(2));
  const quoteUsd = calcQuoteUsd(distanceKm);

  // Upsert: replace any previous pending quote for this buyer+item.
  const { data: existing } = await service
    .from("transport_requests")
    .select("id")
    .eq("item_id", item_id)
    .eq("buyer_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  let requestId: string;

  if (existing) {
    const { data: updated, error: updateError } = await service
      .from("transport_requests")
      .update({
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        dropoff_label: dropoff.displayName,
        distance_km: distanceKm,
        quote_usd: quoteUsd,
      })
      .eq("id", existing.id)
      .select("id")
      .single();
    if (updateError || !updated) return json({ error: "Failed to update quote" }, 500);
    requestId = updated.id;
  } else {
    const { data: created, error: insertError } = await service
      .from("transport_requests")
      .insert({
        item_id,
        buyer_id: user.id,
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        dropoff_label: dropoff.displayName,
        distance_km: distanceKm,
        quote_usd: quoteUsd,
      })
      .select("id")
      .single();
    if (insertError || !created) return json({ error: "Failed to create quote" }, 500);
    requestId = created.id;
  }

  log.info("transport quote generated", { item_id, buyer_id: user.id, distanceKm, quoteUsd });

  return json({
    transport_request_id: requestId,
    distance_km: distanceKm,
    quote_usd: quoteUsd,
    dropoff_label: dropoff.displayName,
    pickup_city: item.location,
  });
});
