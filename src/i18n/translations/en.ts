// English — source of truth for all Frontend component UI strings.
// Every key added here MUST also be added to da.ts (TranslationKeys type).

export const en = {
  // FrisbiiOverlay
  openingPaymentWindow: "Opening payment window...",

  // FrisbiiEmbedded
  loadingPaymentForm: "Loading payment form...",

  // FrisbiiRedirect
  redirectingToPayment: "Redirecting to payment...",

  // FrisbiiPaymentButton
  placeOrder: "Place order",
  processing: "Processing...",
  paymentInitFailed: "Payment could not be initialised. Please try again.",
  paymentCancelled: "Payment was cancelled.",
} as const

export type TranslationKeys = typeof en
