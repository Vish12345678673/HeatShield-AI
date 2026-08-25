import { createServerFn } from "@tanstack/react-start";

export interface GoogleRouteResult {
  id: string;
  distanceKm: number;
  timeMin: number;
  encodedPolyline: string;
}

interface ComputeRoutesResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    polyline?: {
      encodedPolyline?: string;
    };
  }>;
}

function parseDurationSeconds(value: string | undefined): number {
  if (!value) return 0;

  const match = value.match(/^([0-9]+(?:\.[0-9]+)?)s$/);

  return match ? Number(match[1]) : 0;
}

export const getGoogleRoutes = createServerFn({ method: "POST" })
  .validator((data: { start: string; dest: string }) => {
    const start = data?.start?.trim();
    const dest = data?.dest?.trim();

    if (!start || !dest) {
      throw new Error("Start and destination are required.");
    }

    return {
      start,
      dest,
    };
  })
  .handler(async ({ data }): Promise<GoogleRouteResult[]> => {
    const apiKey = process.env["GOOGLE_ROUTES_API_KEY"];

    if (!apiKey) {
      throw new Error("GOOGLE_ROUTES_API_KEY is not configured.");
    }

    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: {
            address: data.start,
          },

          destination: {
            address: data.dest,
          },

          travelMode: "DRIVE",

          routingPreference: "TRAFFIC_AWARE",

          computeAlternativeRoutes: true,

          polylineQuality: "HIGH_QUALITY",

          polylineEncoding: "ENCODED_POLYLINE",

          languageCode: "en-US",

          units: "METRIC",
        }),
      },
    );

    if (!response.ok) {
      const message = await response.text();

      throw new Error(
        `Google Routes API ${response.status}: ${message}`,
      );
    }

    const payload =
      (await response.json()) as ComputeRoutesResponse;

    const routes = payload.routes ?? [];

    if (!routes.length) {
      throw new Error(
        "Google Routes API returned no routes.",
      );
    }

    return routes.slice(0, 3).map((route, index) => ({
      id: String.fromCharCode(65 + index),

      distanceKm:
        Math.round(
          ((route.distanceMeters ?? 0) / 1000) * 10,
        ) / 10,

      timeMin:
        Math.round(
          (parseDurationSeconds(route.duration) / 60) * 10,
        ) / 10,

      encodedPolyline:
        route.polyline?.encodedPolyline ?? "",
    }));
  });