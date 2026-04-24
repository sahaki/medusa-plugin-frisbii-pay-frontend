"use client"

import { useEffect, useRef } from "react"
import { useFrisbiiCheckout } from "../hooks/useFrisbiiCheckout"
import type { FrisbiiDisplayModeProps } from "../types"
import { getTranslation } from "../i18n"

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
  locale,
  onComplete,
  onCancel,
}: FrisbiiDisplayModeProps) {
  const t = getTranslation(locale)
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

  return (
    <div className="w-full">
      {!loaded && (
        <div className="text-center py-4">{t.loadingPaymentForm}</div>
      )}
      <div ref={containerRef} className="w-full min-h-[400px]" />
    </div>
  )
}
