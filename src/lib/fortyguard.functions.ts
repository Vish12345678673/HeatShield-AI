/**
 * Client-callable server function wrapping the FortyGuard Enterprise API.
 * The API key never reaches the browser — it is read from
 * process.env.FORTYGUARD_API_KEY inside the server handler.
 *  
 * Accepts any supported US metro's coordinates + timezone so the live data
 * layer follows the metro selected in the app.
 */
import { createServerFn } from "@tanstack/react-start";
import { fetchFortyGuardEnv, type FortyGuardEnvReading } from "./fortyguard.server";


export const getFortyGuardReading = createServerFn({ method: "GET" })
  .validator((seed: unknown) =>
    typeof seed === "number" && Number.isFinite(seed) ? seed : 32,
  )
  .handler(async ({ data }): Promise<FortyGuardEnvReading | null> => {
    try {
      return await fetchFortyGuardEnv(data);
    } catch (err) {
      console.error("[fortyguard] live fetch failed:", err instanceof Error ? err.message : err);
      return null;
    }
  });
