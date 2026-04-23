# @montaekung/medusa-plugin-frisbii-pay-frontend

Frontend components for [Frisbii Payment (Reepay)](https://reepay.com/) integration in Medusa Next.js storefronts.

[![npm version](https://img.shields.io/npm/v/@montaekung/medusa-plugin-frisbii-pay-frontend.svg)](https://www.npmjs.com/package/@montaekung/medusa-plugin-frisbii-pay-frontend)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

✅ **Multiple Display Modes** - Embedded, Overlay (Modal), or Redirect  
✅ **Type-Safe** - Full TypeScript support with comprehensive types  
✅ **React Hooks** - Easy integration with React hooks  
✅ **Dynamic SDK Loading** - Reepay SDK loaded only when needed  
✅ **Customizable** - Bring your own UI components  
✅ **Next.js Compatible** - Works with App Router and Server Components

## Prerequisites

- Medusa backend with `@montaekung/medusa-plugin-frisbii-pay` installed and configured
- Next.js 14+ or 15+
- React 18+ or 19+

## Installation

```bash
npm install @montaekung/medusa-plugin-frisbii-pay-frontend
# or
yarn add @montaekung/medusa-plugin-frisbii-pay-frontend
# or
pnpm add @montaekung/medusa-plugin-frisbii-pay-frontend
```

## Quick Start

### 1. Add Payment Provider to Constants

**File**: `src/lib/constants.tsx`

```tsx
import { isFrisbii as isFrisbiiProvider } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  // ... existing providers
  // Add more payment providers here
  "pp_frisbii-payment_frisbii-payment": {
    title: "Frisbii Pay",
    icon: <CreditCard />,
  },
}

// Export provider from plugin
export const isFrisbii = isFrisbiiProvider
```

### 2. Add Payment Button Handler

**File**: `src/modules/checkout/components/payment-button/index.tsx`

```tsx
import { FrisbiiPaymentButton } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
import { isFrisbii } from "@lib/constants"

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const paymentSession = cart.payment_collection?.payment_sessions?.[0]

  switch (true) {
    case isStripeLike(paymentSession?.provider_id):
      return <StripePaymentButton cart={cart} />
    
    case isFrisbii(paymentSession?.provider_id):
      return (
        <FrisbiiPaymentButton
          cart={cart}
          notReady={!cart.shipping_address || !cart.billing_address}
          ButtonComponent={({ onClick, disabled, children }) => (
            <Button
              size="large"
              onClick={onClick}
              disabled={disabled}
              data-testid={dataTestId}
            >
              {children}
            </Button>
          )}
          onOrderPlaced={async (cartId) => {
            await placeOrder(cartId)
          }}
        />
      )
    
    default:
      return <Button disabled>Select a payment method</Button>
  }
}
```

### 3. Initialize Payment Session

**File**: `src/modules/checkout/components/payment/index.tsx`

```tsx
import { isFrisbii, isStripeLike, paymentInfoMap } from "@lib/constants"

const handleSubmit = async () => {
  if (!checkActiveSession) {
    const sessionData: {
      provider_id: string
      data?: Record<string, unknown>
    } = { provider_id: selectedPaymentMethod }

    if (isFrisbii(selectedPaymentMethod)) {
      const baseUrl = window.location.origin
      const countryCode = pathname.split("/")[1] || "us"
      const addr = cart.shipping_address
      sessionData.data = {
        extra: {
          accept_url: `${baseUrl}/${countryCode}/checkout/frisbii/accept?cart_id=${cart.id}`,
          cancel_url: `${baseUrl}/${countryCode}/checkout/frisbii/cancel?cart_id=${cart.id}`,
          customer_email: cart.email || addr?.email || "",
          customer_first_name: addr?.first_name || "",
          customer_last_name: addr?.last_name || "",
          customer_handle: cart.customer_id || `guest-${cart.id}`,
        },
      }
    }

    await initiatePaymentSession(cart, sessionData)
  }
}
```

### 4. Create Route Handlers (Required for Redirect Mode)

Create the accept/cancel pages to process Reepay callbacks. The accept page uses a **two-path strategy** to handle the timing between the browser redirect and Reepay's webhook:

> **Important — Next.js constraints**: `removeCartId()` (which calls `cookies().delete()`) cannot be called during a Server Component render. Use `skipCookieClear: true` and clear the cart from the confirmed page instead (see Step 5).

**File**: `src/app/[countryCode]/checkout/frisbii/accept/page.tsx`

```tsx
import { completeOrder } from "@lib/data/cart"
import { redirect } from "next/navigation"

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

// Poll backend order-by-cart endpoint (slow path fallback)
async function pollOrderByCart(
  cartId: string,
  maxAttempts = 10,
  delayMs = 2000
): Promise<{ order_id: string; country_code: string } | null> {
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, delayMs))
    try {
      const res = await fetch(
        `${BACKEND_URL}/store/frisbii/order-by-cart?cart_id=${encodeURIComponent(cartId)}`,
        { cache: "no-store", headers: { "x-publishable-api-key": PUBLISHABLE_KEY } }
      )
      if (res.ok) {
        const data = await res.json()
        if (data?.order_id) return { order_id: data.order_id, country_code: data.country_code || "dk" }
      }
    } catch {}
  }
  return null
}

export default async function FrisbiiAcceptPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ cart_id?: string }>
  params: Promise<{ countryCode: string }>
}) {
  const { cart_id: cartId } = await searchParams
  const { countryCode } = await params

  if (!cartId) redirect(`/${countryCode}/checkout?step=review`)

  // Fast path: completeOrder() with retries (~10–20 s max).
  // skipCookieClear avoids calling cookies().delete() during SSR render.
  const result = await completeOrder(cartId!, { skipCookieClear: true })
  if (result.success) redirect(result.redirectUrl)

  // Slow path: poll until Reepay webhook creates the order
  const order = await pollOrderByCart(cartId!, 10, 2000)
  if (order) redirect(`/${order.country_code}/order/${order.order_id}/confirmed`)

  redirect(`/${countryCode}/checkout?step=review`)
}
```

**File**: `src/app/[countryCode]/checkout/frisbii/cancel/page.tsx`

```tsx
"use client"

import { useSearchParams, useRouter, useParams } from "next/navigation"
import { useEffect } from "react"

export default function FrisbiiCancelPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { countryCode } = useParams()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(`/${countryCode}/checkout`)
    }, 2000)
    return () => clearTimeout(timer)
  }, [router, countryCode])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <p>Payment was cancelled. Redirecting back to checkout...</p>
    </div>
  )
}
```

### 5. Clear Cart After Order Confirmation

Because `removeCartId()` cannot be called inside a Server Component render, cart clearing is done from the confirmed page via a Server Action.

**File**: `src/app/[countryCode]/(main)/order/[id]/confirmed/actions.ts`

```ts
"use server"

import { removeCartId } from "@lib/data/cookies"

export async function clearCartAction() {
  await removeCartId()
}
```

**File**: `src/app/[countryCode]/(main)/order/[id]/confirmed/ClearCartOnLoad.tsx`

```tsx
"use client"

import { useEffect } from "react"
import { clearCartAction } from "./actions"

export default function ClearCartOnLoad() {
  useEffect(() => {
    clearCartAction().catch(() => {})
  }, [])
  return null
}
```

**File**: `src/app/[countryCode]/(main)/order/[id]/confirmed/page.tsx` — add `ClearCartOnLoad`:

```tsx
import ClearCartOnLoad from "./ClearCartOnLoad"
// ...
export default async function OrderConfirmedPage(props: Props) {
  // ...
  return (
    <>
      <ClearCartOnLoad />
      <OrderCompletedTemplate order={order} />
    </>
  )
}
```

Also update `completeOrder()` in `src/lib/data/cart.ts` to accept the `skipCookieClear` option:

```ts
export async function completeOrder(
  cartId: string,
  options?: { skipCookieClear?: boolean }
): Promise<...> {
  // ...
  if (cartRes?.type === "order") {
    // ...
    if (!options?.skipCookieClear) {
      await removeCartId()
    }
    return { success: true, redirectUrl: `/${countryCode}/order/${cartRes.order.id}/confirmed` }
  }
}
```

That's it! 🎉

## API Reference

### Components

#### `<FrisbiiPayment />`

Main payment component that routes to appropriate display mode.

```tsx
import { FrisbiiPayment } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

<FrisbiiPayment
  sessionId="reepay_session_123"
  config={{
    display_type: "overlay",
    enabled: true,
    title: "Frisbii Pay",
    // ... other config
  }}
  onComplete={() => console.log("Payment completed")}
  onCancel={() => console.log("Payment cancelled")}
/>
```

**Props:**
- `sessionId` (string) - Reepay session ID from backend
- `config` (FrisbiiPublicConfig) - Display configuration
- `onComplete?` (function) - Callback when payment succeeds
- `onCancel?` (function) - Callback when payment is cancelled

---

#### `<FrisbiiPaymentButton />`

Pre-built payment button with integrated flow.

```tsx
import { FrisbiiPaymentButton } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

<FrisbiiPaymentButton
  cart={cart}
  notReady={!cart.shipping_address}
  onOrderPlaced={async (cartId) => {
    await placeOrder(cartId)
  }}
  ButtonComponent={CustomButton} // Optional
/>
```

**Props:**
- `cart` (any) - Medusa cart object
- `notReady?` (boolean) - Disable button
- `onOrderPlaced?` (function) - Callback to place order
- `ButtonComponent?` (React.ComponentType) - Custom button component
- `data-testid?` (string) - Test ID

---

#### `<FrisbiiEmbedded />`, `<FrisbiiOverlay />`, `<FrisbiiRedirect />`

Individual display mode components (usually you use `<FrisbiiPayment />` instead).

```tsx
import { FrisbiiEmbedded } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

<FrisbiiEmbedded
  sessionId="reepay_session_123"
  onComplete={() => {}}
  onCancel={() => {}}
/>
```

---

### Hooks

#### `useFrisbiiCheckout(sessionId)`

Dynamically loads Reepay SDK and tracks loading state.

```tsx
import { useFrisbiiCheckout } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

const { loaded } = useFrisbiiCheckout(sessionId)

if (!loaded) {
  return <div>Loading payment SDK...</div>
}
```

**Returns:**
- `loaded` (boolean) - Whether SDK is loaded

---

#### `useFrisbiiConfig(backendUrl)`

Fetches Frisbii configuration from backend.

```tsx
import { useFrisbiiConfig } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

const { config, loading } = useFrisbiiConfig("http://localhost:9000")
```

**Returns:**
- `config` (FrisbiiPublicConfig | null) - Configuration object
- `loading` (boolean) - Loading state

---

### Utilities

#### `isFrisbii(providerId)`

Check if a payment provider ID is Frisbii.

```tsx
import { isFrisbii } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

if (isFrisbii(paymentSession.provider_id)) {
  // Handle Frisbii payment
}
```

---

#### `getFrisbiiConfig(backendUrl)`

Fetch configuration from backend (async).

```tsx
import { getFrisbiiConfig } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

const config = await getFrisbiiConfig("http://localhost:9000")
```

---

### Types

```tsx
import type {
  FrisbiiDisplayType,
  FrisbiiPublicConfig,
  FrisbiiPaymentProps,
  // ... other types
} from "@montaekung/medusa-plugin-frisbii-pay-frontend"
```

See [TypeScript types](./src/types/index.ts) for full type definitions.

---

## Display Modes

### Embedded

Payment form embedded directly in your checkout page.

```tsx
config={{ display_type: "embedded" }}
```

**Pros:**
- Best UX (no popups)
- Customer stays on your site
- Mobile-friendly

**Cons:**
- Requires more space on page

---

### Overlay (Modal)

Payment form opens in a modal overlay.

```tsx
config={{ display_type: "overlay" }}
```

**Pros:**
- Clean UI (doesn't take page space)
- Familiar pattern
- Easy to cancel

**Cons:**
- Popup blockers might interfere

---

### Redirect

Full redirect to Reepay hosted checkout.

```tsx
config={{ display_type: "redirect" }}
```

**Pros:**
- PCI compliance
- No SDK needed
- Works without JavaScript

**Cons:**
- Customer leaves your site
- Requires handling return URLs

---

## Advanced Usage

### Custom Button Component

```tsx
import { FrisbiiPaymentButton } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
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

---

### Manual Payment Flow

For full control, use individual components:

```tsx
import { 
  FrisbiiPayment,
  useFrisbiiCheckout 
} from "@montaekung/medusa-plugin-frisbii-pay-frontend"

const MyCheckout = () => {
  const { loaded } = useFrisbiiCheckout(sessionId)
  
  return (
    <div>
      {!loaded && <div>Loading...</div>}
      {loaded && (
        <FrisbiiPayment
          sessionId={sessionId}
          config={config}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
```

---

## Compatibility

| Package Version | Medusa Backend Plugin | Next.js | React |
|----------------|----------------------|---------|-------|
| 0.1.x          | 1.x, 2.x             | 14+, 15+ | 18+, 19+ |

---

## Troubleshooting

### Issue: Components not rendering

**Solution:** Ensure you have "use client" directive in your page/component.

```tsx
"use client"

import { FrisbiiPaymentButton } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
```

---

### Issue: `isFrisbii` is not a function / Cannot find `isFrisbii`

**Cause:** `isFrisbii` is imported but not re-exported from `@lib/constants`.

**Solution:** Ensure you re-export `isFrisbii` in your `constants.tsx`:

```tsx
// src/lib/constants.tsx
import { isFrisbii as isFrisbiiProvider } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

// Re-export for use in other files
export const isFrisbii = isFrisbiiProvider
```

---

### Issue: Module not found error

**Cause:** Package not installed or npm link not set up correctly.

**Solution:**

```bash
# If using npm link for local development
cd your-plugin-directory
npm run build
npm link

cd your-storefront-directory
npm link @montaekung/medusa-plugin-frisbii-pay-frontend

# Clear Next.js cache
rm -rf .next
npm run dev
```

---

### Issue: TypeScript errors during build

**Solution:** Ensure you have peer dependencies installed:

```bash
npm install react react-dom --save
```

---

### Issue: SDK fails to load

**Solution:** Check browser console for errors. Ensure no adblockers are blocking `checkout.reepay.com`.

---

### Issue: Payment redirect URLs not working

**Cause:** Route handlers not created for accept/cancel URLs.

**Solution:** Create route handlers as shown in Quick Start step 4, or use simple query params:

```tsx
// Alternative: Use query params instead of route handlers
sessionData.data = {
  extra: {
    accept_url: `${baseUrl}/${countryCode}/checkout?step=review&payment=success`,
    cancel_url: `${baseUrl}/${countryCode}/checkout?step=payment&payment=cancelled`,
    // ...
  },
}
```

---

## Examples

See [examples/](./examples/) directory for complete integration examples:
- [Basic Integration](./examples/integration-guide.md)
- [Custom Styling](./examples/custom-styling.md)
- [Error Handling](./examples/error-handling.md)

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md).

---

## License

MIT © MontaeKung

---

## Related Packages

- **Backend Plugin**: [@montaekung/medusa-plugin-frisbii-pay](https://github.com/sahaki/medusa-plugin-frisbii-pay)
- **Medusa**: [medusajs.com](https://medusajs.com)
- **Reepay**: [reepay.com](https://reepay.com)

---

## Support

- 📖 [Documentation](https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend#readme)
- 🐛 [Issue Tracker](https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend/issues)
- 💬 [Discussions](https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend/discussions)
