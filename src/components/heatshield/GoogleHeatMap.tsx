import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { riskBand, type Zone } from "@/lib/heat-engine";
import { HeatMap, layerValue, type HeatLayer } from "@/components/heatshield/HeatMap";
import { cn } from "@/lib/utils";
import type { Metro } from "@/lib/metros";

/** Las Vegas metro center — matches the FortyGuard live reading location. */
export function zoneLatLng(
  metro: Metro,
  z: Zone,
): google.maps.LatLngLiteral {
  return {
    lat:
      metro.box.north -
      z.y * (metro.box.north - metro.box.south),

    lng:
      metro.box.west +
      z.x * (metro.box.east - metro.box.west),
  };
}

export const DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0b1120" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a94a8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1120" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#2a3450" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a2338" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#5f6b85" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2a3450" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#9aa5bd" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1a2e" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a5a78" }] },
];

let gmapsPromise: Promise<void> | null = null;

export function loadGoogleMaps(key: string, channel?: string): Promise<void> {
  if (window.google?.maps?.Map) return Promise.resolve();
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise<void>((resolve, reject) => {
    (window as unknown as Record<string, unknown>)["__heatshieldInitMap"] = () => resolve();
    const s = document.createElement("script");
    const ch = channel ? `&channel=${channel}` : "";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__heatshieldInitMap${ch}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(s);
  });
  return gmapsPromise;
}

interface ZoneOverlay {
  area: google.maps.Circle;
  core: google.maps.Circle;
  baseRadius: number;
  phase: number;
}

interface GoogleHeatMapProps {
  metro: Metro;
  mode?: "2d" | "3d";
  zones: Zone[];
  layer?: HeatLayer;
  focusZoneId?: string | undefined;
  focusNonce?: number | undefined;
  className?: string | undefined;
}

/**
 * Real-time geographic heat map — Google Maps with live thermal zone overlays.
 * Falls back to the canvas renderer when the Maps browser key is unavailable.
 */
export function GoogleHeatMap({
  metro,
  mode = "2d",
  zones,
  layer = "risk",
  focusZoneId,
  focusNonce,
  className,
}: GoogleHeatMapProps) {
  const browserKey = import.meta.env["VITE_GOOGLE_MAPS_BROWSER_KEY"] as
    | string
    | undefined;
  const channel = import.meta.env["VITE_GOOGLE_MAPS_TRACKING_ID"] as
    | string
    | undefined;

  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlayViewRef = useRef<google.maps.OverlayView | null>(null);
  const overlaysRef = useRef<Map<string, ZoneOverlay>>(new Map());
  const stateRef = useRef({ mode, zones, layer });
  stateRef.current = { mode, zones, layer };
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [tip, setTip] = useState<{ zone: Zone; x: number; y: number } | null>(null);

  const showTip = (zone: Zone, latLng: google.maps.LatLng | google.maps.LatLngLiteral) => {
    // Only an OverlayView's MapCanvasProjection exposes container-pixel
    // conversion — map.getProjection() lacks it at runtime.
    const proj = overlayViewRef.current?.getProjection();
    if (!proj) return;
    const p = proj.fromLatLngToContainerPixel(latLng);
    if (p) setTip({ zone, x: p.x, y: p.y });
  };

  /* ----- init map + overlays ----- */
  useEffect(() => {
    if (!browserKey) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    loadGoogleMaps(browserKey, channel)
      .then(() => {
        if (cancelled || !wrapRef.current || mapRef.current) return;
        const map = new google.maps.Map(wrapRef.current, {
          center: {
            lat: metro.lat,
            lng: metro.lng,
          },
          zoom: 11,
          styles: DARK_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          backgroundColor: "#070B16",
        });
        mapRef.current = map;

        // Empty OverlayView purely to access MapCanvasProjection for tooltips.
        const ov = new google.maps.OverlayView();
        ov.onAdd = () => undefined;
        ov.draw = () => undefined;
        ov.onRemove = () => undefined;
        ov.setMap(map);
        overlayViewRef.current = ov;

        for (const z of stateRef.current.zones) {
          const v = layerValue(z, stateRef.current.layer);
          const band = riskBand(v);
          const center = zoneLatLng(metro, z);
          const baseRadius = 380 + (z.populationPct / 100) * 1250;
          const area = new google.maps.Circle({
            map,
            center,
            radius: baseRadius,
            clickable: false, // keep map panning smooth; hover is hit-tested manually
            fillColor: band.hex,
            fillOpacity: 0.16 + (v / 100) * 0.36,
            strokeColor: band.hex,
            strokeOpacity: 0.85,
            strokeWeight: 1.5,
          });
          const core = new google.maps.Circle({
            map,
            center,
            radius: 130,
            clickable: false,
            fillColor: band.hex,
            fillOpacity: 0.9,
            strokeOpacity: 0,
            visible: v >= 62,
          });
          overlaysRef.current.set(z.id, { area, core, baseRadius, phase: z.x * 20 });
        }

        // manual hover hit-test so circles never block dragging
        map.addListener("mousemove", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          let best: Zone | null = null;
          let bestD = Infinity;
          for (const z of stateRef.current.zones) {
            const c = zoneLatLng(metro,z);
            const dx = (lng - c.lng) * 111320 * Math.cos((c.lat * Math.PI) / 180);
            const dy = (lat - c.lat) * 110540;
            const d = Math.hypot(dx, dy);
            const r = overlaysRef.current.get(z.id)?.baseRadius ?? 0;
            if (d <= r && d < bestD) {
              bestD = d;
              best = z;
            }
          }
          if (best) showTip(best, e.latLng);
          else setTip(null);
        });
        map.addListener("mouseout", () => setTip(null));
        map.addListener("dragstart", () => setTip(null));

        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserKey]);

  /* ----- 2D / 3D satellite toggle ----- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (mode === "3d") {
      map.setMapTypeId("hybrid");
      map.setZoom(Math.max(map.getZoom() ?? 11, 16));
      map.setTilt(45);
    } else {
      map.setTilt(0);
      map.setMapTypeId("roadmap");
      map.setZoom(Math.min(map.getZoom() ?? 11, 12));
    }
  }, [mode]);

  /* ----- recolor overlays when layer/zones change ----- */
  useEffect(() => {
    for (const z of zones) {
      const entry = overlaysRef.current.get(z.id);
      if (!entry) continue;
      const v = layerValue(z, layer);
      const band = riskBand(v);
      entry.area.setOptions({
        fillColor: band.hex,
        strokeColor: band.hex,
        fillOpacity: 0.16 + (v / 100) * 0.36,
      });
      entry.core.setOptions({ fillColor: band.hex, visible: v >= 62 });
    }
  }, [zones, layer]);

  /* ----- gentle live pulse on zone radii ----- */
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      for (const entry of overlaysRef.current.values()) {
        entry.area.setRadius(entry.baseRadius * (1 + 0.05 * Math.sin(t / 900 + entry.phase)));
      }
    }, 900);
    return () => clearInterval(id);
  }, []);

  /* ----- focus a zone from an external card ----- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusZoneId) return;
    const z = zones.find((zone) => zone.id === focusZoneId);
    if (!z) return;
    const c = zoneLatLng(metro, z);
    map.panTo(c);
    map.setZoom(Math.max(map.getZoom() ?? 11, 13));
    const idle = map.addListener("idle", () => {
      showTip(z, c);
      google.maps.event.removeListener(idle);
    });
  }, [focusZoneId, focusNonce, zones]);

  if (failed || !browserKey) {
    return <HeatMap mode={mode} zones={zones} layer={layer} className={className} />;
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-popover",
        className,
      )}
    >
      <div ref={wrapRef} className="absolute inset-0" />
      {!ready ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-popover">
          <Loader2 className="size-6 animate-spin text-peach" />
          <p className="font-display text-xs tracking-[0.18em] text-muted-foreground">
            LOADING LIVE MAP
          </p>
        </div>
      ) : null}
      {tip ? (
        <div
          className="glass-panel-strong pointer-events-none absolute z-10 w-48 rounded-xl p-3 animate-scale-in"
          style={{
            left: Math.min(tip.x + 14, (wrapRef.current?.clientWidth ?? 300) - 200),
            top: Math.max(tip.y - 10, 8),
          }}
        >
          <p className="font-display text-xs font-semibold">
            {tip.zone.name} · {tip.zone.district}
          </p>
          <div className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Risk</span>
              <span className="font-semibold" style={{ color: riskBand(tip.zone.risk).hex }}>
                {tip.zone.risk}/100
              </span>
            </div>
            <div className="flex justify-between">
              <span>Population</span>
              <span>{tip.zone.populationPct}%</span>
            </div>
            <div className="flex justify-between">
              <span>Solar</span>
              <span>{tip.zone.solar}%</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
