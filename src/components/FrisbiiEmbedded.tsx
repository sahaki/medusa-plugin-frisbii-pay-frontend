"use client"

import { useEffect, useRef } from "react"
import { useFrisbiiCheckout } from "../hooks/useFrisbiiCheckout"
import type { FrisbiiDisplayModeProps } from "../types"

/**
 * Frisbii Embedded Checkout Component
 * Renders Reepay checkout form embedded directly in the page
 * @example
 * ```tsx
 * <FrisbiiEmbedded 
 *   sessionId="reepay_session_123"
 *   onComplete={() => console.log("Payment completed")}
 *   onCancel={() => console.log("Payment cancelled")}
 * />
 * ```
 */
export function FrisbiiEmbedded({
  sessionId,
  onComplete,
  onCancel,
}: FrisbiiDisplayModeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { loaded } = useFrisbiiCheckout(sessionId)

  useEffect(() => {
    if (!loaded || !containerRef.current || !sessionId) return

    try {
      const rp = new window.Reepay.EmbeddedCheckout(sessionId, {
        html_element: containerRef.current,
      })

      rp.addEventHandler(window.Reepay.Event.Accept, () => {
        onComplete?.()
      })

      rp.addEventHandler(window.Reepay.Event.Cancel, () => {
        onCancel?.()
      })

      // Cleanup on unmount
      return () => rp.destroy?.()
    } catch (error) {
      console.error("[Frisbii] Error initializing embedded checkout:", error)
      return undefined
    }
  }, [loaded, sessionId, onComplete, onCancel])

  return <div ref={containerRef} className="w-full min-h-[400px]" />
}
