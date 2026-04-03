/**
 * Frisbii Payment Frontend Types
 * @packageDocumentation
 */

/**
 * Display type for Frisbii payment checkout
 */
export type FrisbiiDisplayType = "embedded" | "overlay" | "redirect"

/**
 * Public configuration fetched from backend
 */
export interface FrisbiiPublicConfig {
  /** Whether Frisbii payment is enabled */
  enabled: boolean
  /** Display title for payment method */
  title: string
  /** Display mode for checkout */
  display_type: FrisbiiDisplayType
  /** Allowed payment methods (e.g., "card", "mobilepay") */
  allowed_payment_methods: string[]
  /** URLs for payment method icons */
  payment_icons: string[]
  /** Locale for payment UI (e.g., "en_GB", "da_DK") */
  locale: string
  /** Whether card saving is enabled */
  save_card_enabled: boolean
  /** Whether card save checkbox is unchecked by default */
  save_card_default_unchecked: boolean
}

/**
 * Props for FrisbiiPayment main component
 */
export interface FrisbiiPaymentProps {
  /** Reepay session ID from backend */
  sessionId: string
  /** Public configuration for display */
  config: FrisbiiPublicConfig
  /** Callback when payment is successfully completed */
  onComplete?: () => void
  /** Callback when payment is cancelled */
  onCancel?: () => void
}

/**
 * Props for display mode components (Embedded, Overlay, Redirect)
 */
export interface FrisbiiDisplayModeProps {
  /** Reepay session ID */
  sessionId: string
  /** Callback when payment is successfully completed */
  onComplete?: () => void
  /** Callback when payment is cancelled */
  onCancel?: () => void
}

/**
 * Payment session data structure from backend
 */
export interface FrisbiiPaymentSessionData {
  /** Reepay session ID */
  session_id: string
  /** Display type for this session */
  display_type: FrisbiiDisplayType
  /** Accept URL for redirect mode */
  accept_url?: string
  /** Cancel URL for redirect mode */
  cancel_url?: string
  /** Additional metadata */
  [key: string]: unknown
}

/**
 * Payment info map entry for Frisbii
 */
export interface PaymentInfoEntry {
  /** Display title */
  title: string
  /** Icon component */
  icon: React.JSX.Element
}

/**
 * Reepay SDK types (window globals)
 */
export interface ReepaySDK {
  EmbeddedCheckout: new (
    sessionId: string,
    options: { html_element: HTMLElement }
  ) => ReepayCheckoutInstance
  ModalCheckout: new (sessionId: string) => ReepayCheckoutInstance
  Event: {
    Accept: string
    Cancel: string
    Error: string
  }
}

/**
 * Reepay checkout instance
 */
export interface ReepayCheckoutInstance {
  addEventHandler: (event: string, handler: () => void) => void
  destroy?: () => void
}

/**
 * Window with Reepay SDK
 */
declare global {
  interface Window {
    Reepay: ReepaySDK
  }
}
