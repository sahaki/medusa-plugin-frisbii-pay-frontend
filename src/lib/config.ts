import type { FrisbiiPublicConfig } from "../types"

/**
 * Fetch Frisbii public configuration from backend
 * @param backendUrl - Medusa backend URL (e.g., "http://localhost:9000")
 * @returns Public configuration or null if failed
 */
export async function getFrisbiiConfig(
  backendUrl: string
): Promise<FrisbiiPublicConfig | null> {
  try {
    const res = await fetch(`${backendUrl}/store/frisbii/config`)
    if (!res.ok) {
      console.warn("[Frisbii] Failed to fetch config:", res.statusText)
      return null
    }
    const data = await res.json()
    return data.config || null
  } catch (error) {
    console.error("[Frisbii] Error fetching config:", error)
    return null
  }
}
