// Danish translation for Frontend components.
// Must implement every key from TranslationKeys — missing keys = TS compile error.

import type { TranslationKeys } from "./en"

export const da: TranslationKeys = {
  // FrisbiiOverlay
  openingPaymentWindow: "Åbner betalingsvindue...",

  // FrisbiiEmbedded
  loadingPaymentForm: "Indlæser betalingsformular...",

  // FrisbiiRedirect
  redirectingToPayment: "Omdirigerer til betaling...",

  // FrisbiiPaymentButton
  placeOrder: "Afgiv ordre",
  processing: "Behandler...",
  paymentInitFailed: "Betaling kunne ikke startes. Prøv igen.",
  paymentCancelled: "Betaling blev annulleret.",
}
