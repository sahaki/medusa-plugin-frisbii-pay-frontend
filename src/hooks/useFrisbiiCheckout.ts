"use client"

import { useEffect, useState } from "react"
import { REEPAY_SDK_URL, REEPAY_SDK_SCRIPT_ID } from "../lib/constants"

/**
 * Hook to dynamically load Reepay SDK and track loading state
 * @param sessionId - Reepay session ID (triggers SDK loading when provided)
 * @returns Object with `loaded` boolean indicating SDK readiness
 * @example
 * ```tsx
 * const { loaded } = useFrisbiiCheckout(sessionId)
 * 
 * if (!loaded) {
 *   return <div>Loading payment...</div>
 * }
 * ```
 */
export function useFrisbiiCheckout(sessionId: string | null) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!sessionId) return

    // Check if script already exists
    const existingScript = document.getElementById(REEPAY_SDK_SCRIPT_ID)
    if (existingScript) {
      setLoaded(true)
      return
    }

    // Create and append script
    const script = document.createElement("script")
    script.id = REEPAY_SDK_SCRIPT_ID
    script.src = REEPAY_SDK_URL
    script.async = true
    script.onload = () => setLoaded(true)
    script.onerror = () => {
      console.error("[Frisbii] Failed to load Reepay SDK")
      setLoaded(false)
    }
    
    document.head.appendChild(script)
    
    // Cleanup on unmount (optional - you may want to keep SDK loaded)
    // Uncomment if you want to remove SDK when component unmounts
    // return () => {
    //   document.head.removeChild(script)
    // }
  }, [sessionId])

  return { loaded }
}
