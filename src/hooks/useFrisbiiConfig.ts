"use client"

import { useEffect, useState } from "react"
import { getFrisbiiConfig } from "../lib/config"
import type { FrisbiiPublicConfig } from "../types"

/**
 * Hook to fetch Frisbii configuration from backend
 * @param backendUrl - Medusa backend URL
 * @returns Object with config data and loading state
 * @example
 * ```tsx
 * const { config, loading } = useFrisbiiConfig("http://localhost:9000")
 * 
 * if (loading) return <div>Loading...</div>
 * if (!config) return <div>Frisbii not configured</div>
 * ```
 */
export function useFrisbiiConfig(backendUrl: string) {
  const [config, setConfig] = useState<FrisbiiPublicConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFrisbiiConfig(backendUrl)
      .then(setConfig)
      .catch((error) => {
        console.error("[Frisbii] Error in useFrisbiiConfig:", error)
        setConfig(null)
      })
      .finally(() => setLoading(false))
  }, [backendUrl])

  return { config, loading }
}
