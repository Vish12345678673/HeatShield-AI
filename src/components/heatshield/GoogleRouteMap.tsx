import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import type { Metro } from "@/lib/metros";
import type { RouteOption } from "@/lib/heat-engine";

import {
  loadGoogleMaps,
  DARK_STYLES,
} from "@/components/heatshield/GoogleHeatMap";

import {
  TONE_HEX,
  riskBand,
} from "@/lib/heat-engine";

import { cn } from "@/lib/utils";

interface GoogleRouteMapProps {
  metro: Metro;
  start: string;
  destination: string;
  routes: RouteOption[];
  activeRouteId?: string;
  compare?: boolean;
  onRoutesCalculated: (
    routes: RouteOption[],
  ) => void;
  onRouteError: (
    message: string,
  ) => void;
  className?: string;
}

type RoutePoint = {
  x: number;
  y: number;
};

function pathLatLng(
  metro: Metro,
  point: RoutePoint,
): google.maps.LatLngLiteral {
  return {
    lat:
      metro.box.north -
      point.y *
        (metro.box.north - metro.box.south),

    lng:
      metro.box.west +
      point.x *
        (metro.box.east - metro.box.west),
  };
}

function getValidPoints(
  path: RouteOption["path"],
): RoutePoint[] {
  return path.filter(
    (
      point,
    ): point is RoutePoint =>
      point != null &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y),
  );
}

export function GoogleRouteMap({
  metro,
  start,
  destination,
  routes,
  activeRouteId,
  compare = false,
  onRoutesCalculated,
  onRouteError,
  className,
}: GoogleRouteMapProps) {
  const browserKey =
    (import.meta.env[
      "VITE_GOOGLE_MAPS_BROWSER_KEY"
    ] as string | undefined) ?? "";

  const channel =
    (import.meta.env[
      "VITE_GOOGLE_MAPS_TRACKING_ID"
    ] as string | undefined) ?? "";

  const mapContainerRef =
    useRef<HTMLDivElement>(null);

  const mapRef =
    useRef<google.maps.Map | null>(null);

  const polylinesRef =
    useRef<
      Map<
        string,
        google.maps.Polyline
      >
    >(new Map());

  const markersRef =
    useRef<google.maps.Marker[]>([]);

  const [ready, setReady] =
    useState(false);

  const [failed, setFailed] =
    useState(false);

  const onRouteErrorRef =
    useRef(onRouteError);

  const onRoutesCalculatedRef =
    useRef(onRoutesCalculated);

  useEffect(() => {
    onRouteErrorRef.current =
      onRouteError;
  }, [onRouteError]);

  useEffect(() => {
    onRoutesCalculatedRef.current =
      onRoutesCalculated;
  }, [onRoutesCalculated]);

  /*
   * Initialize Google Maps.
   */
  useEffect(() => {
    if (!browserKey) {
      setFailed(true);
      setReady(false);

      onRouteErrorRef.current(
        "Google Maps browser API key is not configured.",
      );

      return;
    }

    let cancelled = false;

    async function initializeMap() {
      try {
        await loadGoogleMaps(
          browserKey,
          channel,
        );

        if (cancelled) {
          return;
        }

        const container =
          mapContainerRef.current;

        if (!container) {
          return;
        }

        const map =
          new google.maps.Map(
            container,
            {
              center: {
                lat: metro.lat,
                lng: metro.lng,
              },

              zoom: 13,

              styles: DARK_STYLES,

              disableDefaultUI: true,

              zoomControl: true,

              gestureHandling:
                "greedy",

              clickableIcons: false,

              backgroundColor:
                "#070B16",
            },
          );

        if (cancelled) {
          return;
        }

        mapRef.current = map;

        setFailed(false);
        setReady(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "[HeatShield AI] Google Maps initialization failed:",
          error,
        );

        setFailed(true);
        setReady(false);

        onRouteErrorRef.current(
          "Google Maps could not be loaded.",
        );
      }
    }

    void initializeMap();

    return () => {
      cancelled = true;

      for (
        const polyline of
        polylinesRef.current.values()
      ) {
        polyline.setMap(null);
      }

      polylinesRef.current.clear();

      for (
        const marker of
        markersRef.current
      ) {
        marker.setMap(null);
      }

      markersRef.current = [];

      if (mapRef.current) {
        google.maps.event.clearInstanceListeners(
          mapRef.current,
        );

        mapRef.current = null;
      }

      setReady(false);
    };
  }, [
    browserKey,
    channel,
    metro.id,
    metro.lat,
    metro.lng,
  ]);

  /*
   * Draw routes.
   */
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !ready) {
      return;
    }

    for (
      const polyline of
      polylinesRef.current.values()
    ) {
      polyline.setMap(null);
    }

    polylinesRef.current.clear();

    if (!routes.length) {
      return;
    }

    const bounds =
      new google.maps.LatLngBounds();

    for (const route of routes) {
      if (
        !route.path ||
        route.path.length === 0
      ) {
        continue;
      }

      const validPoints =
        getValidPoints(
          route.path,
        );

      if (!validPoints.length) {
        continue;
      }

      const points =
        validPoints.map(
          (point) =>
            pathLatLng(
              metro,
              point,
            ),
        );

      const isActive =
        compare ||
        route.id ===
          activeRouteId;

      const band =
        riskBand(
          route.exposure,
        );

      const tone =
        TONE_HEX[band.tone];

      const polyline =
        new google.maps.Polyline({
          path: points,

          geodesic: true,

          strokeColor: tone,

          strokeOpacity:
            isActive
              ? 0.95
              : 0.32,

          strokeWeight:
            isActive
              ? 6
              : 3,

          zIndex:
            isActive
              ? 20
              : 10,

          map,
        });

      polylinesRef.current.set(
        route.id,
        polyline,
      );

      for (const point of points) {
        bounds.extend(point);
      }
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(
        bounds,
        48,
      );
    }
  }, [
    metro,
    routes,
    activeRouteId,
    compare,
    ready,
  ]);

  /*
   * Draw start and destination markers.
   */
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !ready) {
      return;
    }

    for (
      const marker of
      markersRef.current
    ) {
      marker.setMap(null);
    }

    markersRef.current = [];

    if (!routes.length) {
      return;
    }

    const selectedRoute =
      routes.find(
        (route) =>
          route.id ===
          activeRouteId,
      ) ?? routes[0];

    if (!selectedRoute) {
      return;
    }

    const validPoints =
      getValidPoints(
        selectedRoute.path,
      );

    if (!validPoints.length) {
      return;
    }

    const first =
      validPoints[0];

    const last =
      validPoints[
        validPoints.length - 1
      ];

    if (!first || !last) {
      return;
    }

    const startPosition =
      pathLatLng(
        metro,
        first,
      );

    const endPosition =
      pathLatLng(
        metro,
        last,
      );

    const startMarker =
      new google.maps.Marker({
        map,
        position:
          startPosition,
        title:
          start || "Start",
        label: {
          text: "A",
          color: "#ffffff",
          fontWeight: "700",
        },
      });

    const endMarker =
      new google.maps.Marker({
        map,
        position:
          endPosition,
        title:
          destination ||
          "Destination",
        label: {
          text: "B",
          color: "#ffffff",
          fontWeight: "700",
        },
      });

    markersRef.current.push(
      startMarker,
      endMarker,
    );

    return () => {
      startMarker.setMap(null);
      endMarker.setMap(null);
    };
  }, [
    metro,
    routes,
    activeRouteId,
    ready,
    start,
    destination,
  ]);

  /*
   * Keep callback available for the existing
   * GoogleRouteMapProps contract.
   */
  useEffect(() => {
    void onRoutesCalculatedRef.current;
  }, []);

  /*
   * Google Maps failed.
   */
  if (failed) {
    return (
      <div
        className={cn(
          "relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-background",
          className,
        )}
      >
        <div className="max-w-sm px-6 text-center">
          <p className="font-display text-sm font-semibold">
            Google Maps unavailable
          </p>

          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Configure
            VITE_GOOGLE_MAPS_BROWSER_KEY
            to enable the live map.
          </p>
        </div>
      </div>
    );
  }

  /*
   * Normal map.
   */
  return (
    <div
      className={cn(
        "relative min-h-[420px] overflow-hidden rounded-2xl border border-border bg-background",
        className,
      )}
    >
      {/*
       * IMPORTANT:
       * Google Maps owns this DOM node.
       * Never put React children inside it.
       */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0"
      />

      {/*
       * React-owned loading layer.
       * This stays OUTSIDE the Google Maps node.
       */}
      {!ready && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card/90 px-4 py-3 text-xs text-muted-foreground shadow-xl">
            <Loader2 className="size-4 animate-spin text-cyan" />
            <span>Loading map…</span>
          </div>
        </div>
      )}
    </div>
  );
}