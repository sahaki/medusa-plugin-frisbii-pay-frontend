"use client"

import { useState } from "react"
import { FrisbiiPayment } from "./FrisbiiPayment"
import type { FrisbiiPublicConfig } from "../types"
import { getTranslation } from "../i18n"

export interface FrisbiiPaymentButtonProps {
  /** Cart object from Medusa */
  cart: any
  /** Whether the button should be disabled */
  notReady?: boolean
  /**
   * Current locale from Admin config (e.g. "en_GB", "da_DK").
   * When provided, overrides the locale stored in the payment session data.
   * Pass this from `getFrisbiiPublicConfig()` so UI text always reflects
   * the latest Admin setting rather than the (potentially stale) session locale.
   */
  locale?: string
  /** Button component to use (default: basic button) */
  ButtonComponent?: React.ComponentType<{
    onClick: () => void
    disabled: boolean
    children: React.ReactNode
  }>
  /** Callback when order is successfully placed */
  onOrderPlaced?: (cartId: string) => void | Promise<void>
  /** Test ID for testing */
  "data-testid"?: string
}

/**
 * Pre-built Frisbii Payment Button Component
 * Handles payment session extraction and payment flow
 * @example
 * ```tsx
 * import { FrisbiiPaymentButton } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
 * 
 * <FrisbiiPaymentButton 
 *   cart={cart}
 *   notReady={!cart.shipping_address}
 *   onOrderPlaced={async (cartId) => {
 *     await placeOrder(cartId)
 *   }}
 * />
 * ```
 */
export function FrisbiiPaymentButton({
  cart,
  notReady = false,
  locale: localeProp,
  ButtonComponent,
  onOrderPlaced,
  "data-testid": dataTestId,
}: FrisbiiPaymentButtonProps) {
  const [showCheckout, setShowCheckout] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extract payment session
  const session = cart?.payment_collection?.payment_sessions?.find(
    (s: any) => s.status === "pending"
  )

  const sessionId = (session?.data as Record<string, unknown>)
    ?.session_id as string
  const displayType =
    ((session?.data as Record<string, unknown>)?.display_type as string) ||
    "overlay"
  const sessionLocale = (session?.data as Record<string, unknown>)?.locale as string | undefined
  // Prefer the prop locale (from live Admin config) over the session-stored locale,
  // which may be stale if the Admin changed the locale after the session was created.
  const locale = localeProp ?? sessionLocale
  const t = getTranslation(locale)

  // accept_url is stored in session data by the backend (initiatePayment).
  // Redirecting the browser to this URL after the Reepay Accept event is the
  // most reliable way to complete the order because:
  //   1. The HTTP roundtrip gives Reepay time to mark the charge as "authorized".
  //   2. completeOrder() runs server-side in a proper Server Component context.
  //   3. It avoids having to call a Next.js server action from within a
  //      third-party SDK callback, which can have unpredictable redirect behaviour.
  const acceptUrl = (session?.data as Record<string, unknown>)
    ?.accept_url as string | null | undefined

  console.log("FrisbiiPaymentButton Debug:", {
    allSessions: cart?.payment_collection?.payment_sessions,
    foundSession: session,
    sessionStatus: session?.status,
    sessionData: session?.data,
    sessionId: sessionId,
    notReady: notReady,
    submitting: submitting,
    showCheckout: showCheckout,
    buttonDisabled: notReady || !sessionId || submitting,
  })

  // Debug: Log session data
  if (!sessionId && session) {
    console.error("Frisbii Payment Session Error:", {
      sessionData: session.data,
      providerId: session.provider_id,
      status: session.status,
    })
  }

  // Create config from session data
  const config: FrisbiiPublicConfig = {
    enabled: true,
    title: "Frisbii Pay",
    display_type: displayType as "embedded" | "overlay" | "redirect",
    allowed_payment_methods: [],
    payment_icons: [],
    locale: locale || "en_GB",
    save_card_enabled: false,
    save_card_default_unchecked: false,
  }

  const handlePaymentCompleted = async () => {
    if (submitting) return // Prevent double submission
    setSubmitting(true)
    setError(null)

    // Preferred path: redirect the browser to the accept_url page.
    // The accept_url page runs completeOrder() server-side, which:
    //   • avoids the race condition where the Reepay charge is not yet
    //     "authorized" when we call cart.complete() immediately after the
    //     SDK Accept event fires;
    //   • handles removeCartId() and redirect() in a stable Server Component
    //     context rather than inside a Reepay SDK callback.
    if (acceptUrl) {
      window.location.href = acceptUrl
      return // Browser will navigate; no state cleanup needed.
    }

    // Fallback: call onOrderPlaced directly when accept_url is not available
    // (e.g. old sessions created before the backend stored accept_url).
    try {
      if (onOrderPlaced) {
        await onOrderPlaced(cart.id)
      }
    } catch (err: any) {
      // next/navigation redirect() throws a NEXT_REDIRECT error.
      // Check both err.digest (Next.js 14+) and err.message for compatibility.
      const isNextRedirect =
        (err?.digest && String(err.digest).startsWith("NEXT_REDIRECT")) ||
        err?.message?.includes("NEXT_REDIRECT")
      if (!isNextRedirect) {
        setError(err.message || "Failed to place order")
      }
    } finally {
      setSubmitting(false)
      setShowCheckout(false)
    }
  }

  const handleCancel = () => {
    setShowCheckout(false)
    setError(null)
  }

  // Default button component
  const DefaultButton = ({
    onClick,
    disabled,
    children,
  }: {
    onClick: () => void
    disabled: boolean
    children: React.ReactNode
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
      data-testid={dataTestId}
    >
      {children}
    </button>
  )

  const Button = ButtonComponent || DefaultButton

  // Debug: Show payment session info
  const debugInfo = !sessionId && session
    ? `Session provider: ${session.provider_id}, Status: ${session.status}, Has data: ${!!session.data}`
    : null

  return (
    <>
      {showCheckout && sessionId && (
        <FrisbiiPayment
          sessionId={sessionId}
          config={config}
          onComplete={handlePaymentCompleted}
          onCancel={handleCancel}
        />
      )}

      {!showCheckout && (
        <>
          <Button
            onClick={() => setShowCheckout(true)}
            disabled={notReady || !sessionId || submitting}
          >
            {submitting ? t.processing : t.placeOrder}
          </Button>
          {!sessionId && !notReady && session && (
            <div className="mt-2 text-sm text-red-600" role="alert">
              <p>Payment session not initialized properly.</p>
              <p className="text-xs mt-1">{debugInfo}</p>
            </div>
          )}
          {!sessionId && !notReady && !session && (
            <div className="mt-2 text-sm text-red-600" role="alert">
              No payment session found. Please select a payment method.
            </div>
          )}
          {error && (
            <div className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </div>
          )}
        </>
      )}
    </>
  )
}
