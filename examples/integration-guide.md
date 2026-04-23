# Integration Guide

Complete step-by-step guide for integrating Frisbii Payment into your Medusa Next.js storefront.

## Prerequisites

1. **Backend Setup**
   - Install `@montaekung/medusa-plugin-frisbii-pay` on your Medusa backend
   - Configure the plugin in `medusa-config.ts`
   - Ensure Frisbii provider is enabled in your region

2. **Environment Variables**
   ```env
   MEDUSA_BACKEND_URL=http://localhost:9000
   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
   ```

---

## Step-by-Step Integration

### Step 1: Install Package

```bash
npm install @montaekung/medusa-plugin-frisbii-pay-frontend
```

---

### Step 2: Update Payment Constants

**File**: `src/lib/constants.tsx`

```tsx
import { CreditCard } from "@medusajs/icons"
import { isFrisbii as isFrisbiiProvider } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

export const paymentInfoMap: Record<string, { title: string; icon: JSX.Element }> = {
  pp_stripe_stripe: {
    title: "Credit card",
    icon: <CreditCard />,
  },
  pp_system_default: {
    title: "Manual Payment",
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

---

### Step 3: Update Payment Button Component

**File**: `src/modules/checkout/components/payment-button/index.tsx`

```tsx
"use client"

import { FrisbiiPaymentButton } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
import { isStripeLike, isManual, isFrisbii } from "@lib/constants"
import { placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import React from "react"

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  "data-testid": string
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  const paymentSession = cart.payment_collection?.payment_sessions?.[0]

  switch (true) {
    case isStripeLike(paymentSession?.provider_id):
      return (
        <StripePaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isManual(paymentSession?.provider_id):
      return (
        <ManualTestPaymentButton notReady={notReady} data-testid={dataTestId} />
      )
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

---

### Step 4: Initialize Payment Session (Payment Component)

**File**: `src/modules/checkout/components/payment/index.tsx`

Find the `handleSubmit` function and add Frisbii session initialization:

```tsx
import { isFrisbii } from "@lib/constants"

const handleSubmit = async () => {
  setIsLoading(true)
  try {
    const shouldInputCard =
      isStripeLike(selectedPaymentMethod) && !activeSession

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
            // accept_url MUST point to a dedicated accept page — NOT a checkout step.
            // Reepay redirects the browser here before the webhook fires.
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

    if (!shouldInputCard) {
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

---

### Step 5: Test the Integration

1. **Start your storefront**
   ```bash
   npm run dev
   ```

2. **Navigate to checkout**
   - Add items to cart
   - Go to checkout: `http://localhost:8000/[countryCode]/checkout`

3. **Select Frisbii Pay**
   - Should see "Frisbii Pay" in payment methods
   - Select it and click "Continue to review"

4. **Complete Payment**
   - Click "Place order"
   - Frisbii payment UI should appear
   - Complete test payment (including 3DS if prompted)
   - You should be redirected to the order confirmed page
   - Cart should be cleared (Cart 0)

---

## Customization

### Custom Button Component

Use your own button styling:

```tsx
import { Button } from "@medusajs/ui"
import { FrisbiiPaymentButton } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

const CustomButton = ({ onClick, disabled, children }) => (
  <Button 
    onClick={onClick} 
    disabled={disabled}
    size="large"
    variant="primary"
  >
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

### Custom Error Handling

```tsx
<FrisbiiPaymentButton
  cart={cart}
  onOrderPlaced={async (cartId) => {
    try {
      await placeOrder(cartId)
    } catch (error) {
      console.error("Order placement failed:", error)
      // Show custom error message
      setError("Payment succeeded but order creation failed")
    }
  }}
/>
```

---

### Step 6: Create Accept / Cancel Pages

After Reepay processes payment, it redirects the browser back to `accept_url`. Create a dedicated **Server Component page** (not a Route Handler) at that path.

> **Important**: Use `skipCookieClear: true` in `completeOrder()` because `cookies().delete()` cannot be called during a Next.js Server Component render — it must be done in a Server Action (Step 7).

**File**: `src/app/[countryCode]/checkout/frisbii/accept/page.tsx`

```tsx
import { completeOrder } from "@lib/data/cart"
import { redirect } from "next/navigation"

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

// Slow-path: polls /store/frisbii/order-by-cart until webhook creates the order
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
        if (data?.order_id)
          return { order_id: data.order_id, country_code: data.country_code || "dk" }
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

  // Fast path: completeOrder() with internal retries (~10–20 s total)
  // skipCookieClear is required — removeCartId() cannot run during SSR render
  const result = await completeOrder(cartId!, { skipCookieClear: true })
  if (result.success) redirect(result.redirectUrl)

  // Slow path: Reepay webhook may not have fired yet — poll for the order
  const order = await pollOrderByCart(cartId!, 10, 2000)
  if (order) redirect(`/${order.country_code}/order/${order.order_id}/confirmed`)

  // Final fallback
  redirect(`/${countryCode}/checkout?step=review`)
}
```

**File**: `src/app/[countryCode]/checkout/frisbii/cancel/page.tsx`

```tsx
"use client"

import { useParams, useRouter } from "next/navigation"
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

Also update `completeOrder()` in `src/lib/data/cart.ts` to accept the `skipCookieClear` option:

```ts
export async function completeOrder(
  cartId: string,
  options?: { skipCookieClear?: boolean }
) {
  // ...
  if (cartRes?.type === "order") {
    if (!options?.skipCookieClear) {
      await removeCartId()
    }
    return { success: true, redirectUrl: `/${countryCode}/order/${cartRes.order.id}/confirmed` }
  }
  // ...
}
```

---

### Step 7: Clear Cart on the Confirmed Page

Since `removeCartId()` was skipped in the accept page, clean up the cart cookie via a **Server Action** when the confirmed page mounts.

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

---

## Common Issues

### Issue: Frisbii doesn't appear in payment methods

**Cause**: Provider not assigned to region

**Solution**:
1. Go to Medusa Admin → Regions
2. Select your region
3. Add "Frisbii Payment" to payment providers

---

### Issue: "Select a payment method" button disabled

**Cause**: No payment handler for Frisbii

**Solution**: Ensure you added the `isFrisbii` case in `payment-button/index.tsx` (Step 3)

---

### Issue: Payment session not created

**Cause**: Missing session initialization

**Solution**: Ensure you added Frisbii session data in `payment/index.tsx` (Step 4)

---

### Issue: UI not appearing after clicking "Place order"

**Cause**: Missing "use client" directive

**Solution**: Add `"use client"` at the top of your payment button file

---

### Issue: Accept page returns 500 — "Cookies can only be modified in a Server Action or Route Handler"

**Cause**: `completeOrder()` calls `removeCartId()` which calls `cookies().delete()`. In Next.js, this is only allowed inside a Server Action or Route Handler, not during a Server Component render.

**Solution**: Pass `skipCookieClear: true` to `completeOrder()` in your accept page, and clear the cart via `ClearCartOnLoad` on the confirmed page instead (see Steps 6 and 7).

```tsx
// ✅ Correct
const result = await completeOrder(cartId!, { skipCookieClear: true })

// ❌ Wrong — crashes during Server Component render
const result = await completeOrder(cartId!)
```

---

### Issue: After payment, browser is redirected back to `checkout?step=review`

**Cause**: Reepay redirects the browser to `accept_url` *before* the payment webhook fires. If the `accept_url` was set to a checkout step (e.g., `checkout?step=review`) instead of a dedicated accept page, the order is never completed.

Also occurs when `completeOrder()` retries are exhausted and `pollOrderByCart()` is not implemented.

**Solution**:
1. Set `accept_url` to a **dedicated page**: `/{countryCode}/checkout/frisbii/accept?cart_id={cartId}` (see Step 6)
2. Implement the two-path accept page: fast path via `completeOrder()` + slow path via `pollOrderByCart()`

---

## Next Steps

- [Custom Styling](./custom-styling.md)
- [Error Handling](./error-handling.md)
- [Testing](./testing.md)

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify backend plugin is configured correctly
3. Ensure Reepay SDK can load (check network tab)
4. Create an issue: [GitHub Issues](https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend/issues)
