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
   - Complete test payment

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
