"use client"

import { useEffect } from "react"
import type { FrisbiiDisplayModeProps } from "../types"

/**
 * Frisbii Redirect Checkout Component
 * Redirects to Reepay hosted checkout page.
 * Calls `onComplete` before redirecting so the storefront can place the order
 * and clear the cart prior to handing off to Reepay.
 * @example
 * ```tsx
 * <FrisbiiRedirect
 *   sessionId="reepay_session_123"
 *   onComplete={async () => {
 *     await placeOrder(cartId)
 *     // cart is cleared here; Reepay's accept_url handles success navigation
 *   }}
 * />
 * ```
 */
export function FrisbiiRedirect({
  sessionId,
  onComplete,
}: Omit<FrisbiiDisplayModeProps, "onCancel">) {
  useEffect(() => {
    if (!sessionId) return

    const doRedirect = async () => {
      // Call onComplete before redirecting so the cart is cleared and the
      // order is placed in Medusa prior to handing off to Reepay.
      await onComplete?.()

      // Redirect to Reepay hosted checkout
      window.location.href = `https://checkout.reepay.com/#/${sessionId}`
    }

    doRedirect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  return <div className="text-center py-4">Redirecting to payment...</div>
}
