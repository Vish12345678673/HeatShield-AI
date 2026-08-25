import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Metro } from "@/lib/metros";

import {
  TONE_HEX,
  riskBand,
  ZONES,
  type RouteOption,
} from "@/lib/heat-engine";

import {
  DARK_STYLES,
  loadGoogleMaps,
  zoneLatLng,
} from "@/components/heatshield/GoogleHeatMap";

import {
  HeatMap,
  layerValue,
} from "@/components/heatshield/HeatMap";

import { cn } from "@/lib/utils";

/**
 * Decode Google's encoded polyline format into
 * Google Maps latitude/longitude coordinates.
 */
function decodePolyline(
  encoded: string,
): google.maps.LatLngLiteral[] {
  const points: google.maps.LatLngLiteral[] = [];

  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat +=
      result & 1
        ? ~(result >> 1)
        : result >> 1;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng +=
      result & 1
        ? ~(result >> 1)
        : result >> 1;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return points;
}

/**
 * Legacy fallback for synthetic routes.
 *
 * If a route does not contain a real Google Routes API
 * encoded polyline or lat/lng path, project its normalized
 * coordinates into the selected metro's geographic box.
 */
function pathLatLng(
  metro: Metro,
  p: { x: number; y: number },
): google.maps.LatLngLiteral {
  return {
    lat:
      metro.box.north -
      p.y * (metro.box.north - metro.box.south),

    lng:
      metro.box.west +
      p.x * (metro.box.east - metro.box.west),
  };
}

interface GoogleRouteMapProps {
  metro: Metro;
  routes: RouteOption[];
  activeRouteId?: string | undefined;
  compare?: boolean;
  className?: string | undefined;
}

/**
 * Google Maps route visualization.
 *
 * Priority:
 *
 * 1. Real Google Routes API encoded polyline
 * 2. Already decoded lat/lng path
 * 3. Synthetic normalized route projected into selected metro
 *
 * Falls back to the existing HeatMap renderer if Google Maps
 * cannot be loaded.
 */
export function GoogleRouteMap({
  metro,
  routes,
  activeRouteId,
  compare,
  className,
}: GoogleRouteMapProps) {
  const browserKey = import.meta.env[
    "VITE_GOOGLE_MAPS_BROWSER_KEY"
  ] as string | undefined;

  const channel = import.meta.env[
    "VITE_GOOGLE_MAPS_TRACKING_ID"
  ] as string | undefined;

  const wrapRef = useRef<HTMLDivElement>(null);

  const mapRef = useRef<google.maps.Map | null>(null);

  const polylinesRef = useRef<
    Map<string, google.maps.Polyline>
  >(new Map());

  const markersRef = useRef<
    google.maps.Marker[]
  >([]);

  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  /**
   * Initialize Google Maps.
   *
   * The map is centered on the currently selected metro.
   */
  useEffect(() => {
    if (!browserKey) {
      setFailed(true);
      return;
    }

    let cancelled = false;

    setReady(false);

    loadGoogleMaps(browserKey, channel)
      .then(() => {
        if (
          cancelled ||
          !wrapRef.current
        ) {
          return;
        }

        /**
         * Remove old map instance references when
         * metro changes and the effect runs again.
         */
        if (mapRef.current) {
          mapRef.current = null;
        }

        const map = new google.maps.Map(
          wrapRef.current,
          {
            center: {
              lat: metro.lat,
              lng: metro.lng,
            },

            zoom: 13,

            styles: DARK_STYLES,

            disableDefaultUI: true,

            zoomControl: true,

            gestureHandling: "greedy",

            clickableIcons: false,

            backgroundColor: "#070B16",
          },
        );

        mapRef.current = map;

        /**
         * Add subtle thermal context.
         *
         * Uses the currently available ZONES dataset.
         */
        for (const z of ZONES) {
          const value = layerValue(
            z,
            "risk",
          );

          if (value < 55) {
            continue;
          }

          const band = riskBand(value);

          new google.maps.Circle({
            map,

            center: zoneLatLng(
              metro,
              z,
            ),

            radius:
              380 +
              (z.populationPct / 100) *
                1250,

            clickable: false,

            fillColor: band.hex,

            fillOpacity:
              0.05 +
              (value / 100) * 0.12,

            strokeColor: band.hex,

            strokeOpacity: 0.25,

            strokeWeight: 1,
          });
        }

        setReady(true);
      })
      .catch(() => {
        setFailed(true);
        setReady(false);
      });

    return () => {
      cancelled = true;

      /**
       * Remove existing polylines.
       */
      for (
        const polyline of
        polylinesRef.current.values()
      ) {
        polyline.setMap(null);
      }

      polylinesRef.current.clear();

      /**
       * Remove existing markers.
       */
      for (
        const marker of markersRef.current
      ) {
        marker.setMap(null);
      }

      markersRef.current = [];

      mapRef.current = null;
    };
  }, [
    browserKey,
    channel,
    metro,
  ]);

  /**
   * Draw and update routes.
   */
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !ready) {
      return;
    }

    /**
     * Remove previous polylines.
     */
    for (
      const polyline of
      polylinesRef.current.values()
    ) {
      polyline.setMap(null);
    }

    polylinesRef.current.clear();

    /**
     * Remove previous markers.
     */
    for (
      const marker of markersRef.current
    ) {
      marker.setMap(null);
    }

    markersRef.current = [];

    /**
     * Nothing to display.
     */
    if (!routes.length) {
      return;
    }

    const bounds =
      new google.maps.LatLngBounds();

    /**
     * First route's actual coordinates.
     * Used for start/end markers.
     */
    let firstRoutePath:
      google.maps.LatLngLiteral[] = [];

    /**
     * Draw every route.
     */
    for (const route of routes) {
      let path:
        google.maps.LatLngLiteral[];

      /**
       * Preferred:
       * real Google Routes API encoded polyline.
       */
      if (route.encodedPolyline) {
        path = decodePolyline(
          route.encodedPolyline,
        );
      }

      /**
       * Secondary:
       * already-decoded real coordinates.
       */
      else if (
        route.latLngPath &&
        route.latLngPath.length > 0
      ) {
        path = route.latLngPath;
      }

      /**
       * Legacy fallback:
       * normalized synthetic coordinates.
       */
      else {
        path = route.path.map(
          (
            point: {
              x: number;
              y: number;
            },
          ) =>
            pathLatLng(
              metro,
              point,
            ),
        );
      }

      /**
       * Ignore invalid routes.
       */
      if (!path.length) {
        continue;
      }

      if (
        route.id ===
        routes[0]?.id
      ) {
        firstRoutePath = path;
      }

      /**
       * Extend map bounds.
       */
      for (const point of path) {
        bounds.extend(point);
      }

      const isActive =
        compare ||
        activeRouteId === route.id;

      const polyline =
        new google.maps.Polyline({
          map,

          path,

          geodesic: true,

          strokeColor:
            TONE_HEX[route.tone],

          strokeOpacity:
            isActive
              ? 0.95
              : 0.3,

          strokeWeight:
            isActive
              ? 6
              : 4,

          zIndex:
            isActive
              ? 3
              : 1,
        });

      polylinesRef.current.set(
        route.id,
        polyline,
      );
    }

    /**
     * Start/end markers.
     */
    const first =
      firstRoutePath[0];

    const last =
      firstRoutePath[
        firstRoutePath.length - 1
      ];

    if (first && last) {
      const createMarker = (
        position:
          google.maps.LatLngLiteral,
        color: string,
        text: string,
      ): google.maps.Marker => {
        return new google.maps.Marker({
          map,

          position,

          clickable: false,

          icon: {
            path:
              google.maps.SymbolPath
                .CIRCLE,

            scale: 11,

            fillColor: color,

            fillOpacity: 1,

            strokeColor:
              "#070B16",

            strokeWeight: 3.5,
          },

          label: {
            text,

            color: "#070B16",

            fontSize: "11px",

            fontWeight: "800",
          },

          zIndex: 10,
        });
      };

      markersRef.current.push(
        createMarker(
          first,
          TONE_HEX.low,
          "A",
        ),
      );

      markersRef.current.push(
        createMarker(
          last,
          TONE_HEX.extreme,
          "B",
        ),
      );
    }

    /**
     * Fit map to actual route geometry.
     */
    if (!bounds.isEmpty()) {
      map.fitBounds(
        bounds,
        90,
      );
    }
  }, [
    routes,
    activeRouteId,
    compare,
    ready,
    metro,

  ]);

  /**
   * Google Maps unavailable:
   * use existing canvas fallback.
   */
  if (
    failed ||
    !browserKey
  ) {
    return (
      <HeatMap
        mode="2d"
        zones={ZONES}
        layer="risk"
        routes={routes}
        activeRouteId={
          compare
            ? undefined
            : activeRouteId
        }
        className={className}
      />
    );
  }

  /**
   * Google Maps UI.
   */
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-popover",
        className,
      )}
    >
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
    </div>
  );
}