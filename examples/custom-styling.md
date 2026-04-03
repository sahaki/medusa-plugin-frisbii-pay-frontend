# Custom Styling Guide

Learn how to customize the appearance of Frisbii Payment components.

## Overview

Frisbii components are designed to be flexible and customizable. You can:
- Use custom button components
- Apply custom CSS classes
- Control display behavior
- Handle loading states

---

## Custom Button Component

### Using Medusa UI Button

```tsx
import { Button } from "@medusajs/ui"
import { FrisbiiPaymentButton } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

const MedusaButton = ({ onClick, disabled, children }) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    size="large"
    variant="primary"
    className="w-full"
  >
    {children}
  </Button>
)

<FrisbiiPaymentButton
  cart={cart}
  ButtonComponent={MedusaButton}
  onOrderPlaced={placeOrder}
/>
```

---

### Custom Styled Button

```tsx
const CustomStyledButton = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      w-full px-6 py-3 rounded-lg font-semibold
      transition-all duration-200
      ${disabled 
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
        : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
      }
    `}
  >
    {children}
  </button>
)

<FrisbiiPaymentButton
  cart={cart}
  ButtonComponent={CustomStyledButton}
  onOrderPlaced={placeOrder}
/>
```

---

### Button with Loading State

```tsx
import { Spinner } from "@components/common/spinner"

const ButtonWithLoading = ({ onClick, disabled, children }) => {
  const [loading, setLoading] = useState(false)
  
  const handleClick = async () => {
    setLoading(true)
    try {
      await onClick()
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <Spinner />
          <span>Processing...</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
}
```

---

## Styling Display Modes

### Embedded Mode

The embedded component renders a container div that you can style:

```tsx
import { FrisbiiEmbedded } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

// Wrapper with custom styling
<div className="border border-gray-200 rounded-lg p-6 bg-white shadow-md">
  <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
  <FrisbiiEmbedded
    sessionId={sessionId}
    onComplete={onComplete}
    onCancel={onCancel}
  />
</div>
```

The component itself renders:
```tsx
<div ref={containerRef} className="w-full min-h-[400px]" />
```

You can override with a wrapper div.

---

### Overlay Mode

Customize the loading text:

```tsx
import { FrisbiiOverlay } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

// Create wrapper component
const StyledFrisbiiOverlay = (props) => (
  <div className="text-center py-8">
    <div className="animate-pulse">
      <div className="text-xl font-semibold text-gray-700 mb-2">
        Preparing payment...
      </div>
      <div className="text-sm text-gray-500">
        The payment window will open shortly
      </div>
    </div>
    <FrisbiiOverlay {...props} />
  </div>
)
```

---

### Redirect Mode

Customize redirect message:

```tsx
import { FrisbiiRedirect } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

const StyledFrisbiiRedirect = (props) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
    <h3 className="text-xl font-semibold text-gray-700 mb-2">
      Redirecting to payment...
    </h3>
    <p className="text-sm text-gray-500">
      Please wait while we redirect you to our secure payment page
    </p>
    <FrisbiiRedirect {...props} />
  </div>
)
```

---

## Complete Custom Payment Flow

Build your own payment flow UI:

```tsx
"use client"

import { useState } from "react"
import { FrisbiiPayment } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
import { Button } from "@medusajs/ui"
import { Shield, CreditCard, Lock } from "@medusajs/icons"

const CustomFrisbiiPayment = ({ cart, onOrderPlaced }) => {
  const [showPayment, setShowPayment] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  const session = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )
  
  const sessionId = session?.data?.session_id
  const config = {
    display_type: session?.data?.display_type || "overlay",
    enabled: true,
    title: "Frisbii Pay",
    allowed_payment_methods: [],
    payment_icons: [],
    locale: "en_GB",
    save_card_enabled: false,
    save_card_default_unchecked: false,
  }
  
  const handleComplete = async () => {
    setProcessing(true)
    try {
      await onOrderPlaced(cart.id)
    } catch (error) {
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }
  
  if (!showPayment) {
    return (
      <div className="space-y-4">
        {/* Security Badge */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Shield className="w-4 h-4" />
          <span>Secure payment powered by Frisbii</span>
        </div>
        
        {/* Payment Features */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>All major credit cards accepted</span>
            </li>
            <li className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>PCI DSS compliant secure checkout</span>
            </li>
          </ul>
        </div>
        
        {/* Payment Button */}
        <Button
          onClick={() => setShowPayment(true)}
          disabled={!sessionId}
          size="large"
          className="w-full"
        >
          Continue to Payment
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <FrisbiiPayment
          sessionId={sessionId}
          config={config}
          onComplete={handleComplete}
          onCancel={() => setShowPayment(false)}
        />
      </div>
      
      {processing && (
        <div className="text-center text-sm text-gray-600">
          Processing your order...
        </div>
      )}
    </div>
  )
}

export default CustomFrisbiiPayment
```

---

## Tailwind CSS Examples

### Card-style Container

```tsx
<div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
  <div className="p-8">
    <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
      Payment
    </div>
    <p className="mt-2 text-gray-500">
      Complete your payment securely
    </p>
    <div className="mt-6">
      <FrisbiiPaymentButton cart={cart} onOrderPlaced={placeOrder} />
    </div>
  </div>
</div>
```

---

### Dark Mode Support

```tsx
<div className="dark:bg-gray-800 bg-white rounded-lg p-6">
  <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-4">
    Payment Method
  </h3>
  <FrisbiiPaymentButton 
    cart={cart}
    ButtonComponent={({ onClick, disabled, children }) => (
      <button
        onClick={onClick}
        disabled={disabled}
        className="
          w-full px-6 py-3 rounded-lg font-semibold
          bg-blue-600 hover:bg-blue-700
          dark:bg-blue-500 dark:hover:bg-blue-600
          text-white
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
        "
      >
        {children}
      </button>
    )}
    onOrderPlaced={placeOrder}
  />
</div>
```

---

## Responsive Design

```tsx
<div className="w-full">
  {/* Mobile */}
  <div className="md:hidden">
    <FrisbiiPaymentButton
      cart={cart}
      ButtonComponent={({ onClick, disabled, children }) => (
        <button
          onClick={onClick}
          disabled={disabled}
          className="w-full px-4 py-3 text-sm bg-blue-600 text-white rounded-lg"
        >
          {children}
        </button>
      )}
      onOrderPlaced={placeOrder}
    />
  </div>
  
  {/* Desktop */}
  <div className="hidden md:block">
    <FrisbiiPaymentButton
      cart={cart}
      ButtonComponent={({ onClick, disabled, children }) => (
        <button
          onClick={onClick}
          disabled={disabled}
          className="w-full px-8 py-4 text-base bg-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        >
          {children}
        </button>
      )}
      onOrderPlaced={placeOrder}
    />
  </div>
</div>
```

---

## Animation Examples

### Fade In

```tsx
import { motion } from "framer-motion"

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  <FrisbiiPaymentButton cart={cart} onOrderPlaced={placeOrder} />
</motion.div>
```

---

### Slide In

```tsx
<motion.div
  initial={{ x: -100, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  transition={{ type: "spring", stiffness: 100 }}
>
  <FrisbiiPayment
    sessionId={sessionId}
    config={config}
    onComplete={onComplete}
  />
</motion.div>
```

---

## Best Practices

1. **Maintain accessibility** - Ensure proper aria labels and keyboard navigation
2. **Show loading states** - Users should know when something is processing
3. **Provide feedback** - Show success/error messages clearly
4. **Mobile-first** - Design for mobile, enhance for desktop
5. **Test colors** - Ensure sufficient contrast for readability

---

## Need Help?

- Check [Integration Guide](./integration-guide.md)
- See [Error Handling](./error-handling.md)
- Open an [Issue](https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend/issues)
