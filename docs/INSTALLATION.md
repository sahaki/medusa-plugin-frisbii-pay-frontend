# Installation Guide

## Overview

The **@montaekung/medusa-plugin-frisbii-pay-frontend** plugin provides React components and hooks for integrating Frisbii Payment (Reepay) into your Medusa Next.js storefront. This guide walks you through installation and initial setup.

## Prerequisites

- Medusa backend with `@montaekung/medusa-plugin-frisbii-pay` installed and configured
- Next.js 14+ or 15+
- React 18+ or 19+
- Node.js v18 or higher
- npm, yarn, or pnpm package manager

## Installation Steps

### 1. Install the Package

```bash
npm install @montaekung/medusa-plugin-frisbii-pay-frontend
```

Or using yarn:

```bash
yarn add @montaekung/medusa-plugin-frisbii-pay-frontend
```

Or using pnpm:

```bash
pnpm add @montaekung/medusa-plugin-frisbii-pay-frontend
```

### 2. Verify Peer Dependencies

The package requires React and React DOM. They should already be installed in your Next.js project:

```bash
npm list react react-dom
```

Expected output:
```
├── react@19.0.4
└── react-dom@19.0.4
```

If missing, install them:

```bash
npm install react react-dom
```

### 3. Configure Environment Variables

Ensure your `.env.local` has the Medusa backend URL:

```env
MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_your_key_here
```

### 4. Update Payment Constants

**File**: `src/lib/constants.tsx`

Add Frisbii to your payment info map:

```tsx
import { CreditCard } from "@medusajs/icons"
import { isFrisbii as isFrisbiiProvider } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  // ... existing payment providers
  pp_stripe_stripe: {
    title: "Credit card",
    icon: <CreditCard />,
  },
  
  // ✅ Add Frisbii
  "pp_frisbii-payment_frisbii-payment": {
    title: "Frisbii Pay",
    icon: <CreditCard />,
  },
}

// ✅ Export helper function
export const isFrisbii = isFrisbiiProvider
```

### 5. Update Payment Button Component

**File**: `src/modules/checkout/components/payment-button/index.tsx`

Add Frisbii payment button handler:

```tsx
"use client"

import { FrisbiiPaymentButton } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
import { isStripeLike, isManual, isFrisbii } from "@lib/constants"
import { placeOrder } from "@lib/data/cart"
import { Button } from "@medusajs/ui"

const PaymentButton = ({ cart, "data-testid": dataTestId }) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  const paymentSession = cart.payment_collection?.payment_sessions?.[0]

  switch (true) {
    case isStripeLike(paymentSession?.provider_id):
      return <StripePaymentButton cart={cart} notReady={notReady} />
    
    case isManual(paymentSession?.provider_id):
      return <ManualTestPaymentButton notReady={notReady} />
    
    // ✅ Add Frisbii handler
    case isFrisbii(paymentSession?.provider_id):
      return (
        <FrisbiiPaymentButton
          cart={cart}
          notReady={notReady}
          onOrderPlaced={async (cartId) => {
            await placeOrder(cartId)
          }}
          data-testid={dataTestId}
        />
      )
    
    default:
      return <Button disabled>Select a payment method</Button>
  }
}

export default PaymentButton
```

### 6. Initialize Payment Session

**File**: `src/modules/checkout/components/payment/index.tsx`

Add Frisbii session initialization in the `handleSubmit` function:

```tsx
import { isFrisbii } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"

const handleSubmit = async () => {
  setIsLoading(true)
  try {
    const checkActiveSession =
      activeSession?.provider_id === selectedPaymentMethod

    if (!checkActiveSession) {
      const sessionData: {
        provider_id: string
        data?: Record<string, unknown>
      } = { provider_id: selectedPaymentMethod }

      // ✅ Add Frisbii session data
      if (isFrisbii(selectedPaymentMethod)) {
        const baseUrl = window.location.origin
        const countryCode = pathname.split("/")[1] || "us"
        const addr = cart.shipping_address

        sessionData.data = {
          extra: {
            // accept_url MUST point to the storefront accept page (not checkout step)
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

    // Navigate to next step
    if (!isStripeLike(selectedPaymentMethod)) {
      return router.push(
        pathname + "?" + createQueryString("step", "review"),
        { scroll: false }
      )
    }
  } catch (err: any) {
    setError(err.message)
  } finally {
    setIsLoading(false)
  }
}
```

### 7. Create Accept / Cancel Pages (Required for Redirect Mode)

If using **redirect** display mode, create two pages (not Route Handlers) to process Reepay callbacks.

> **Important — Next.js Server Component constraints:**
> - `removeCartId()` calls `cookies().delete()` which is **not allowed** during a Server Component render.
> - `revalidateTag()` is also disallowed during render.
> - Use `{ skipCookieClear: true }` in `completeOrder()` and clean up the cart from the confirmed page instead (Step 8).

**File**: `src/app/[countryCode]/checkout/frisbii/accept/page.tsx`

```tsx
import { completeOrder } from "@lib/data/cart"
import { redirect } from "next/navigation"

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

// Slow-path fallback: polls backend until webhook creates the order
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

  // Fast path: completeOrder with retries (~10–20 s).
  // skipCookieClear: true is required — cookies().delete() is not allowed during SSR render.
  const result = await completeOrder(cartId!, { skipCookieClear: true })
  if (result.success) redirect(result.redirectUrl)

  // Slow path: wait for Reepay webhook to create the order
  const order = await pollOrderByCart(cartId!, 10, 2000)
  if (order) redirect(`/${order.country_code}/order/${order.order_id}/confirmed`)

  // Final fallback
  redirect(`/${countryCode}/checkout?step=review`)
}
```

**File**: `src/app/[countryCode]/checkout/frisbii/cancel/page.tsx`

```tsx
"use client"

import { useSearchParams, useRouter, useParams } from "next/navigation"
import { useEffect } from "react"

export default function FrisbiiCancelPage() {
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

Also update `completeOrder()` in `src/lib/data/cart.ts` to support the `skipCookieClear` option:

```ts
export async function completeOrder(
  cartId: string,
  options?: { skipCookieClear?: boolean }
): Promise<{ success: true; redirectUrl: string } | { success: false; error: string }> {
  // ...
  if (cartRes?.type === "order") {
    // ...
    if (!options?.skipCookieClear) {
      await removeCartId()
    }
    return { success: true, redirectUrl: `/${countryCode}/order/${cartRes.order.id}/confirmed` }
  }
  // ...
}
```

### 8. Clear Cart on the Confirmed Page

Since `removeCartId()` is skipped in the accept page, clear the cart via a Server Action when the confirmed page loads.

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

**File**: `src/app/[countryCode]/(main)/order/[id]/confirmed/page.tsx` — add `<ClearCartOnLoad />`:

```tsx
import ClearCartOnLoad from "./ClearCartOnLoad"

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

> For embedded or overlay modes, the accept/cancel pages and `ClearCartOnLoad` are still recommended so that cart state is reliably cleared after payment.

## Verification

### 1. Check Installation

Verify the package is installed:

```bash
npm list @montaekung/medusa-plugin-frisbii-pay-frontend
```

Expected output:
```
└── @montaekung/medusa-plugin-frisbii-pay-frontend@0.1.0-beta.2
```

### 2. Test in Development

Start your storefront:

```bash
npm run dev
```

Navigate to checkout and verify:
- ✅ "Frisbii Pay" appears in payment method list
- ✅ Selecting Frisbii shows proper UI
- ✅ "Place order" button is enabled

### 3. Test Payment Flow

1. Add items to cart
2. Go to checkout
3. Enter shipping/billing information
4. Select "Frisbii Pay"
5. Click "Continue to review"
6. Click "Place order"
7. Complete test payment in Reepay UI

## Next Steps

- [Configuration Guide](./CONFIGURATION.md) - Customize display modes and behavior
- [Integration Guide](./INTEGRATION_GUIDE.md) - Advanced integration patterns
- [API Reference](./API_REFERENCE.md) - Component and hook documentation
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

## Uninstallation

To remove the package:

```bash
npm uninstall @montaekung/medusa-plugin-frisbii-pay-frontend
```

Don't forget to:
1. Remove Frisbii entry from `paymentInfoMap` in `src/lib/constants.tsx`
2. Remove Frisbii case from payment button component
3. Remove Frisbii session initialization from payment component

## Support

- 📖 [Full Documentation](../README.md)
- 🐛 [Report Issues](https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend/issues)
- 💬 [Discussions](https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend/discussions)
