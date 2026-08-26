/**
 * Client-callable server function wrapping the FortyGuard Enterprise API.
 *
 * The API key never reaches the browser.
 * It is read from process.env.FORTYGUARD_API_KEY on the server.
 */

import { createServerFn } from "@tanstack/react-start";
import {
  fetchFortyGuardEnv,
  type FortyGuardEnvReading,
} from "./fortyguard.server";

export interface FortyGuardRequest {
  seed: number;
  lat: number;
  lng: number;
  timezone: string;
}

export const getFortyGuardReading = createServerFn({ method: "GET" })
  .validator((data: unknown): FortyGuardRequest => {
    if (
      typeof data !== "object" ||
      data === null ||
      !("seed" in data) ||
      !("lat" in data) ||
      !("lng" in data) ||
      !("timezone" in data)
    ) {
      throw new Error("Invalid FortyGuard request");
    }

    const input = data as Record<string, unknown>;

    const seed = Number(input["seed"]);
    const lat = Number(input["lat"]);
    const lng = Number(input["lng"]);
    const timezone = String(input["timezone"]);

    if (
      !Number.isFinite(seed) ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !timezone
    ) {
      throw new Error("Invalid FortyGuard request values");
    }

    return {
      seed,
      lat,
      lng,
      timezone,
    };
  })
  .handler(
    async ({
      data,
    }): Promise<FortyGuardEnvReading | null> => {
      try {
        return await fetchFortyGuardEnv(data);
      } catch (err) {
        console.error(
          "[fortyguard] live fetch failed:",
          err instanceof Error ? err.message : err,
        );

        return null;
      }
    },
  );