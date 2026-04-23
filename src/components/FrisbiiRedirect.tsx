"use client"

import { useEffect } from "react"
import type { FrisbiiDisplayModeProps } from "../types"

/**
 * Frisbii Redirect Checkout Component
 * Redirects the browser to the Reepay hosted checkout page.
 *
 * For redirect mode the full payment lifecycle is:
 *   1. This component fires a browser-level redirect to Reepay.
 *   2. The user completes payment on Reepay's hosted page.
 *   3. Reepay redirects the browser to the `accept_url` that was configured
 *      when the payment session was initiated (e.g. `/[countryCode]/checkout/frisbii/accept`).
 *   4. The accept page calls `completeOrder()` server-side to create the Medusa
 *      order, clear the cart cookie, and redirect to the thank-you page.
 *
 * `onComplete` is intentionally **not** called from this component because
 * calling it before the redirect would attempt to complete the cart before the
 * user has paid, which causes `authorizePayment()` to fail.
 *
 * @example
 * ```tsx
 * <FrisbiiRedirect sessionId="reepay_session_123" />
 * ```
 */
export function FrisbiiRedirect({
  sessionId,
}: Omit<FrisbiiDisplayModeProps, "onCancel">) {
  useEffect(() => {
    if (!sessionId) return

    // Redirect immediately to the Reepay hosted checkout page.
    // Order completion is handled by the accept_url route after Reepay
    // redirects the browser back upon successful payment.
    window.location.href = `https://checkout.reepay.com/#/${sessionId}`
  }, [sessionId])

  return <div className="text-center py-4">Redirecting to payment...</div>
}
