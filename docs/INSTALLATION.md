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
            accept_url: `${baseUrl}/${countryCode}/checkout?step=review`,
            cancel_url: `${baseUrl}/${countryCode}/checkout?step=payment`,
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

### 7. Create Route Handlers (For Redirect Mode)

If using **redirect** display mode, create route handlers to process Reepay callbacks:

**File**: `src/app/[countryCode]/checkout/frisbii/accept/route.ts`

```tsx
import { NextRequest, NextResponse } from "next/server"
import { placeOrder } from "@lib/data/cart"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cartId = searchParams.get("cart_id")
  const countryCode = request.nextUrl.pathname.split("/")[1] || "us"

  if (!cartId) {
    return NextResponse.redirect(
      new URL(`/${countryCode}/checkout?step=payment&error=missing_cart`, request.url)
    )
  }

  try {
    await placeOrder(cartId)
    return NextResponse.redirect(
      new URL(`/${countryCode}/order/confirmed/${cartId}`, request.url)
    )
  } catch (error) {
    console.error("[Frisbii Accept] Error:", error)
    return NextResponse.redirect(
      new URL(`/${countryCode}/checkout?step=review&error=order_failed`, request.url)
    )
  }
}
```

**File**: `src/app/[countryCode]/checkout/frisbii/cancel/route.ts`

```tsx
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const countryCode = request.nextUrl.pathname.split("/")[1] || "us"
  
  return NextResponse.redirect(
    new URL(`/${countryCode}/checkout?step=payment`, request.url)
  )
}
```

> **Note:** For embedded or overlay modes, route handlers are optional as the payment flow stays on the same page.
```

## Verification

### 1. Check Installation

Verify the package is installed:

```bash
npm list @montaekung/medusa-plugin-frisbii-pay-frontend
```

Expected output:
```
└── @montaekung/medusa-plugin-frisbii-pay-frontend@0.1.0-beta.1
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
