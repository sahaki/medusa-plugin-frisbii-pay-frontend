"use client"

import { useEffect } from "react"
import { useFrisbiiCheckout } from "../hooks/useFrisbiiCheckout"
import type { FrisbiiDisplayModeProps } from "../types"
import { getTranslation } from "../i18n"

/**
 * Frisbii Overlay (Modal) Checkout Component
 * Opens Reepay checkout in a modal overlay
 * @example
 * ```tsx
 * <FrisbiiOverlay 
 *   sessionId="reepay_session_123"
 *   onComplete={() => console.log("Payment completed")}
 *   onCancel={() => console.log("Payment cancelled")}
 * />
 * ```
 */
export function FrisbiiOverlay({
  sessionId,
  locale,
  onComplete,
  onCancel,
}: FrisbiiDisplayModeProps) {
  const t = getTranslation(locale)
  const { loaded } = useFrisbiiCheckout(sessionId)

  useEffect(() => {
    if (!loaded || !sessionId) return

    try {
      const rp = new window.Reepay.ModalCheckout(sessionId)

      rp.addEventHandler(window.Reepay.Event.Accept, () => {
        onComplete?.()
      })

      rp.addEventHandler(window.Reepay.Event.Cancel, () => {
        onCancel?.()
      })

      // Cleanup on unmount
      return () => rp.destroy?.()
    } catch (error) {
      console.error("[Frisbii] Error initializing modal checkout:", error)
      return undefined
    }
  }, [loaded, sessionId, onComplete, onCancel])

  return <div className="text-center py-4">{t.openingPaymentWindow}</div>
}
