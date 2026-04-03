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
import { isFrisbii } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

export const paymentInfoMap: Record<string, { title: string; icon: JSX.Element }> = {
  // ... existing providers
  "pp_frisbii-payment_frisbii-payment": {
    title: "Frisbii Pay",
    icon: <CreditCard />,
  },
}

// Export helper function
export { isFrisbii }
```

### 2. Add Payment Button Handler

**File**: `src/modules/checkout/components/payment-button/index.tsx`

```tsx
import { FrisbiiPaymentButton } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
import { isFrisbii } from "@lib/constants"
import { placeOrder } from "@lib/data/cart"

const PaymentButton = ({ cart }) => {
  const paymentSession = cart.payment_collection?.payment_sessions?.[0]

  switch (true) {
    case isStripeLike(paymentSession?.provider_id):
      return <StripePaymentButton cart={cart} />
    
    case isFrisbii(paymentSession?.provider_id):
      return (
        <FrisbiiPaymentButton
          cart={cart}
          notReady={!cart.shipping_address || !cart.billing_address}
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
import { initiatePaymentSession } from "@lib/data/cart"

const handleSubmit = async () => {
  if (isFrisbii(selectedPaymentMethod)) {
    const baseUrl = window.location.origin
    const countryCode = pathname.split("/")[1] || "us"
    
    await initiatePaymentSession(cart, {
      provider_id: selectedPaymentMethod,
      data: {
        extra: {
          accept_url: `${baseUrl}/${countryCode}/checkout?step=review`,
          cancel_url: `${baseUrl}/${countryCode}/checkout?step=payment`,
          customer_email: cart.email,
          customer_first_name: cart.shipping_address?.first_name,
          customer_last_name: cart.shipping_address?.last_name,
          customer_handle: cart.customer_id || `guest-${cart.id}`,
        },
      },
    })
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

### Issue: TypeScript errors

**Solution:** Ensure you have peer dependencies installed:

```bash
npm install react react-dom --save
```

---

### Issue: SDK fails to load

**Solution:** Check browser console for errors. Ensure no adblockers are blocking `checkout.reepay.com`.

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
