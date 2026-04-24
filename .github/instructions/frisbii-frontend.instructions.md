---
description: "Use when writing, editing, or reviewing any code in the medusa-plugin-frisbii-pay-frontend project. Covers React component conventions, hook patterns, TypeScript standards, Next.js integration rules, and Reepay SDK usage."
applyTo: "src/**"
---

# Frisbii Pay Frontend Plugin — Project Instructions

## Project Overview

`@montaekung/medusa-plugin-frisbii-pay-frontend` is a **React frontend library** for integrating Frisbii Payment (Reepay) checkout into Medusa Next.js storefronts. It provides UI components, React hooks, and utilities for rendering Reepay checkout in three display modes: Embedded, Overlay (Modal), or Redirect.

---

## Architecture Principles

- **Client-side only**: All React components use `"use client"` directive for Next.js compatibility.
- **Dynamic SDK loading**: Reepay SDK is loaded on-demand only when needed (via `useFrisbiiCheckout` hook).
- **Type-safe**: Full TypeScript support with comprehensive interface definitions.
- **Composable components**: `FrisbiiPayment` routes to appropriate display mode based on configuration.
- **Bring your own UI**: Components accept custom button renderers for visual consistency with storefront.
- **Backend dependency**: Requires `@montaekung/medusa-plugin-frisbii-pay` installed on Medusa backend.

---

## Directory Structure Conventions

```
src/
  index.ts                     # Re-exports all public API
  components/
    index.ts                   # Re-exports all components
    FrisbiiPayment.tsx         # Main component (routes to display mode)
    FrisbiiEmbedded.tsx        # Embedded checkout (inline form)
    FrisbiiOverlay.tsx         # Overlay checkout (modal)
    FrisbiiRedirect.tsx        # Redirect checkout (full page)
    FrisbiiPaymentButton.tsx   # Pre-built payment button with flow handling
  hooks/
    index.ts                   # Re-exports all hooks
    useFrisbiiCheckout.ts      # Reepay SDK loading hook
    useFrisbiiConfig.ts        # Config fetching hook
  lib/
    index.ts                   # Re-exports utilities
    config.ts                  # Config fetch function
    constants.ts               # Provider ID, SDK URL, helper functions
  types/
    index.ts                   # All TypeScript type definitions
```

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Component files | `PascalCase.tsx` | `FrisbiiPayment.tsx` |
| Hook files | `camelCase.ts` | `useFrisbiiCheckout.ts` |
| Utility files | `kebab-case.ts` or `camelCase.ts` | `config.ts`, `constants.ts` |
| Type files | `kebab-case.ts` | `index.ts` in types/ |
| React components | `PascalCase` | `FrisbiiOverlay` |
| React hooks | `useCamelCase` | `useFrisbiiCheckout` |
| Constants | `SCREAMING_SNAKE_CASE` | `REEPAY_SDK_URL` |
| Helper functions | `camelCase` | `isFrisbii()` |

---

## TypeScript Standards

- Use **strict TypeScript** — no implicit `any`.
- Define explicit interface/type for all component props.
- Export all public types from `src/types/index.ts`.
- Use `@packageDocumentation` JSDoc tag in main index files.
- React component props interfaces should end with `Props` suffix (e.g., `FrisbiiPaymentProps`).
- Use optional chaining (`?.`) for nullable callbacks.

---

## Component Rules

### General Patterns

- All components must have `"use client"` directive at the top.
- Components should be exported as named exports, not default exports.
- Use functional components with TypeScript props interface.
- Include JSDoc with `@example` for every exported component.
- Destructure props in function signature.
- Handle cleanup in `useEffect` return function (e.g., `rp.destroy?.()`).

### FrisbiiPayment (Main Component)

```tsx
// Pattern: Route to display mode based on config
export function FrisbiiPayment({
  sessionId,
  config,
  onComplete,
  onCancel,
}: FrisbiiPaymentProps) {
  switch (config.display_type) {
    case "embedded":
      return <FrisbiiEmbedded ... />
    case "overlay":
      return <FrisbiiOverlay ... />
    case "redirect":
      return <FrisbiiRedirect ... />
    default:
      return <FrisbiiOverlay ... /> // Fallback
  }
}
```

### Display Mode Components (Embedded, Overlay, Redirect)

- Accept `FrisbiiDisplayModeProps`: `sessionId`, `onComplete?`, `onCancel?`
- Use `useFrisbiiCheckout(sessionId)` to load Reepay SDK
- Initialize Reepay checkout instance in `useEffect` when `loaded` is true
- Register event handlers for `Accept` and `Cancel` events
- Clean up checkout instance on unmount

```tsx
// Pattern for Overlay/Embedded components
export function FrisbiiOverlay({
  sessionId,
  onComplete,
  onCancel,
}: FrisbiiDisplayModeProps) {
  const { loaded } = useFrisbiiCheckout(sessionId)

  useEffect(() => {
    if (!loaded || !sessionId) return

    try {
      const rp = new window.Reepay.ModalCheckout(sessionId)
      rp.addEventHandler(window.Reepay.Event.Accept, () => onComplete?.())
      rp.addEventHandler(window.Reepay.Event.Cancel, () => onCancel?.())
      return () => rp.destroy?.()
    } catch (error) {
      console.error("[Frisbii] Error:", error)
      return undefined
    }
  }, [loaded, sessionId, onComplete, onCancel])

  return <div>...</div>
}
```

### FrisbiiPaymentButton

- Pre-built button that handles entire payment flow
- Extracts payment session from cart object: `session_id`, `display_type`, `accept_url`
- Manages `showCheckout`, `submitting`, `error` state
- Accepts custom `ButtonComponent` for UI customization
- Calls `onOrderPlaced` callback **only as a fallback** (see payment completion below)

#### Payment completion — preferred path (accept_url redirect)

When the Reepay `Accept` event fires (overlay/embedded) or the user returns from Reepay (redirect mode), the browser MUST be redirected to the `accept_url` page rather than calling a Next.js server action directly. This avoids:

1. **Race condition**: the Reepay JS SDK fires `Accept` before Reepay's REST API marks the charge as "authorized". Calling `cart.complete()` immediately returns `{ type: "cart" }` (not `"order"`), so no redirect happens.
2. **Next.js redirect instability**: calling `redirect()` from inside a Reepay SDK callback (outside React event handling) can behave unpredictably.

```tsx
// PREFERRED — browser navigates to accept page which runs completeOrder() server-side
if (acceptUrl) {
  window.location.href = acceptUrl
  return
}

// FALLBACK — when accept_url is not in session data (old sessions)
await onOrderPlaced?.(cart.id)
```

The `accept_url` must be stored in the Medusa payment session data (backend `initiatePayment` return value) and passed when initiating the session:

```tsx
sessionData.data = {
  extra: {
    accept_url: `${baseUrl}/${countryCode}/checkout/frisbii/accept?cart_id=${cart.id}`,
    cancel_url: `${baseUrl}/${countryCode}/checkout/frisbii/cancel?cart_id=${cart.id}`,
    // ... other fields
  },
}
```

#### FrisbiiRedirect — correct behavior

`FrisbiiRedirect` must redirect to Reepay **immediately** without calling `onComplete()`. The `onComplete` callback must **not** be invoked before the user has paid — doing so attempts to call `cart.complete()` on an unauthorized payment, which silently fails.

```tsx
// CORRECT
useEffect(() => {
  if (!sessionId) return
  window.location.href = `https://checkout.reepay.com/#/${sessionId}`
}, [sessionId])

// WRONG — do not do this
const doRedirect = async () => {
  await onComplete?.()  // ❌ called before user has paid
  window.location.href = `https://checkout.reepay.com/#/${sessionId}`
}
```

---

## Hook Rules (`src/hooks/`)

- Hooks must start with `use` prefix.
- Export hooks from both individual files and `index.ts`.
- Use `useState` for loading states, `useEffect` for side effects.
- Always include JSDoc with `@param`, `@returns`, and `@example`.

### useFrisbiiCheckout Pattern

```tsx
export function useFrisbiiCheckout(sessionId: string | null) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    // Check existing script, create if needed
    // Set loaded=true on script.onload
  }, [sessionId])

  return { loaded }
}
```

---

## Utility Functions (`src/lib/`)

### isFrisbii Helper

- Use to check if a provider ID belongs to Frisbii
- Provider IDs start with `pp_frisbii`

```tsx
export function isFrisbii(providerId?: string): boolean {
  if (!providerId) return false
  return providerId.startsWith("pp_frisbii")
}
```

### getFrisbiiConfig

- Fetch public config from backend `/store/frisbii/config` endpoint
- Return `null` on error (graceful degradation)

### pollOrderByCart (accept page helper)

- Used in the accept page to find an order created by the Reepay webhook
- Polls `GET /store/frisbii/order-by-cart?cart_id=…` on the Medusa backend
- The backend endpoint queries the Medusa v2 `order_cart` JOIN table (not `order.cart_id`)
- Required because `completeOrder()` may fail if the Reepay REST API has not yet marked the charge as "authorized" when the browser arrives at the accept page

```tsx
async function pollOrderByCart(cartId: string, maxAttempts = 10, delayMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, delayMs))
    const res = await fetch(`${BACKEND_URL}/store/frisbii/order-by-cart?cart_id=${encodeURIComponent(cartId)}`, {
      cache: "no-store",
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.order_id) return data
    }
  }
  return null
}
```

---

## Type Definitions (`src/types/`)

### Core Types

| Type | Description |
|------|-------------|
| `FrisbiiDisplayType` | `"embedded" \| "overlay" \| "redirect"` |
| `FrisbiiPublicConfig` | Config from backend (enabled, title, display_type, etc.) |
| `FrisbiiPaymentProps` | Props for main FrisbiiPayment component |
| `FrisbiiDisplayModeProps` | Props for display mode components |
| `FrisbiiPaymentSessionData` | Payment session data structure |
| `ReepaySDK` | Type definition for window.Reepay global |

---

## Reepay SDK Integration

### SDK Loading

- Use `REEPAY_SDK_URL = "https://checkout.reepay.com/checkout.js"`
- Script ID: `REEPAY_SDK_SCRIPT_ID = "reepay-checkout-sdk"`
- SDK adds `window.Reepay` global object

### Reepay API

```tsx
// Modal Checkout
const rp = new window.Reepay.ModalCheckout(sessionId)

// Embedded Checkout
const rp = new window.Reepay.EmbeddedCheckout(sessionId, {
  html_element: containerElement,
})

// Event Handlers
rp.addEventHandler(window.Reepay.Event.Accept, () => { /* success */ })
rp.addEventHandler(window.Reepay.Event.Cancel, () => { /* cancelled */ })

// Cleanup
rp.destroy()
```

---

## Next.js Integration Patterns

### Adding to Payment Button

```tsx
import { FrisbiiPaymentButton, isFrisbii } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

// In PaymentButton component
case isFrisbii(paymentSession?.provider_id):
  return (
    <FrisbiiPaymentButton
      cart={cart}
      notReady={!cart.shipping_address}
      ButtonComponent={({ onClick, disabled, children }) => (
        <CustomButton onClick={onClick} disabled={disabled}>
          {children}
        </CustomButton>
      )}
      onOrderPlaced={async (cartId) => {
        await placeOrder(cartId)
      }}
    />
  )
```

### Initializing Payment Session with Extra Data

```tsx
if (isFrisbii(selectedPaymentMethod)) {
  const baseUrl = window.location.origin
  const countryCode = pathname.split("/")[1] || "us"
  sessionData.data = {
    extra: {
      // accept_url is REQUIRED — the frontend plugin redirects the browser here
      // after the Reepay Accept event fires (overlay/embedded), giving Reepay's
      // REST API time to mark the charge "authorized" before completeOrder() runs.
      accept_url: `${baseUrl}/${countryCode}/checkout/frisbii/accept?cart_id=${cart.id}`,
      cancel_url: `${baseUrl}/${countryCode}/checkout/frisbii/cancel?cart_id=${cart.id}`,
      customer_email: cart.email,
      customer_first_name: cart.shipping_address?.first_name,
      customer_last_name: cart.shipping_address?.last_name,
      customer_handle: cart.customer_id || `guest-${cart.id}`,
    },
  }
}
```

### Route Handlers for Redirect Mode

Create pages (not Route Handlers) at:
- `src/app/[countryCode]/checkout/frisbii/accept/page.tsx`
- `src/app/[countryCode]/checkout/frisbii/cancel/page.tsx`

**Critical Next.js constraints for the accept page**:

1. **Never call `removeCartId()` inside a Server Component render** — `cookies().delete()` is only allowed in Server Actions and Route Handlers. Calling it during render causes a runtime crash (`Error: Cookies can only be modified in a Server Action or Route Handler`).
2. **Never call `revalidateTag()` inside a Server Component render** for the same reason.
3. **Use `completeOrder(cartId, { skipCookieClear: true })`** to skip the cookie operation, and defer cart clearing to the confirmed page via a Server Action.

```tsx
// accept/page.tsx — CORRECT pattern
import { completeOrder } from "@lib/data/cart"
import { redirect } from "next/navigation"

export default async function FrisbiiAcceptPage({ searchParams, params }) {
  const { cart_id: cartId } = await searchParams
  const { countryCode } = await params

  if (!cartId) redirect(`/${countryCode}/checkout?step=review`)

  // skipCookieClear: true is REQUIRED — cannot call cookies() during SSR render
  const result = await completeOrder(cartId!, { skipCookieClear: true })
  if (result.success) redirect(result.redirectUrl)

  // Slow path: poll backend for order created by webhook
  const order = await pollOrderByCart(cartId!, 10, 2000)
  if (order) redirect(`/${order.country_code}/order/${order.order_id}/confirmed`)

  redirect(`/${countryCode}/checkout?step=review`)
}
```

**Cart clearing on the confirmed page**:

```ts
// confirmed/actions.ts
"use server"
import { removeCartId } from "@lib/data/cookies"
export async function clearCartAction() { await removeCartId() }
```

```tsx
// confirmed/ClearCartOnLoad.tsx
"use client"
import { useEffect } from "react"
import { clearCartAction } from "./actions"
export default function ClearCartOnLoad() {
  useEffect(() => { clearCartAction().catch(() => {}) }, [])
  return null
}
```

---

## Constants

```tsx
// Provider ID format
export const FRISBII_PROVIDER_ID = "pp_frisbii-payment_frisbii-payment"

// SDK
export const REEPAY_SDK_URL = "https://checkout.reepay.com/checkout.js"
export const REEPAY_SDK_SCRIPT_ID = "reepay-checkout-sdk"
```

---

## Error Handling

- Use `try-catch` around Reepay SDK initialization
- Log errors with `[Frisbii]` prefix for easy filtering
- Return graceful fallbacks (e.g., `null` from config fetch)
- Ignore `NEXT_REDIRECT` errors in payment completion handlers

```tsx
try {
  const rp = new window.Reepay.ModalCheckout(sessionId)
  // ...
} catch (error) {
  console.error("[Frisbii] Error initializing checkout:", error)
  return undefined
}
```

---

## Code Security

Security is a **first-class requirement**. This library handles payment flows and user PII — every code change must be reviewed through a security lens before merge.

### OWASP Top 10 Alignment

| OWASP Risk | Applies To | Mitigation |
|---|---|---|
| A03 Injection | URL params, session IDs | Validate & whitelist before use |
| A05 Security Misconfiguration | SDK script loading | Lock SDK URL to constant; no dynamic origins |
| A06 Vulnerable Components | npm dependencies | Audit regularly; pin major versions |
| A07 Auth Failures | API calls | Always pass auth headers; never cache tokens in state |
| A09 Logging Failures | `console.*` calls | Never log PII or payment data |

---

### Input Validation

- **Validate `sessionId`** before passing to any Reepay constructor. It must be a non-empty string that matches the expected format (alphanumeric/dashes only). Reject anything else.
- **Validate redirect URLs** (`accept_url`, `cancel_url`) against an allowlist of known origins before sending to the payment session. Never accept arbitrary URLs from untrusted sources.
- **Never trust `window.location` or URL query params** directly — parse and validate them explicitly.

```tsx
// GOOD — validate sessionId format before use
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{8,}$/
if (!sessionId || !SESSION_ID_PATTERN.test(sessionId)) {
  console.error("[Frisbii] Invalid session ID")
  return
}

// GOOD — allowlist redirect URL origins
const ALLOWED_ORIGINS = [process.env.NEXT_PUBLIC_BASE_URL]
function isSafeRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ALLOWED_ORIGINS.some((origin) => origin && parsed.origin === origin)
  } catch {
    return false
  }
}
```

---

### XSS Prevention

- **Never use `dangerouslySetInnerHTML`** in any component.
- **Never interpolate untrusted data** (e.g., cart metadata, query params) directly into JSX or HTML strings.
- **Do not use `eval()` or `new Function()`** anywhere in the codebase.
- Treat all data coming from cart, config API, or URL params as untrusted.

```tsx
// BAD — never do this
<div dangerouslySetInnerHTML={{ __html: config.title }} />

// GOOD — React escapes text content automatically
<div>{config.title}</div>
```

---

### Sensitive Data — Logging & State

- **Never log PII** (email, name, phone, address) or payment data to `console.*`.
- **Never store sensitive data in `localStorage` or `sessionStorage`** — use only short-lived React state.
- Log only non-sensitive context (event type, error code) with the `[Frisbii]` prefix.
- **Do not expose raw error objects** to end users — display a generic message and log details internally.

```tsx
// BAD
console.log("[Frisbii] Customer:", cart.email, cart.shipping_address)

// GOOD
console.error("[Frisbii] Checkout init failed:", (error as Error).message)
```

---

### Third-Party SDK Security

- The Reepay SDK URL **must** always be loaded from the `REEPAY_SDK_URL` constant — never from a dynamic or user-supplied value.
- **Verify the script element origin** before setting `loaded = true` (check `script.src` matches `REEPAY_SDK_URL`).
- Do not inject additional scripts into the DOM from within components.
- Do not modify the `window.Reepay` object after it is set by the SDK.

```tsx
// GOOD — check src matches the trusted constant before trusting onload
const script = document.createElement("script")
script.src = REEPAY_SDK_URL   // trusted constant, never a variable
script.id = REEPAY_SDK_SCRIPT_ID
script.onload = () => {
  if (script.src === REEPAY_SDK_URL) setLoaded(true)
}
```

---

### No Hardcoded Secrets

- **Never hardcode API keys, tokens, or credentials** in source files.
- Use `process.env.NEXT_PUBLIC_*` for public config values; server-side secrets must never be accessed client-side.
- The `FRISBII_PROVIDER_ID` and `REEPAY_SDK_URL` constants are not secrets and may remain in source.

```tsx
// BAD
const API_KEY = "sk_live_abc123..."

// GOOD
const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
```

---

### API & Fetch Security

- Always use `https://` endpoints — never allow plain `http://` in production config.
- Do not disable SSL/TLS certificate validation.
- Include auth credentials only via proper headers — never in query strings.
- Validate API response shape with TypeScript before consuming — do not assume response structure.

```tsx
// GOOD — validate shape before trusting response
const data: unknown = await res.json()
if (!data || typeof (data as FrisbiiPublicConfig).display_type !== "string") {
  return null
}
return data as FrisbiiPublicConfig
```

---

### Dependency Security

- Run `npm audit` before every release. **No high/critical vulnerabilities** may ship.
- Pin major versions of all dependencies in `package.json` — avoid unbounded `*` or `latest` ranges.
- Review `npm audit` output when adding new dependencies; prefer well-maintained packages with small attack surfaces.
- Keep `react`, `typescript`, and build tooling up to date.

---

### Secure Error Handling

- Do not re-throw raw SDK errors to calling code — wrap them in safe, generic error objects.
- Errors shown to end users must be generic (e.g., "Payment could not be initialised. Please try again.").
- Internal errors that could reveal implementation details must only appear in `console.error`.
- Catch and suppress `NEXT_REDIRECT` exceptions specifically — do not treat navigation as an error.

```tsx
// GOOD — safe user-facing error, detailed internal log
try {
  const rp = new window.Reepay.ModalCheckout(sessionId)
  // ...
} catch (error) {
  console.error("[Frisbii] SDK init error:", (error as Error).message)
  setError("Payment could not be initialised. Please try again.")
  return undefined
}
```

---

## Export Patterns

### Main Index (`src/index.ts`)

- Export all components, hooks, utilities, and types
- Use named exports for tree-shaking
- Include type exports with `export type { ... }`

```tsx
// Components
export { FrisbiiPayment, FrisbiiEmbedded, ... } from "./components"

// Hooks
export { useFrisbiiCheckout, ... } from "./hooks"

// Utilities & Constants
export { getFrisbiiConfig, isFrisbii, FRISBII_PROVIDER_ID, ... } from "./lib"

// Types
export type { FrisbiiPaymentProps, ... } from "./types"
```

---

## Development Test Servers

The plugin is tested against two local servers — a Medusa **backend** and a Next.js **frontend storefront**. Both are started with `npm run dev`.

### Server Locations

| Role | URL | Path |
|------|-----|------|
| Backend | `http://localhost:9000/app/` | `D:\my_cource\medusa\002\medusa-store` |
| Frontend | `http://localhost:8000/` | `D:\my_cource\medusa\002\medusa-store-storefront` |

### Backend Admin Credentials

- **Login URL**: `http://localhost:9000/app`
- **User**: `boyd@radarsofthouse.dk`
- **Password**: `Test#1234`

### Server Management Rule

> **Never start or restart either server autonomously.** Always ask the user to start/restart the server and wait for confirmation before continuing.
