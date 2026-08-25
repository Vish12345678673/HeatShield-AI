/**
 * HeatShield AI — intelligence layer.
 *
 * Wraps the FORTYGUARD Live Data Layer: live readings are fetched through the
 * `getFortyGuardReading` server function (the FORTYGUARD_API_KEY secret never
 * leaves the server). When the API is unreachable or not configured, a
 * deterministic thermal model provides a graceful fallback so the UI never
 * breaks.
 */
import { useEffect, useState } from "react";
import { getFortyGuardReading } from "./fortyguard.functions";

/* ---------------------------------- types --------------------------------- */

export type RiskTone = "low" | "moderate" | "high" | "extreme";

export interface RiskBand {
  label: string;
  tone: RiskTone;
  hex: string;
  min: number;
}

export interface LiveReading {
  temperature: number;
  feelsLike: number;
  heatIndex: number;
  humidity: number;
  windKph: number;
  solar: number;
  riskScore: number;
  riskLabel: string;
  riskTone: RiskTone;
  location: string;
  updatedAt: number;
  source: "fortyguard" | "simulated";
}

export interface HourPoint {
  hour: string;
  temp: number;
  heatIndex: number;
  risk: number;
}

export interface Zone {
  id: string;
  name: string;
  district: string;
  x: number; // 0..1 plane
  y: number; // 0..1 plane
  risk: number;
  populationPct: number;
  solar: number;
  trend: number; // +/- drift
  interventions: string[];
}

export interface RankedZone extends Zone {
  rank: number;
  priority: number;
}

export interface RoutePoint {
  x: number;
  y: number;
}

export interface RouteOption {
  id: string;
  label: string;
  distanceKm: number;
  timeMin: number;
  exposure: number;
  recommended: boolean;
  path: RoutePoint[];

  // Real Google Maps route geometry
  latLngPath?: {
    lat: number;
    lng: number;
  }[];

  // Google Routes API encoded polyline
  encodedPolyline?: string;

  tone: RiskTone;
}

export interface SimulationInput {
  trees: number;
  roofs: number;
  shade: number;
  stations: number;
}

export interface SimulationResult {
  before: number;
  after: number;
  deltaTemp: number;
  exposureBefore: string;
  exposureAfter: string;
  peopleProtected: number;
}

export interface TimelineSegment {
  start: number; // hour 0-24
  end: number;
  label: string;
  tone: RiskTone;
}

export interface WorkerGuidance {
  riskLabel: string;
  tone: RiskTone;
  workWindow: string;
  breakEveryMin: number;
  avoidWindow: string;
  hydration: string;
  nextSafeWindow: string;
  score: number;
  timeline: TimelineSegment[];
}

/* --------------------------------- palette -------------------------------- */

export const TONE_HEX: Record<RiskTone, string> = {
  low: "#29C7D9",
  moderate: "#F5C04E",
  high: "#FF9F32",
  extreme: "#FF5C5C",
};

export const RISK_BANDS: RiskBand[] = [
  { label: "Low", tone: "low", hex: TONE_HEX.low, min: 0 },
  { label: "Moderate", tone: "moderate", hex: TONE_HEX.moderate, min: 40 },
  { label: "High", tone: "high", hex: TONE_HEX.high, min: 60 },
  { label: "Extreme", tone: "extreme", hex: TONE_HEX.extreme, min: 85 },
];

export function riskBand(score: number): RiskBand {
  let band = RISK_BANDS[0]!;
  for (const b of RISK_BANDS) if (score >= b.min) band = b;
  return band;
}

/* ------------------------------ thermal model ------------------------------ */

/** Rothfusz heat-index regression. Inputs/outputs in °C. */
export function heatIndexC(tempC: number, humidity: number): number {
  const T = tempC * (9 / 5) + 32;
  const R = humidity;
  let HI =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R;
  if (R < 13 && T >= 80 && T <= 112) {
    HI -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  } else if (R > 85 && T >= 80 && T <= 87) {
    HI += ((R - 85) / 10) * ((87 - T) / 5);
  }
  return (HI - 32) * (5 / 9);
}

/** Diurnal temperature curve for a desert metro (Las Vegas), peaking ~15:00. */
export function diurnalTemp(hour: number): number {
  const peak = Math.exp(-Math.pow(hour - 15, 2) / (2 * 3.2 * 3.2));
  const morning = Math.exp(-Math.pow(hour - 6, 2) / (2 * 4 * 4));
  return 29.5 + 11.5 * peak + 1.2 * morning;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function riskFromHeatIndex(hi: number, jitter = 0): number {
  return Math.max(5, Math.min(99, Math.round(((hi - 26) / 19.5) * 100 + jitter)));
}

/* ------------------------------ live data layer ---------------------------- */

export function syntheticReading(now = new Date()): LiveReading {
  const hour = now.getHours() + now.getMinutes() / 60;
  const rng = mulberry32(Math.floor(now.getTime() / 300000));
  const temp = diurnalTemp(hour) + (rng() - 0.5) * 0.6;
  const humidity = 18 + Math.sin(hour / 3.7) * 6 + (rng() - 0.5) * 2;
  const hi = heatIndexC(temp, humidity);
  const risk = riskFromHeatIndex(hi, (rng() - 0.5) * 3);
  const band = riskBand(risk);
  return {
    temperature: round1(temp),
    feelsLike: round1(hi + 0.4),
    heatIndex: round1(hi),
    humidity: Math.round(humidity),
    windKph: round1(8 + rng() * 6),
    solar: Math.round(420 + 480 * Math.exp(-Math.pow(hour - 12.5, 2) / (2 * 2.6 * 2.6))),
    riskScore: risk,
    riskLabel: band.label.toUpperCase(),
    riskTone: band.tone,
    location: "Las Vegas, NV",
    updatedAt: now.getTime(),
    source: "simulated",
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function fetchLiveReading(_signal?: AbortSignal): Promise<LiveReading> {
  const fallback = syntheticReading();
  try {
    const live = await getFortyGuardReading({ data: fallback.temperature });
    if (!live) return fallback;

    const temp = live.temperature;
    const humidity = live.humidity ?? fallback.humidity;
    const hi = live.heatIndex ?? heatIndexC(temp, humidity);
    const risk = riskFromHeatIndex(hi);
    const band = riskBand(risk);
    return {
      temperature: round1(temp),
      feelsLike: round1(live.apparentTemperature ?? hi + 0.4),
      heatIndex: round1(hi),
      humidity: Math.round(humidity),
      windKph: fallback.windKph,
      solar: Math.round(live.solarGhi ?? fallback.solar),
      riskScore: risk,
      riskLabel: band.label.toUpperCase(),
    riskTone: band.tone,
    location: "Las Vegas, NV",
    updatedAt: Date.now(),
    source: "fortyguard",
    };
  } catch {
    return fallback;
  }
}

export type LiveStatus = "loading" | "live" | "degraded";

export function useLiveReading(intervalMs = 45000): {
  reading: LiveReading | null;
  status: LiveStatus;
  refresh: () => void;
} {
  const [reading, setReading] = useState<LiveReading | null>(null);
  const [status, setStatus] = useState<LiveStatus>("loading");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const r = await fetchLiveReading();
      if (cancelled) return;
      setReading(r);
      setStatus(r.source === "fortyguard" ? "live" : "degraded");
    };
    void load();
    const id = setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs, tick]);

  return { reading, status, refresh: () => setTick((t) => t + 1) };
}

/* --------------------------------- series ---------------------------------- */

export function last24h(now = new Date()): HourPoint[] {
  const out: HourPoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600000);
    const h = d.getHours() + d.getMinutes() / 60;
    const rng = mulberry32(d.getDate() * 100 + d.getHours());
    const temp = diurnalTemp(h) + (rng() - 0.5) * 1.1;
    const hi = heatIndexC(temp, 58 + Math.sin(h / 3.7) * 8);
    out.push({
      hour: `${String(d.getHours()).padStart(2, "0")}:00`,
      temp: round1(temp),
      heatIndex: round1(hi),
      risk: riskFromHeatIndex(hi, (rng() - 0.5) * 4),
    });
  }
  return out;
}

export function forecastSeries(now = new Date(), pastHours = 12, futureHours = 24): HourPoint[] {
  const out: HourPoint[] = [];
  for (let i = pastHours; i >= 1; i--) {
    const d = new Date(now.getTime() - i * 3600000);
    const h = d.getHours();
    const temp = diurnalTemp(h);
    const hi = heatIndexC(temp, 60);
    out.push({ hour: `${String(h).padStart(2, "0")}:00`, temp: round1(temp), heatIndex: round1(hi), risk: riskFromHeatIndex(hi) });
  }
  for (let i = 0; i <= futureHours; i++) {
    const d = new Date(now.getTime() + i * 3600000);
    const h = d.getHours();
    const temp = diurnalTemp(h) + 0.6; // tomorrow trends slightly hotter
    const hi = heatIndexC(temp, 18);
    out.push({ hour: `${String(h).padStart(2, "0")}:00`, temp: round1(temp), heatIndex: round1(hi), risk: riskFromHeatIndex(hi) });
  }
  return out;
}

/* ---------------------------------- zones ---------------------------------- */

const DISTRICTS = [
  "The Strip", "Downtown", "Summerlin", "Henderson", "Spring Valley", "Paradise",
  "Enterprise", "North Las Vegas", "Sunrise Manor", "Winchester", "Charleston",
  "Rancho", "Desert Shores", "Centennial Hills", "Aliante", "Anthem",
  "Green Valley", "Silverado Ranch", "Mountains Edge", "Southern Highlands",
  "Whitney Ranch", "The Lakes", "Tule Springs", "Inspirada",
];

const INTERVENTIONS = [
  "Tree Canopy", "Cool Roofs", "Shade Structures",
  "Cooling Stations", "Mist Corridors", "Green Medians",
];

export const ZONES: Zone[] = DISTRICTS.map((district, i) => {
  const rng = mulberry32(i * 977 + 13);
  const col = i % 6;
  const row = Math.floor(i / 6);
  const risk = Math.round(38 + rng() * 59);
  return {
    id: `zone-${String(i + 1).padStart(2, "0")}`,
    name: `Zone ${String(i + 1).padStart(2, "0")}`,
    district,
    x: 0.09 + col * 0.164 + (rng() - 0.5) * 0.05,
    y: 0.12 + row * 0.24 + (rng() - 0.5) * 0.07,
    risk,
    populationPct: Math.round(42 + rng() * 53),
    solar: Math.round(40 + rng() * 58),
    trend: round1((rng() - 0.45) * 6),
    interventions: [INTERVENTIONS[i % 6]!, INTERVENTIONS[(i + 2) % 6]!],
  };
});

export function geoaiRanking(): RankedZone[] {
  return ZONES.map((z) => ({
    ...z,
    priority: Math.round(0.52 * z.risk + 0.3 * z.populationPct + 0.18 * z.solar),
    rank: 0,
  }))
    .sort((a, b) => b.priority - a.priority)
    .map((z, i) => ({ ...z, rank: i + 1 }));
}

/* ---------------------------------- routes ---------------------------------- */

export function computeRoutes(_start: string, _dest: string): RouteOption[] {
  return [
    {
      id: "A",
      label: "Route A — Fastest",
      distanceKm: 3.1,
      timeMin: 9,
      exposure: 89,
      recommended: false,
      tone: "extreme",
      path: [
        { x: 0.14, y: 0.22 }, { x: 0.3, y: 0.3 }, { x: 0.48, y: 0.42 },
        { x: 0.66, y: 0.58 }, { x: 0.84, y: 0.74 },
      ],
    },
    {
      id: "B",
      label: "Route B — Balanced",
      distanceKm: 3.5,
      timeMin: 11.5,
      exposure: 56,
      recommended: false,
      tone: "moderate",
      path: [
        { x: 0.14, y: 0.22 }, { x: 0.26, y: 0.42 }, { x: 0.42, y: 0.55 },
        { x: 0.62, y: 0.62 }, { x: 0.84, y: 0.74 },
      ],
    },
    {
      id: "C",
      label: "Route C — Coolest",
      distanceKm: 3.8,
      timeMin: 14,
      exposure: 38,
      recommended: true,
      tone: "low",
      path: [
        { x: 0.14, y: 0.22 }, { x: 0.18, y: 0.5 }, { x: 0.3, y: 0.68 },
        { x: 0.52, y: 0.78 }, { x: 0.7, y: 0.82 }, { x: 0.84, y: 0.74 },
      ],
    },
  ];
}

/* -------------------------------- simulation -------------------------------- */

export function simulateIntervention(input: SimulationInput): SimulationResult {
  const before = 91;
  const reduction =
    input.trees * 0.18 + input.roofs * 0.15 + input.shade * 0.11 + input.stations * 0.08;
  const after = Math.max(28, Math.round(before - reduction));
  const deltaTemp = -round1(reduction * 0.082);
  const peopleProtected = Math.round(reduction * 459);
  return {
    before,
    after,
    deltaTemp,
    exposureBefore: riskBand(before).label.toUpperCase(),
    exposureAfter: riskBand(after).label.toUpperCase(),
    peopleProtected,
  };
}

/* -------------------------------- worker safety ----------------------------- */

export function workerGuidance(reading: LiveReading | null): WorkerGuidance {
  const risk = reading?.riskScore ?? 92;
  const band = riskBand(risk);
  return {
    riskLabel: risk >= 85 ? "VERY HIGH" : band.label.toUpperCase(),
    tone: band.tone,
    workWindow: "8:00 AM – 12:00 PM",
    breakEveryMin: 45,
    avoidWindow: "1:00 PM – 4:00 PM",
    hydration: "High",
    nextSafeWindow: "5:10 PM",
    score: Math.max(8, 100 - risk),
    timeline: [
      { start: 0, end: 6, label: "Safe", tone: "low" },
      { start: 6, end: 12, label: "Safe", tone: "low" },
      { start: 12, end: 13, label: "Caution", tone: "moderate" },
      { start: 13, end: 16, label: "Dangerous", tone: "high" },
      { start: 16, end: 17.2, label: "Extreme", tone: "extreme" },
      { start: 17.2, end: 24, label: "Safe", tone: "low" },
    ],
  };
}

/* ---------------------------------- impact ---------------------------------- */

export const IMPACT = {
  peopleProtected: 42800,
  highRiskZones: 17,
  interventions: 34,
  exposureReduction: 28,
  protectedByMonth: [
    { month: "Jan", value: 12400 }, { month: "Feb", value: 15800 },
    { month: "Mar", value: 22100 }, { month: "Apr", value: 30400 },
    { month: "May", value: 38900 }, { month: "Jun", value: 42800 },
  ],
  distribution: [
    { name: "Tree Canopy", value: 12 },
    { name: "Cool Roofs", value: 9 },
    { name: "Shade Structures", value: 7 },
    { name: "Cooling Stations", value: 6 },
  ],
  riskBeforeAfter: [
    { zone: "Zone 17", before: 94, after: 66 },
    { zone: "Zone 24", before: 88, after: 61 },
    { zone: "Zone 08", before: 83, after: 58 },
    { zone: "Zone 11", before: 79, after: 55 },
    { zone: "Zone 03", before: 74, after: 52 },
  ],
};

/* --------------------------------- helpers --------------------------------- */

export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function peakHeatWindow(now = new Date()): { peak: string; countdown: string } {
  const peak = new Date(now);
  peak.setHours(15, 0, 0, 0);
  if (peak.getTime() < now.getTime()) peak.setDate(peak.getDate() + 1);
  const diff = peak.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { peak: "15:00", countdown: `${h}h ${String(m).padStart(2, "0")}m` };
}
