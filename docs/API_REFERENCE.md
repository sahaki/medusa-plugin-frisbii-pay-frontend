# API Reference

## Overview

This document provides comprehensive API documentation for all components, hooks, utilities, and types exported by `@montaekung/medusa-plugin-frisbii-pay-frontend`.

---

## Table of Contents

- [Components](#components)
  - [FrisbiiPayment](#frisiipayment)
  - [FrisbiiPaymentButton](#frisbiipaymentbutton)
  - [FrisbiiEmbedded](#frisbiiembedded)
  - [FrisbiiOverlay](#frisbiioverlay)
  - [FrisbiiRedirect](#frisbiiredirect)
- [Hooks](#hooks)
  - [useFrisbiiCheckout](#usefrisbiicheckout)
  - [useFrisbiiConfig](#usefrisbiiconfig)
- [Utilities](#utilities)
  - [isFrisbii](#isfrisbii)
  - [getFrisbiiConfig](#getfrisbiiconfig)
- [Constants](#constants)
- [Types](#types)

---

## Components

### FrisbiiPayment

Main payment component that routes to appropriate display mode.

#### Import

```typescript
import { FrisbiiPayment } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
```

#### Props

```typescript
interface FrisbiiPaymentProps {
  sessionId: string
  config: FrisbiiPublicConfig
  onComplete?: () => void
  onCancel?: () => void
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `sessionId` | `string` | ✅ Yes | Reepay session ID from backend payment session |
| `config` | `FrisbiiPublicConfig` | ✅ Yes | Configuration object (includes `display_type`) |
| `onComplete` | `() => void` | ❌ No | Callback when payment succeeds |
| `onCancel` | `() => void` | ❌ No | Callback when payment is cancelled |

#### Usage Example

```tsx
import { FrisbiiPayment } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

function MyCheckout() {
  const config: FrisbiiPublicConfig = {
    enabled: true,
    title: "Frisbii Pay",
    display_type: "overlay",
    allowed_payment_methods: [],
    payment_icons: [],
    locale: "en_GB",
    save_card_enabled: false,
    save_card_default_unchecked: false,
  }

  return (
    <FrisbiiPayment
      sessionId="reepay_session_abc123"
      config={config}
      onComplete={() => console.log("Payment completed")}
      onCancel={() => console.log("Payment cancelled")}
    />
  )
}
```

#### Behavior

- Routes to `FrisbiiEmbedded` if `config.display_type === "embedded"`
- Routes to `FrisbiiOverlay` if `config.display_type === "overlay"`
- Routes to `FrisbiiRedirect` if `config.display_type === "redirect"`
- Defaults to `FrisbiiOverlay` if display_type is invalid

---

### FrisbiiPaymentButton

Pre-built payment button with integrated payment flow.

#### Import

```typescript
import { FrisbiiPaymentButton } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
```

#### Props

```typescript
interface FrisbiiPaymentButtonProps {
  cart: any
  notReady?: boolean
  ButtonComponent?: React.ComponentType<{
    onClick: () => void
    disabled: boolean
    children: React.ReactNode
  }>
  onOrderPlaced?: (cartId: string) => void | Promise<void>
  "data-testid"?: string
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `cart` | `any` | ✅ Yes | Medusa cart object with payment session |
| `notReady` | `boolean` | ❌ No | Disable button (e.g., missing shipping address) |
| `ButtonComponent` | `React.ComponentType` | ❌ No | Custom button component to use |
| `onOrderPlaced` | `(cartId: string) => void \| Promise<void>` | ❌ No | Callback to place order after payment |
| `data-testid` | `string` | ❌ No | Test ID for testing |

#### Usage Example

```tsx
import { FrisbiiPaymentButton } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
import { placeOrder } from "@lib/data/cart"

function PaymentButton({ cart }) {
  return (
    <FrisbiiPaymentButton
      cart={cart}
      notReady={!cart.shipping_address || !cart.billing_address}
      onOrderPlaced={async (cartId) => {
        await placeOrder(cartId)
      }}
      data-testid="frisbii-payment-button"
    />
  )
}
```

#### With Custom Button

```tsx
import { Button } from "@medusajs/ui"

const CustomButton = ({ onClick, disabled, children }) => (
  <Button onClick={onClick} disabled={disabled} size="large">
    {children}
  </Button>
)

<FrisbiiPaymentButton
  cart={cart}
  ButtonComponent={CustomButton}
  onOrderPlaced={placeOrder}
/>
```

#### Behavior

1. Extracts `session_id` and `display_type` from cart payment session
2. Shows "Place order" button when `showCheckout === false`
3. Renders `FrisbiiPayment` component when button clicked
4. Calls `onOrderPlaced` when payment completes
5. Handles errors and loading states internally

---

### FrisbiiEmbedded

Embedded checkout mode component.

#### Import

```typescript
import { FrisbiiEmbedded } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
```

#### Props

```typescript
interface FrisbiiDisplayModeProps {
  sessionId: string
  onComplete?: () => void
  onCancel?: () => void
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `sessionId` | `string` | ✅ Yes | Reepay session ID |
| `onComplete` | `() => void` | ❌ No | Callback when payment succeeds |
| `onCancel` | `() => void` | ❌ No | Callback when payment cancelled |

#### Usage Example

```tsx
import { FrisbiiEmbedded } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

<FrisbiiEmbedded
  sessionId="reepay_session_abc123"
  onComplete={() => console.log("Payment completed")}
  onCancel={() => console.log("Payment cancelled")}
/>
```

#### Rendered Output

```html
<div class="w-full min-h-[400px]">
  <!-- Reepay embedded form renders here -->
</div>
```

---

### FrisbiiOverlay

Modal overlay checkout mode component.

#### Import

```typescript
import { FrisbiiOverlay } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
```

#### Props

```typescript
interface FrisbiiDisplayModeProps {
  sessionId: string
  onComplete?: () => void
  onCancel?: () => void
}
```

#### Usage Example

```tsx
import { FrisbiiOverlay } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

<FrisbiiOverlay
  sessionId="reepay_session_abc123"
  onComplete={() => console.log("Payment completed")}
  onCancel={() => console.log("Payment cancelled")}
/>
```

#### Rendered Output

```html
<div class="text-center py-4">
  Opening payment window...
</div>
<!-- Modal opens automatically -->
```

---

### FrisbiiRedirect

Full redirect checkout mode component.

#### Import

```typescript
import { FrisbiiRedirect } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
```

#### Props

```typescript
interface FrisbiiDisplayModeProps {
  sessionId: string
}
```

**Note**: `onComplete` and `onCancel` not used (redirect-based flow)

#### Usage Example

```tsx
import { FrisbiiRedirect } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

<FrisbiiRedirect sessionId="reepay_session_abc123" />
```

#### Behavior

1. Component mounts
2. Immediately redirects to: `https://checkout.reepay.com/#/{sessionId}`
3. User completes payment on Reepay hosted page
4. Reepay redirects back to `accept_url` or `cancel_url`

---

## Hooks

### useFrisbiiCheckout

Hook for dynamic SDK loading and tracking loading state.

#### Import

```typescript
import { useFrisbiiCheckout } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
```

#### Signature

```typescript
function useFrisbiiCheckout(sessionId: string | null): {
  loaded: boolean
}
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | `string \| null` | Reepay session ID (triggers SDK loading) |

#### Return Value

```typescript
{
  loaded: boolean // true when SDK is loaded and ready
}
```

#### Usage Example

```tsx
import { useFrisbiiCheckout } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

function MyComponent({ sessionId }) {
  const { loaded } = useFrisbiiCheckout(sessionId)

  if (!loaded) {
    return <div>Loading payment SDK...</div>
  }

  return <div>SDK loaded! Ready to process payment.</div>
}
```

#### Behavior

- Checks if script with `id="reepay-checkout-sdk"` exists
- If not, creates script tag and appends to `document.head`
- Sets `loaded = true` when script loads
- Does nothing if `sessionId` is null
- Prevents duplicate script tags

#### SDK URL

Loads from: `https://checkout.reepay.com/checkout.js`

---

### useFrisbiiConfig

Hook for fetching Frisbii configuration from backend.

#### Import

```typescript
import { useFrisbiiConfig } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
```

#### Signature

```typescript
function useFrisbiiConfig(backendUrl: string): {
  config: FrisbiiPublicConfig | null
  loading: boolean
}
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `backendUrl` | `string` | Medusa backend URL (e.g., "http://localhost:9000") |

#### Return Value

```typescript
{
  config: FrisbiiPublicConfig | null  // Configuration or null if not loaded
  loading: boolean                     // true while fetching
}
```

#### Usage Example

```tsx
import { useFrisbiiConfig } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

function MyComponent() {
  const { config, loading } = useFrisbiiConfig("http://localhost:9000")

  if (loading) {
    return <div>Loading configuration...</div>
  }

  if (!config || !config.enabled) {
    return <div>Frisbii payment is not enabled</div>
  }

  return <div>Display type: {config.display_type}</div>
}
```

#### API Endpoint

Fetches from: `GET {backendUrl}/store/frisbii/config`

---

## Utilities

### isFrisbii

Check if a payment provider ID is a Frisbii provider.

#### Import

```typescript
import { isFrisbii } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
```

#### Signature

```typescript
function isFrisbii(providerId?: string): boolean
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `providerId` | `string \| undefined` | Payment provider ID to check |

#### Return Value

`boolean` - `true` if provider is Frisbii, `false` otherwise

#### Usage Example

```tsx
import { isFrisbii } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

const paymentSession = cart.payment_collection?.payment_sessions?.[0]

if (isFrisbii(paymentSession?.provider_id)) {
  return <FrisbiiPaymentButton cart={cart} />
}
```

#### Examples

```typescript
isFrisbii("pp_frisbii-payment_frisbii-payment") // true
isFrisbii("pp_frisbii-test_test")              // true
isFrisbii("pp_stripe_stripe")                  // false
isFrisbii(undefined)                           // false
isFrisbii(null)                                // false
```

---

### getFrisbiiConfig

Fetch Frisbii configuration from backend (async).

#### Import

```typescript
import { getFrisbiiConfig } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
```

#### Signature

```typescript
async function getFrisbiiConfig(
  backendUrl: string
): Promise<FrisbiiPublicConfig | null>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `backendUrl` | `string` | Medusa backend URL |

#### Return Value

`Promise<FrisbiiPublicConfig | null>` - Configuration object or null

#### Usage Example

```tsx
import { getFrisbiiConfig } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

async function loadConfig() {
  const config = await getFrisbiiConfig("http://localhost:9000")
  
  if (!config) {
    console.error("Failed to load Frisbii config")
    return
  }
  
  console.log("Display type:", config.display_type)
}
```

#### Error Handling

```tsx
try {
  const config = await getFrisbiiConfig(backendUrl)
  if (!config) {
    throw new Error("Config not available")
  }
} catch (error) {
  console.error("Failed to fetch config:", error)
}
```

---

## Constants

### FRISBII_PROVIDER_ID

Default Frisbii provider ID.

```typescript
export const FRISBII_PROVIDER_ID = "pp_frisbii-payment_frisbii-payment"
```

### REEPAY_SDK_URL

Reepay SDK script URL.

```typescript
export const REEPAY_SDK_URL = "https://checkout.reepay.com/checkout.js"
```

### REEPAY_SDK_SCRIPT_ID

Script element ID for preventing duplicates.

```typescript
export const REEPAY_SDK_SCRIPT_ID = "reepay-checkout-sdk"
```

---

## Types

### FrisbiiDisplayType

```typescript
type FrisbiiDisplayType = "embedded" | "overlay" | "redirect"
```

Payment checkout display mode.

---

### FrisbiiPublicConfig

```typescript
interface FrisbiiPublicConfig {
  enabled: boolean
  title: string
  display_type: FrisbiiDisplayType
  allowed_payment_methods: string[]
  payment_icons: string[]
  locale: string
  save_card_enabled: boolean
  save_card_default_unchecked: boolean
}
```

Configuration fetched from backend.

---

### FrisbiiPaymentProps

```typescript
interface FrisbiiPaymentProps {
  sessionId: string
  config: FrisbiiPublicConfig
  onComplete?: () => void
  onCancel?: () => void
}
```

Props for `FrisbiiPayment` component.

---

### FrisbiiDisplayModeProps

```typescript
interface FrisbiiDisplayModeProps {
  sessionId: string
  onComplete?: () => void
  onCancel?: () => void
}
```

Props for display mode components (Embedded, Overlay, Redirect).

---

### FrisbiiPaymentSessionData

```typescript
interface FrisbiiPaymentSessionData {
  session_id: string
  display_type: FrisbiiDisplayType
  accept_url?: string
  cancel_url?: string
  [key: string]: unknown
}
```

Payment session data structure from backend.

---

### ReepaySDK

```typescript
interface ReepaySDK {
  EmbeddedCheckout: new (
    sessionId: string,
    options: { html_element: HTMLElement }
  ) => ReepayCheckoutInstance
  
  ModalCheckout: new (
    sessionId: string
  ) => ReepayCheckoutInstance
  
  Event: {
    Accept: string
    Cancel: string
    Error: string
  }
}
```

Reepay SDK global object (available on `window.Reepay`).

---

### ReepayCheckoutInstance

```typescript
interface ReepayCheckoutInstance {
  addEventHandler: (event: string, handler: () => void) => void
  destroy?: () => void
}
```

Reepay checkout instance methods.

---

## Usage Patterns

### Pattern 1: Pre-built Button (Recommended)

```tsx
import { FrisbiiPaymentButton } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
import { placeOrder } from "@lib/data/cart"

<FrisbiiPaymentButton
  cart={cart}
  notReady={!cart.shipping_address}
  onOrderPlaced={placeOrder}
/>
```

---

### Pattern 2: Manual Flow

```tsx
import { 
  FrisbiiPayment, 
  useFrisbiiCheckout 
} from "@montaekung/medusa-plugin-frisbii-pay-frontend"

function CustomPayment({ sessionId, config }) {
  const { loaded } = useFrisbiiCheckout(sessionId)
  
  if (!loaded) return <div>Loading...</div>
  
  return (
    <FrisbiiPayment
      sessionId={sessionId}
      config={config}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  )
}
```

---

### Pattern 3: Specific Display Mode

```tsx
import { FrisbiiEmbedded } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

<FrisbiiEmbedded
  sessionId={sessionId}
  onComplete={() => console.log("Done")}
/>
```

---

## Related Documentation

- [Installation](./INSTALLATION.md) - Setup guide
- [Architecture](./ARCHITECTURE.md) - System design
- [Integration Guide](./INTEGRATION_GUIDE.md) - Step-by-step integration
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues
