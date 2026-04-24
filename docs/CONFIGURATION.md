# Configuration Guide

## Overview

This guide explains how to configure the Frisbii Payment frontend plugin for different use cases, display modes, and customizations.

## Display Modes

The plugin supports three display modes, configured via the backend plugin.

### 1. Embedded Mode

Payment form embedded directly in your checkout page.

**Backend Configuration** (`medusa-config.ts`):
```typescript
options: {
  display_type: "embedded"
}
```

**Frontend Behavior**:
- Form renders inline in the page
- Customer stays on your domain
- Best UX (no popups or redirects)

**When to Use**:
- ✅ You have space on the checkout page
- ✅ You want seamless UX
- ✅ Mobile-friendly checkout

---

### 2. Overlay Mode (Modal)

Payment form opens in a modal overlay.

**Backend Configuration**:
```typescript
options: {
  display_type: "overlay"
}
```

**Frontend Behavior**:
- Modal opens automatically
- Customer can close modal to return
- Still on your domain

**When to Use**:
- ✅ Limited page space
- ✅ Familiar modal pattern
- ✅ Easy cancel/retry flow

---

### 3. Redirect Mode

Full redirect to Reepay hosted checkout.

**Backend Configuration**:
```typescript
options: {
  display_type: "redirect"
}
```

**Frontend Behavior**:
- Browser redirects to Reepay
- Customer leaves your site
- Returns via `accept_url` or `cancel_url`

**When to Use**:
- ✅ Maximum PCI compliance
- ✅ No SDK dependencies
- ✅ Works without JavaScript

---

## Environment Variables

### Required Variables

**File**: `.env.local`

```env
# Medusa Backend URL
MEDUSA_BACKEND_URL=http://localhost:9000

# Publishable API Key
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_your_key_here
```

### Development vs Production

**Development**:
```env
MEDUSA_BACKEND_URL=http://localhost:9000
```

**Production**:
```env
MEDUSA_BACKEND_URL=https://api.yourdomain.com
```

⚠️ **Important**: Reepay requires HTTPS in production!

---

## Component Configuration

### Custom Button Component

Replace the default button with your own:

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

Handle errors from order placement:

```tsx
<FrisbiiPaymentButton
  cart={cart}
  onOrderPlaced={async (cartId) => {
    try {
      await placeOrder(cartId)
    } catch (error) {
      console.error("Order placement failed:", error)
      
      // Show custom error UI
      showNotification({
        type: "error",
        message: "Payment succeeded but order creation failed. Please contact support.",
      })
    }
  }}
/>
```

---

### Loading States

Show custom loading indicator:

```tsx
function CustomFrisbiiButton({ cart }) {
  const [isLoading, setIsLoading] = useState(false)
  
  return (
    <>
      {isLoading && <LoadingSpinner />}
      <FrisbiiPaymentButton
        cart={cart}
        onOrderPlaced={async (cartId) => {
          setIsLoading(true)
          await placeOrder(cartId)
          setIsLoading(false)
        }}
      />
    </>
  )
}
```

---

## Payment Session Configuration

### Accept and Cancel URLs

Configure return URLs when creating payment session:

```tsx
import { isFrisbii } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"

const handleSubmit = async () => {
  if (isFrisbii(selectedPaymentMethod)) {
    const baseUrl = window.location.origin
    const countryCode = pathname.split("/")[1] || "us"
    
    await initiatePaymentSession(cart, {
      provider_id: selectedPaymentMethod,
      data: {
        extra: {
          // ✅ Configure URLs
          accept_url: `${baseUrl}/${countryCode}/checkout?step=review`,
          cancel_url: `${baseUrl}/${countryCode}/checkout?step=payment`,
          
          // Customer information
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

### URL Patterns

**Accept URL** (after successful payment):
- ✅ Should go to order review or confirmation
- Example: `/en/checkout?step=review`
- Example: `/checkout/complete?cart_id={cart_id}`

**Cancel URL** (after cancelled payment):
- ✅ Should return to payment selection
- Example: `/en/checkout?step=payment`
- Example: `/checkout?retry=true`

---

## Admin Payment Display Settings

The backend plugin attaches a widget to the Medusa Admin under **Settings → Frisbii Pay**. Two settings are available:

| Setting | Effect |
|---------|--------|
| **Enabled** | When OFF, Frisbii Pay is hidden from the checkout payment list entirely. |
| **Title** | Overrides the label shown next to the Frisbii option (default: "Frisbii Pay"). |

These settings are stored server-side and served via `GET /store/frisbii/config`. The storefront must be updated to consume them (see [INSTALLATION.md – Step 9](./INSTALLATION.md#9-enable-admin-payment-display-settings-recommended)).

### Data Flow

```
Admin => saves settings => Medusa DB
                              │
                              ▼
                  GET /store/frisbii/config
                              │
                              ▼
               getFrisbiiPublicConfig() (server-side)
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
           enabled === false      title !== ""
           filter Frisbii out     override paymentInfoMap
```

### Behavior When Settings Are Not Configured

If the admin has never saved settings, `config` in the API response will be `null`. The `getFrisbiiPublicConfig()` function handles this by returning `{ enabled: false, title: "" }` — this means Frisbii is **hidden by default** until the admin explicitly enables it.

> To show Frisbii immediately after install, go to **Settings → Frisbii Pay** in the Admin panel and set **Enabled = ON**.

---

## TypeScript Configuration

### Strict Type Checking

Enable strict types in your project:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Import Types

```tsx
import type {
  FrisbiiPublicConfig,
  FrisbiiPaymentProps,
  FrisbiiDisplayType,
} from "@montaekung/medusa-plugin-frisbii-pay-frontend"

const config: FrisbiiPublicConfig = {
  enabled: true,
  title: "Frisbii Pay",
  display_type: "overlay",
  // ...
}
```

---

## Styling Configuration

### Tailwind CSS Classes

The package uses Tailwind utility classes. Ensure Tailwind is configured:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@montaekung/medusa-plugin-frisbii-pay-frontend/**/*.{js,mjs}",
  ],
  // ...
}
```

### Custom Styling

Override default styles:

```tsx
// Wrapper with custom styles
<div className="my-custom-payment-wrapper">
  <FrisbiiPaymentButton
    cart={cart}
    ButtonComponent={({ onClick, disabled, children }) => (
      <button
        onClick={onClick}
        disabled={disabled}
        className="my-custom-button-styles"
      >
        {children}
      </button>
    )}
  />
</div>
```

---

## Localization

### Backend Configuration

Set locale in backend plugin:

```typescript
// medusa-config.ts
options: {
  locale: "da_DK" // Danish
  // or "en_GB", "sv_SE", "no_NO", etc.
}
```

### Frontend Display

The locale is automatically applied to Reepay checkout UI.

**Supported Locales**:
- `en_GB` - English (UK)
- `da_DK` - Danish
- `sv_SE` - Swedish
- `no_NO` - Norwegian
- `de_DE` - German
- `es_ES` - Spanish
- `fr_FR` - French
- `it_IT` - Italian
- `nl_NL` - Dutch

---

## Performance Configuration

### Code Splitting

The package supports code splitting:

```tsx
import dynamic from "next/dynamic"

const FrisbiiPaymentButton = dynamic(
  () => import("@montaekung/medusa-plugin-frisbii-pay-frontend").then(
    (mod) => mod.FrisbiiPaymentButton
  ),
  { ssr: false }
)
```

### Lazy Loading

SDK loads only when needed (automatically handled).

---

## Security Configuration

### HTTPS in Production

Ensure your production site uses HTTPS:

```env
# Production
MEDUSA_BACKEND_URL=https://api.yourdomain.com
```

❌ **Will NOT work**:
```env
MEDUSA_BACKEND_URL=http://api.yourdomain.com
```

### Content Security Policy

If using CSP headers, allow Reepay SDK:

```
Content-Security-Policy:
  script-src 'self' https://checkout.reepay.com;
  connect-src 'self' https://checkout.reepay.com https://api.reepay.com;
  frame-src 'self' https://checkout.reepay.com;
```

---

## Testing Configuration

### Test Mode

Configure test mode in backend:

```typescript
// medusa-config.ts
options: {
  testMode: true // Use Reepay test environment
}
```

### Test Cards

Use Reepay test cards:

| Card Number | Result |
|-------------|--------|
| 4111 1111 1111 1111 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 0069 | Expired |

---

## Advanced Configuration

### Multiple Display Modes

Support different modes per customer:

```tsx
const config: FrisbiiPublicConfig = {
  // ...
  display_type: isMobile ? "embedded" : "overlay",
}
```

### Conditional Loading

Load Frisbii only when needed:

```tsx
const [showFrisbii, setShowFrisbii] = useState(false)

{showFrisbii && (
  <FrisbiiPaymentButton
    cart={cart}
    onOrderPlaced={placeOrder}
  />
)}
```

---

## Configuration Checklist

Before going to production, verify:

- ✅ HTTPS enabled on all production URLs
- ✅ Environment variables configured correctly
- ✅ Display mode configured in backend
- ✅ Accept/Cancel URLs tested
- ✅ Error handling implemented
- ✅ Loading states shown to users
- ✅ Test mode disabled in production
- ✅ Payment flow end-to-end tested
- ✅ Mobile responsiveness verified
- ✅ CSP headers allow Reepay (if applicable)
- ✅ **Admin Display Settings**: `getFrisbiiPublicConfig()` added to storefront payment data helpers
- ✅ **Admin Display Settings**: `CheckoutForm` updated to filter methods and pass `frisbiiTitle`
- ✅ **Admin Display Settings**: `Payment` component updated to use `effectivePaymentInfoMap`
- ✅ **Admin Panel**: Frisbii Payment set to **Enabled = ON** in Settings → Frisbii Pay

---

## Troubleshooting Configuration

### Issue: SDK Won't Load

**Solution**: Check CSP headers and ad blockers

```tsx
const { loaded } = useFrisbiiCheckout(sessionId)
console.log("SDK loaded:", loaded)
```

### Issue: Wrong Display Mode

**Solution**: Verify backend configuration

```typescript
// Check what backend returns
const session = cart.payment_collection.payment_sessions[0]
console.log("Display type:", session.data.display_type)
```

### Issue: HTTPS Error in Production

**Solution**: Ensure all URLs use HTTPS

```env
# ❌ Wrong
MEDUSA_BACKEND_URL=http://api.yourdomain.com

# ✅ Correct
MEDUSA_BACKEND_URL=https://api.yourdomain.com
```

---

## Related Documentation

- [Installation](./INSTALLATION.md) - Initial setup
- [API Reference](./API_REFERENCE.md) - Component props
- [Integration Guide](./INTEGRATION_GUIDE.md) - Step-by-step
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues
