import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  riskBand,
  type Zone,
} from "@/lib/heat-engine";

import {
  HeatMap,
  layerValue,
  type HeatLayer,
} from "@/components/heatshield/HeatMap";

import { cn } from "@/lib/utils";
import type { Metro } from "@/lib/metros";

/* -------------------------------------------------------------------------- */
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */

export function zoneLatLng(
  metro: Metro,
  z: Zone,
): google.maps.LatLngLiteral {
  return {
    lat:
      metro.box.north -
      z.y *
        (metro.box.north - metro.box.south),

    lng:
      metro.box.west +
      z.x *
        (metro.box.east - metro.box.west),
  };
}

export const DARK_STYLES: google.maps.MapTypeStyle[] = [
  {
    elementType: "geometry",
    stylers: [{ color: "#0b1120" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a94a8" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0b1120" }],
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#2a3450" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1a2338" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5f6b85" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2a3450" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9aa5bd" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e1a2e" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4a5a78" }],
  },
];

/* -------------------------------------------------------------------------- */
/* google maps loader                                                         */
/* -------------------------------------------------------------------------- */

let gmapsPromise: Promise<void> | null = null;

export function loadGoogleMaps(
  key: string,
  channel?: string,
): Promise<void> {
  if (window.google?.maps?.Map) {
    return Promise.resolve();
  }

  if (gmapsPromise) {
    return gmapsPromise;
  }

  gmapsPromise = new Promise<void>(
    (resolve, reject) => {
      (
        window as unknown as Record<
          string,
          unknown
        >
      )["__heatshieldInitMap"] = () => resolve();

      const script =
        document.createElement("script");

      const ch = channel
        ? `&channel=${channel}`
        : "";

      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__heatshieldInitMap${ch}`;

      script.async = true;
      script.defer = true;

      script.onerror = () =>
        reject(
          new Error(
            "Google Maps failed to load",
          ),
        );

      document.head.appendChild(script);
    },
  );

  return gmapsPromise;
}

/* -------------------------------------------------------------------------- */
/* types                                                                      */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* component                                                                  */
/* -------------------------------------------------------------------------- */

export function GoogleHeatMap({
  metro,
  mode = "2d",
  zones,
  layer = "risk",
  focusZoneId,
  focusNonce,
  className,
}: GoogleHeatMapProps) {
  const browserKey =
    import.meta.env[
      "VITE_GOOGLE_MAPS_BROWSER_KEY"
    ] as string | undefined;

  const channel =
    import.meta.env[
      "VITE_GOOGLE_MAPS_TRACKING_ID"
    ] as string | undefined;

  /*
   * Google owns the contents of this element.
   * React must never render children inside it.
   */
  const wrapRef =
    useRef<HTMLDivElement>(null);

  const mapRef =
    useRef<google.maps.Map | null>(null);

  const overlayViewRef =
    useRef<google.maps.OverlayView | null>(
      null,
    );

  const overlaysRef =
    useRef<Map<string, ZoneOverlay>>(
      new Map(),
    );

  /*
   * Keep current data available to Google Maps
   * event handlers without recreating listeners.
   */
  const stateRef = useRef<{
    mode: "2d" | "3d";
    zones: Zone[];
    layer: HeatLayer;
    metro: Metro;
  }>({
    mode,
    zones,
    layer,
    metro,
  });

  stateRef.current = {
    mode,
    zones,
    layer,
    metro,
  };

  const [failed, setFailed] =
    useState(false);

  const [ready, setReady] =
    useState(false);

  const [tip, setTip] =
    useState<{
      zone: Zone;
      x: number;
      y: number;
    } | null>(null);

  /* ------------------------------------------------------------------------ */
  /* tooltip                                                                   */
  /* ------------------------------------------------------------------------ */

  const showTip = (
    zone: Zone,
    latLng:
      | google.maps.LatLng
      | google.maps.LatLngLiteral,
  ) => {
    const projection =
      overlayViewRef.current?.getProjection();

    if (!projection) {
      return;
    }

    const point =
      projection.fromLatLngToContainerPixel(
        latLng,
      );

    if (point) {
      setTip({
        zone,
        x: point.x,
        y: point.y,
      });
    }
  };

  /* ------------------------------------------------------------------------ */
  /* initialize google map                                                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!browserKey) {
      setFailed(true);
      return;
    }

    let cancelled = false;

    loadGoogleMaps(browserKey, channel)
      .then(() => {
        if (
          cancelled ||
          !wrapRef.current ||
          mapRef.current
        ) {
          return;
        }

        const map =
          new google.maps.Map(
            wrapRef.current,
            {
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

              backgroundColor:
                "#070B16",
            },
          );

        mapRef.current = map;

        /*
         * Empty OverlayView used only for
         * converting LatLng -> container pixels.
         */
        const overlayView =
          new google.maps.OverlayView();

        overlayView.onAdd = () =>
          undefined;

        overlayView.draw = () =>
          undefined;

        overlayView.onRemove = () =>
          undefined;

        overlayView.setMap(map);

        overlayViewRef.current =
          overlayView;

        /*
         * Create thermal circles.
         */
        for (const zone of
          stateRef.current.zones) {
          const value = layerValue(
            zone,
            stateRef.current.layer,
          );

          const band =
            riskBand(value);

          const center =
            zoneLatLng(
              stateRef.current.metro,
              zone,
            );

          const baseRadius =
            380 +
            (zone.populationPct / 100) *
              1250;

          const area =
            new google.maps.Circle({
              map,

              center,

              radius: baseRadius,

              clickable: false,

              fillColor: band.hex,

              fillOpacity:
                0.16 +
                (value / 100) * 0.36,

              strokeColor: band.hex,

              strokeOpacity: 0.85,

              strokeWeight: 1.5,
            });

          const core =
            new google.maps.Circle({
              map,

              center,

              radius: 130,

              clickable: false,

              fillColor: band.hex,

              fillOpacity: 0.9,

              strokeOpacity: 0,

              visible: value >= 62,
            });

          overlaysRef.current.set(
            zone.id,
            {
              area,
              core,
              baseRadius,
              phase: zone.x * 20,
            },
          );
        }

        /*
         * Manual hover hit testing.
         *
         * Circles remain non-clickable so the user
         * can still drag the map naturally.
         */
        map.addListener(
          "mousemove",
          (
            event: google.maps.MapMouseEvent,
          ) => {
            if (!event.latLng) {
              return;
            }

            const lat =
              event.latLng.lat();

            const lng =
              event.latLng.lng();

            let best: Zone | null =
              null;

            let bestDistance =
              Infinity;

            const currentMetro =
              stateRef.current.metro;

            for (const zone of
              stateRef.current.zones) {
              const center =
                zoneLatLng(
                  currentMetro,
                  zone,
                );

              const dx =
                (lng - center.lng) *
                111320 *
                Math.cos(
                  (center.lat *
                    Math.PI) /
                    180,
                );

              const dy =
                (lat - center.lat) *
                110540;

              const distance =
                Math.hypot(dx, dy);

              const radius =
                overlaysRef.current.get(
                  zone.id,
                )?.baseRadius ?? 0;

              if (
                distance <= radius &&
                distance < bestDistance
              ) {
                bestDistance =
                  distance;

                best = zone;
              }
            }

            if (best) {
              showTip(
                best,
                event.latLng,
              );
            } else {
              setTip(null);
            }
          },
        );

        map.addListener(
          "mouseout",
          () => setTip(null),
        );

        map.addListener(
          "dragstart",
          () => setTip(null),
        );

        if (!cancelled) {
          setFailed(false);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };

    // The Google map intentionally initializes once.
    // Metro changes are handled by the dedicated effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserKey]);

  /* ------------------------------------------------------------------------ */
  /* IMPORTANT: move map when metro changes                                   */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !ready) {
      return;
    }

    /*
     * Move the actual Google map.
     *
     * This is the part the previous implementation was missing.
     */
    map.panTo({
      lat: metro.lat,
      lng: metro.lng,
    });

    /*
     * Keep the normal city-level zoom.
     */
    map.setZoom(
      mode === "3d" ? 16 : 11,
    );

    /*
     * Move every existing heat overlay
     * to the new metro's coordinate system.
     */
    for (const zone of zones) {
      const overlay =
        overlaysRef.current.get(
          zone.id,
        );

      if (!overlay) {
        continue;
      }

      const center =
        zoneLatLng(metro, zone);

      overlay.area.setCenter(center);
      overlay.core.setCenter(center);
    }

    /*
     * Remove overlays for zones that no
     * longer exist in the selected metro.
     */
    const currentIds = new Set(
      zones.map((zone) => zone.id),
    );

    for (const [
      zoneId,
      overlay,
    ] of overlaysRef.current) {
      if (!currentIds.has(zoneId)) {
        overlay.area.setMap(null);
        overlay.core.setMap(null);

        overlaysRef.current.delete(
          zoneId,
        );
      }
    }

    setTip(null);
  }, [
    metro.id,
    metro.lat,
    metro.lng,
    zones,
    ready,
    mode,
  ]);

  /* ------------------------------------------------------------------------ */
  /* 2D / 3D                                                                   */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    if (mode === "3d") {
      map.setMapTypeId("hybrid");

      map.setZoom(
        Math.max(
          map.getZoom() ?? 11,
          16,
        ),
      );

      map.setTilt(45);
    } else {
      map.setTilt(0);

      map.setMapTypeId(
        "roadmap",
      );

      map.setZoom(
        Math.min(
          map.getZoom() ?? 11,
          12,
        ),
      );
    }
  }, [mode]);

  /* ------------------------------------------------------------------------ */
  /* recolor / update heat overlays                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    for (const zone of zones) {
      const overlay =
        overlaysRef.current.get(
          zone.id,
        );

      if (!overlay) {
        continue;
      }

      const value = layerValue(
        zone,
        layer,
      );

      const band =
        riskBand(value);

      overlay.area.setOptions({
        fillColor: band.hex,

        strokeColor: band.hex,

        fillOpacity:
          0.16 +
          (value / 100) * 0.36,
      });

      overlay.core.setOptions({
        fillColor: band.hex,

        visible: value >= 62,
      });
    }
  }, [zones, layer]);

  /* ------------------------------------------------------------------------ */
  /* pulse                                                                      */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        const timestamp =
          Date.now();

        for (const overlay of
          overlaysRef.current.values()) {
          overlay.area.setRadius(
            overlay.baseRadius *
              (
                1 +
                0.05 *
                  Math.sin(
                    timestamp / 900 +
                      overlay.phase,
                  )
              ),
          );
        }
      }, 900);

    return () =>
      window.clearInterval(
        interval,
      );
  }, []);

  /* ------------------------------------------------------------------------ */
  /* focus zone                                                                 */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !focusZoneId) {
      return;
    }

    const zone =
      zones.find(
        (item) =>
          item.id === focusZoneId,
      );

    if (!zone) {
      return;
    }

    const center =
      zoneLatLng(
        metro,
        zone,
      );

    map.panTo(center);

    map.setZoom(
      Math.max(
        map.getZoom() ?? 11,
        13,
      ),
    );

    const idle =
      map.addListener(
        "idle",
        () => {
          showTip(
            zone,
            center,
          );

          google.maps.event.removeListener(
            idle,
          );
        },
      );

    return () => {
      google.maps.event.removeListener(
        idle,
      );
    };
  }, [
    focusZoneId,
    focusNonce,
    zones,
    metro.id,
  ]);

  /* ------------------------------------------------------------------------ */
  /* fallback                                                                   */
  /* ------------------------------------------------------------------------ */

  if (failed || !browserKey) {
    return (
      <HeatMap
        mode={mode}
        zones={zones}
        layer={layer}
        className={className}
      />
    );
  }

  /* ------------------------------------------------------------------------ */
  /* render                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-popover",
        className,
      )}
    >
      {/*
       * Google Maps owns this element.
       * React does not render anything inside it.
       */}
      <div
        ref={wrapRef}
        className="absolute inset-0"
      />

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
            left: Math.min(
              tip.x + 14,
              (wrapRef.current
                ?.clientWidth ??
                300) - 200,
            ),

            top: Math.max(
              tip.y - 10,
              8,
            ),
          }}
        >
          <p className="font-display text-xs font-semibold">
            {tip.zone.name} ·{" "}
            {tip.zone.district}
          </p>

          <div className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Risk</span>

              <span
                className="font-semibold"
                style={{
                  color:
                    riskBand(
                      tip.zone.risk,
                    ).hex,
                }}
              >
                {tip.zone.risk}/100
              </span>
            </div>

            <div className="flex justify-between">
              <span>
                Population
              </span>

              <span>
                {tip.zone.populationPct}%
              </span>
            </div>

            <div className="flex justify-between">
              <span>Solar</span>

              <span>
                {tip.zone.solar}%
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}