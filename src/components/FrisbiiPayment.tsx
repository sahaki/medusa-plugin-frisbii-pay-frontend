"use client"

import { FrisbiiEmbedded } from "./FrisbiiEmbedded"
import { FrisbiiOverlay } from "./FrisbiiOverlay"
import { FrisbiiRedirect } from "./FrisbiiRedirect"
import type { FrisbiiPaymentProps } from "../types"

/**
 * Frisbii Payment Main Component
 * Routes to appropriate display mode based on configuration
 * @example
 * ```tsx
 * <FrisbiiPayment
 *   sessionId="reepay_session_123"
 *   config={{ display_type: "overlay", ... }}
 *   onComplete={() => handlePaymentComplete()}
 *   onCancel={() => handlePaymentCancel()}
 * />
 * ```
 */
export function FrisbiiPayment({
  sessionId,
  config,
  onComplete,
  onCancel,
}: FrisbiiPaymentProps) {
  switch (config.display_type) {
    case "embedded":
      return (
        <FrisbiiEmbedded
          sessionId={sessionId}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      )
    case "overlay":
      return (
        <FrisbiiOverlay
          sessionId={sessionId}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      )
    case "redirect":
      return <FrisbiiRedirect sessionId={sessionId} />
    default:
      // Default to overlay if display_type is invalid
      return (
        <FrisbiiOverlay
          sessionId={sessionId}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      )
  }
}
