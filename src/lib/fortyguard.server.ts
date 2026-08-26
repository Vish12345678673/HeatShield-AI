/**
 * FortyGuard Enterprise API — server-only client.
 *
 * Uses FORTYGUARD_API_KEY, which is read only on the server.
 *
 * Flow:
 *   1. POST /v1/env_params
 *   2. Poll GET /v1/status/{activity_id}
 *
 * Coordinates and timezone come from the selected metro.
 */

export interface FortyGuardRequest {
  seed: number;
  lat: number;
  lng: number;
  timezone: string;
}

export interface FortyGuardEnvReading {
  temperature: number;
  heatIndex: number | null;
  apparentTemperature: number | null;
  humidity: number | null;
  wetBulb: number | null;
  solarGhi: number | null;
  aqi: number | null;
  co2: number | null;
  timezone: string | null;
}

const BASE_URL = "https://api.fortyguard.com";

interface StatusPayload {
  error?: boolean;

  data?: {
    status?: string;

    result?: {
      metadata?: {
        timezone?: string;
      };

      locations?: Array<{
        temperature?: number;

        parameters?: Record<string, unknown>;

        solar_irradiance?: {
          clear_sky?: {
            ghi?: number;
          };
        };
      }>;
    };
  };
}

/**
 * FortyGuard returns time-aligned arrays.
 * null / -999 mean unavailable.
 */
function firstNumber(value: unknown): number | null {
  const candidate = Array.isArray(value)
    ? value[0]
    : value;

  const n = Number(candidate);

  return Number.isFinite(n) && n !== -999
    ? n
    : null;
}

function localDateTime(
  now: Date,
  timezone: string,
): {
  date: string;
  time: string;
} {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    },
  ).formatToParts(now);

  const get = (type: string) =>
    parts.find(
      (part) => part.type === type,
    )?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

export async function fetchFortyGuardEnv(
  request: FortyGuardRequest,
): Promise<FortyGuardEnvReading | null> {
  const apiKey =
    process.env["FORTYGUARD_API_KEY"];

  if (!apiKey) {
    console.warn(
      "[fortyguard] FORTYGUARD_API_KEY is not configured",
    );

    return null;
  }

  const {
    seed,
    lat,
    lng,
    timezone,
  } = request;

  const {
    date,
    time,
  } = localDateTime(
    new Date(),
    timezone,
  );

  const submitRes = await fetch(
    `${BASE_URL}/v1/env_params`,
    {
      method: "POST",

      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },

      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        temperature: seed,

        date_time: {
          start_date: date,
          start_time: time,
          filter_type: 1,
        },
      }),
    },
  );

  if (!submitRes.ok) {
    const body = await submitRes.text();

    throw new Error(
      `env_params submit failed: ${submitRes.status} ${body}`,
    );
  }

  const submitted =
    (await submitRes.json()) as {
      data?: {
        activity_id?: string;
      };
    };

  const activityId =
    submitted.data?.activity_id;

  if (!activityId) {
    throw new Error(
      "env_params returned no activity_id",
    );
  }

  const deadline =
    Date.now() + 75_000;

  while (Date.now() < deadline) {
    await new Promise(
      (resolve) =>
        setTimeout(resolve, 2000),
    );

    const statusRes = await fetch(
      `${BASE_URL}/v1/status/${activityId}`,
      {
        headers: {
          "api-key": apiKey,
          accept: "application/json",
        },
      },
    );

    if (!statusRes.ok) {
      console.warn(
        `[fortyguard] status poll HTTP ${statusRes.status}`,
      );

      continue;
    }

    const payload =
      (await statusRes.json()) as StatusPayload;

    const status =
      payload.data?.status;

    if (
      payload.error ||
      status === "Failed"
    ) {
      throw new Error(
        "env_params analysis failed",
      );
    }

    if (status !== "Completed") {
      continue;
    }

    const location =
      payload.data?.result
        ?.locations?.[0];

    if (!location) {
      throw new Error(
        "env_params result had no locations",
      );
    }

    const params =
      location.parameters ?? {};

    const temperature =
      Number(location.temperature);

    return {
      temperature:
        Number.isFinite(temperature)
          ? temperature
          : seed,

      heatIndex: firstNumber(
        params["heat_index_celsius"],
      ),

      apparentTemperature:
        firstNumber(
          params[
            "apparent_temperature_celsius"
          ],
        ),

      humidity: firstNumber(
        params[
          "relative_humidity_percent"
        ],
      ),

      wetBulb: firstNumber(
        params[
          "wet_bulb_temperature_celsius"
        ],
      ),

      solarGhi:
        location.solar_irradiance
          ?.clear_sky?.ghi ?? null,

      aqi: firstNumber(
        params["air_quality:idx"],
      ),

      co2: firstNumber(
        params["co2_ppm"],
      ),

      timezone:
        payload.data?.result
          ?.metadata?.timezone ??
        timezone,
    };
  }

  throw new Error(
    "env_params polling timed out",
  );
}