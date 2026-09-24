import { setTimeout as delay } from "node:timers/promises";

import { haversineKm } from "./geo.js";

const DEFAULT_USER_AGENT = "Cacvoc/1.0 (Christ Apostolic Church mobile app)";
const DEFAULT_OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_QUERIES = ["Christ Apostolic Church", "CAC"];

const SEARCH_RADIUS_KM = 30;
const WIDE_SEARCH_RADIUS_KM = 100;
const OVERPASS_TIMEOUT_MS = 12 * 1000;
// A public Overpass instance that just failed is usually overloaded for a while,
// so skip it for a bit instead of making every lookup wait for it to time out.
const OVERPASS_COOLDOWN_MS = 2 * 60 * 1000;
const NOMINATIM_TIMEOUT_MS = 10 * 1000;
// Nominatim's usage policy allows at most one request per second.
const NOMINATIM_INTERVAL_MS = 1100;
// Beyond this many waiting requests, fail fast instead of making callers wait 10+ s.
const NOMINATIM_MAX_QUEUED = 10;
const NOMINATIM_BOX_DEGREES = 0.45;

const SUCCESS_TTL_MS = 24 * 60 * 60 * 1000;
const FAILURE_TTL_MS = 2 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

const MAX_SUGGESTIONS = 25;
const REGISTERED_CHURCH_RADIUS_KM = 0.15;

// Overpass only understands POSIX-style regexes, so this is a coarse server-side
// pre-filter; isCacChurchName() makes the final decision for every source.
const OVERPASS_NAME_PATTERN =
  "christ[[:space:]]+apostolic|(^|[^[:alpha:]])c[.]?[[:space:]]?a[.]?[[:space:]]?c([^[:alpha:]]|$)";
const CHRIST_APOSTOLIC_PATTERN = /christ\s+apostolic/i;
// A standalone "CAC" token, also written "C.A.C" or "C. A. C.".
const CAC_TOKEN_PATTERN = /(^|\P{L})c\.?\s?a\.?\s?c(?!\p{L})/iu;

const OSM_TYPES = new Set(["node", "way", "relation"]);

const lookupCache = new Map();
const overpassCooldowns = new Map();
let nominatimQueue = Promise.resolve();
let nominatimQueued = 0;
let nominatimLastRequestAt = 0;

export function isCacChurchName(name) {
  return (
    typeof name === "string" &&
    (CHRIST_APOSTOLIC_PATTERN.test(name) || CAC_TOKEN_PATTERN.test(name))
  );
}

function getUserAgent() {
  return process.env.OSM_USER_AGENT?.trim() || DEFAULT_USER_AGENT;
}

function getOverpassUrls() {
  const configured = (process.env.OVERPASS_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  return configured.length > 0 ? configured : DEFAULT_OVERPASS_URLS;
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function describeError(error) {
  if (error?.name === "TimeoutError") {
    return "timed out";
  }

  const message = String(error?.cause?.code ?? error?.cause?.message ?? error?.message ?? error);

  return message.length > 120 ? `${message.slice(0, 117)}...` : message;
}

function cleanText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toCoordinate(value, limit) {
  const number = typeof value === "string" && value.trim() ? Number(value) : value;

  return typeof number === "number" && Number.isFinite(number) && Math.abs(number) <= limit
    ? number
    : null;
}

function roundCoordinate(value) {
  return Math.round(value * 100) / 100;
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

// OpenStreetMap tags usually hold ISO codes ("NG"); Nominatim returns names ("Nigeria").
function countryName(value) {
  const text = cleanText(value);

  if (text && /^[A-Za-z]{2}$/.test(text)) {
    try {
      return regionNames.of(text.toUpperCase()) ?? text;
    } catch {
      return text;
    }
  }

  return text;
}

function createPlace({ type, id, name, address, city, country, latitude, longitude }) {
  const osmId = Number(id);
  const placeName = cleanText(name);
  const lat = toCoordinate(latitude, 90);
  const lng = toCoordinate(longitude, 180);

  if (
    !OSM_TYPES.has(type) ||
    !Number.isSafeInteger(osmId) ||
    osmId <= 0 ||
    !isCacChurchName(placeName) ||
    lat === null ||
    lng === null
  ) {
    return null;
  }

  return {
    id: `osm:${type}:${osmId}`,
    name: placeName,
    address: cleanText(address),
    city: cleanText(city),
    country: countryName(country),
    latitude: lat,
    longitude: lng,
  };
}

function uniquePlaces(places) {
  const byId = new Map();

  for (const place of places) {
    if (place && !byId.has(place.id)) {
      byId.set(place.id, place);
    }
  }

  return [...byId.values()];
}

async function fetchJson(url, options, timeoutMs) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: "application/json", "User-Agent": getUserAgent() },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`HTTP ${response.status}`);
  }

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("non-JSON response");
  }
}

function buildOverpassQuery(latitude, longitude, radiusKm) {
  const around = `(around:${radiusKm * 1000},${latitude},${longitude})`;
  const named = `["name"~"${OVERPASS_NAME_PATTERN}",i]`;

  return (
    "[out:json][timeout:12];(" +
    `nwr["amenity"="place_of_worship"]${named}${around};` +
    `nwr["building"~"^(church|chapel)$"]${named}${around};` +
    ");out center tags 60;"
  );
}

function placeFromOverpass(element) {
  const tags = element?.tags ?? {};
  const street = cleanText(tags["addr:street"]);

  return createPlace({
    type: element?.type,
    id: element?.id,
    name: tags.name,
    address: street
      ? [cleanText(tags["addr:housenumber"]), street].filter(Boolean).join(" ")
      : tags["addr:full"],
    city: tags["addr:city"],
    country: tags["addr:country"],
    latitude: element?.lat ?? element?.center?.lat,
    longitude: element?.lon ?? element?.center?.lon,
  });
}

async function fetchOverpass(url, query) {
  const data = await fetchJson(
    url,
    { method: "POST", body: new URLSearchParams({ data: query }) },
    OVERPASS_TIMEOUT_MS
  );

  if (typeof data?.remark === "string" && /runtime error|timed out/i.test(data.remark)) {
    throw new Error(data.remark);
  }

  if (!Array.isArray(data?.elements)) {
    throw new Error("unexpected response");
  }

  return data.elements;
}

async function queryOverpass(latitude, longitude, radiusKm, failures) {
  const query = buildOverpassQuery(latitude, longitude, radiusKm);

  for (const url of getOverpassUrls()) {
    const host = hostOf(url);

    if ((overpassCooldowns.get(url) ?? 0) > Date.now()) {
      failures.push(`${host} skipped after a recent failure`);
      continue;
    }

    try {
      const elements = await fetchOverpass(url, query);
      overpassCooldowns.delete(url);
      return { host, places: uniquePlaces(elements.map(placeFromOverpass)) };
    } catch (error) {
      overpassCooldowns.set(url, Date.now() + OVERPASS_COOLDOWN_MS);
      failures.push(`${host} (${radiusKm} km): ${describeError(error)}`);
    }
  }

  return null;
}

async function searchOverpass(latitude, longitude, failures) {
  const nearby = await queryOverpass(latitude, longitude, SEARCH_RADIUS_KM, failures);

  if (!nearby) {
    return null;
  }

  if (nearby.places.length > 0) {
    return { ...nearby, radiusKm: SEARCH_RADIUS_KM, complete: true };
  }

  const wide = await queryOverpass(latitude, longitude, WIDE_SEARCH_RADIUS_KM, failures);

  if (!wide) {
    // "None within 30 km" is still a real answer, it just shouldn't be cached for long.
    return { ...nearby, radiusKm: SEARCH_RADIUS_KM, complete: false };
  }

  return { ...wide, radiusKm: WIDE_SEARCH_RADIUS_KM, complete: true };
}

function buildViewbox(latitude, longitude) {
  const cosLatitude = Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
  const lngSpan = Math.min(NOMINATIM_BOX_DEGREES / cosLatitude, 180);
  const clamp = (value, limit) => Math.min(Math.max(value, -limit), limit);

  return [
    clamp(longitude - lngSpan, 180),
    clamp(latitude + NOMINATIM_BOX_DEGREES, 90),
    clamp(longitude + lngSpan, 180),
    clamp(latitude - NOMINATIM_BOX_DEGREES, 90),
  ]
    .map((value) => value.toFixed(4))
    .join(",");
}

function scheduleNominatim(task) {
  if (nominatimQueued >= NOMINATIM_MAX_QUEUED) {
    return Promise.reject(new Error("too many queued requests"));
  }

  nominatimQueued += 1;
  const run = nominatimQueue.then(async () => {
    try {
      const wait = nominatimLastRequestAt + NOMINATIM_INTERVAL_MS - Date.now();

      if (wait > 0) {
        await delay(wait);
      }

      return await task();
    } finally {
      nominatimLastRequestAt = Date.now();
      nominatimQueued -= 1;
    }
  });

  nominatimQueue = run.catch(() => {});
  return run;
}

function placeFromNominatim(result) {
  const isChurch =
    (result?.category === "amenity" && result?.type === "place_of_worship") ||
    (result?.category === "building" && (result?.type === "church" || result?.type === "chapel"));

  if (!isChurch) {
    return null;
  }

  const address = result.address ?? {};
  const road = cleanText(address.road);

  return createPlace({
    type: result.osm_type,
    id: result.osm_id,
    name: result.name,
    address: road ? [cleanText(address.house_number), road].filter(Boolean).join(" ") : null,
    city: address.city ?? address.town ?? address.village ?? address.suburb,
    country: address.country,
    latitude: result.lat,
    longitude: result.lon,
  });
}

async function fetchNominatim(query, viewbox) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "40",
    bounded: "1",
    viewbox,
  });
  const data = await fetchJson(`${NOMINATIM_SEARCH_URL}?${params}`, {}, NOMINATIM_TIMEOUT_MS);

  if (!Array.isArray(data)) {
    throw new Error("unexpected response");
  }

  return data;
}

async function searchNominatim(latitude, longitude, failures) {
  const viewbox = buildViewbox(latitude, longitude);
  // Queue both searches together so this lookup isn't interleaved with other lookups.
  const outcomes = await Promise.allSettled(
    NOMINATIM_QUERIES.map((query) => scheduleNominatim(() => fetchNominatim(query, viewbox)))
  );
  const places = [];
  let answered = 0;

  outcomes.forEach((outcome, index) => {
    if (outcome.status === "fulfilled") {
      places.push(...outcome.value.map(placeFromNominatim));
      answered += 1;
    } else {
      failures.push(`nominatim "${NOMINATIM_QUERIES[index]}": ${describeError(outcome.reason)}`);
    }
  });

  if (answered === 0) {
    return null;
  }

  return { places: uniquePlaces(places), complete: answered === NOMINATIM_QUERIES.length };
}

async function lookupCacChurches(latitude, longitude) {
  const startedAt = Date.now();
  const failures = [];
  let result = { places: [], available: false, complete: false };
  let source = "unavailable";

  const overpass = await searchOverpass(latitude, longitude, failures);

  if (overpass) {
    result = { places: overpass.places, available: true, complete: overpass.complete };
    source = `overpass (${overpass.host}, ${overpass.radiusKm} km)`;
  } else {
    const nominatim = await searchNominatim(latitude, longitude, failures);

    if (nominatim) {
      result = { places: nominatim.places, available: true, complete: nominatim.complete };
      source = "nominatim";
    }
  }

  console.info(
    `[osm] ${latitude},${longitude} -> ${source}: ${result.places.length} CAC churches ` +
      `in ${Date.now() - startedAt} ms` +
      (failures.length > 0 ? ` (failed: ${failures.join("; ")})` : "")
  );

  return result;
}

function pruneCache() {
  if (lookupCache.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  const now = Date.now();

  for (const [key, entry] of lookupCache) {
    if (entry.expiresAt !== null && entry.expiresAt <= now) {
      lookupCache.delete(key);
    }
  }

  for (const key of lookupCache.keys()) {
    if (lookupCache.size <= MAX_CACHE_ENTRIES) {
      break;
    }

    lookupCache.delete(key);
  }
}

// Lookups are cached per ~1 km cell; concurrent requests for a cell share one promise.
function getLookup(latitude, longitude) {
  const key = `${latitude},${longitude}`;
  const cached = lookupCache.get(key);

  if (cached && (cached.expiresAt === null || cached.expiresAt > Date.now())) {
    return cached.promise;
  }

  const entry = { expiresAt: null, promise: null };
  entry.promise = lookupCacChurches(latitude, longitude).then(
    (result) => {
      entry.expiresAt = Date.now() + (result.complete ? SUCCESS_TTL_MS : FAILURE_TTL_MS);
      return result;
    },
    (error) => {
      if (lookupCache.get(key) === entry) {
        lookupCache.delete(key);
      }

      throw error;
    }
  );

  lookupCache.delete(key);
  lookupCache.set(key, entry);
  pruneCache();

  return entry.promise;
}

export async function findCacChurchesNear(latitude, longitude, { exclude = [] } = {}) {
  const lookup = await getLookup(roundCoordinate(latitude), roundCoordinate(longitude));
  const registered = exclude.filter(
    (church) => Number.isFinite(church?.latitude) && Number.isFinite(church?.longitude)
  );
  const suggestions = lookup.places
    .filter(
      (place) =>
        !registered.some(
          (church) =>
            haversineKm(place.latitude, place.longitude, church.latitude, church.longitude) <=
            REGISTERED_CHURCH_RADIUS_KM
        )
    )
    .map((place) => ({
      place,
      distanceKm: haversineKm(latitude, longitude, place.latitude, place.longitude),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ place, distanceKm }) => ({
      ...place,
      distanceKm: Math.round(distanceKm * 10) / 10,
      source: "openstreetmap",
    }));

  return { suggestions, available: lookup.available };
}
