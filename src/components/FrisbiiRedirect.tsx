"use client"

import { useEffect } from "react"
import type { FrisbiiDisplayModeProps } from "../types"

/**
 * Frisbii Redirect Checkout Component
 * Redirects to Reepay hosted checkout page
 * @example
 * ```tsx
 * <FrisbiiRedirect sessionId="reepay_session_123" />
 * ```
 */
export function FrisbiiRedirect({
  sessionId,
}: Omit<FrisbiiDisplayModeProps, "onComplete" | "onCancel">) {
  useEffect(() => {
    if (!sessionId) return

    // Redirect to Reepay hosted checkout
    window.location.href = `https://checkout.reepay.com/#/${sessionId}`
  }, [sessionId])

  return <div className="text-center py-4">Redirecting to payment...</div>
}
