/**
 * Constants and utilities for Frisbii payment integration
 */

/**
 * Check if a payment provider ID is a Frisbii provider
 * @param providerId - Payment provider ID (e.g., "pp_frisbii-payment_frisbii-payment")
 * @returns True if provider is Frisbii
 * @example
 * ```ts
 * isFrisbii("pp_frisbii-payment_frisbii-payment") // true
 * isFrisbii("pp_stripe_stripe") // false
 * ```
 */
export function isFrisbii(providerId?: string): boolean {
  if (!providerId) return false
  return providerId.startsWith("pp_frisbii")
}

/**
 * Default Frisbii provider ID (adjust based on your configuration)
 */
export const FRISBII_PROVIDER_ID = "pp_frisbii-payment_frisbii-payment"

/**
 * Reepay SDK script URL
 */
export const REEPAY_SDK_URL = "https://checkout.reepay.com/checkout.js"

/**
 * Reepay SDK script ID for preventing duplicates
 */
export const REEPAY_SDK_SCRIPT_ID = "reepay-checkout-sdk"
