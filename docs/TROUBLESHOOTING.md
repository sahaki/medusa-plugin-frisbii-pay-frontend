# Troubleshooting Guide

## Common Issues and Solutions

This guide covers common problems and their solutions when integrating Frisbii Payment into your Medusa storefront.

---

## Installation Issues

### Issue: Package Not Found

**Error**:
```
npm ERR! 404 Not Found - GET https://registry.npmjs.org/@montaekung/medusa-plugin-frisbii-pay-frontend
```

**Solution**:
```bash
# Verify package name
npm info @montaekung/medusa-plugin-frisbii-pay-frontend

# If testing locally, use npm link
cd /path/to/medusa-plugin-frisbii-pay-frontend
npm link

cd /path/to/your-storefront
npm link @montaekung/medusa-plugin-frisbii-pay-frontend
```

---

### Issue: Peer Dependency Warnings

**Error**:
```
npm WARN @montaekung/medusa-plugin-frisbii-pay-frontend@0.1.0 requires a peer of react@^18.0.0 || ^19.0.0 but none is installed.
```

**Solution**:
```bash
npm install react@19.0.4 react-dom@19.0.4
```

---

## Runtime Issues

### Issue: "Frisbii Pay" Not Appearing in Checkout

**Symptoms**:
- Payment methods list doesn't show Frisbii
- Only Stripe/Manual payment visible

**Causes & Solutions**:

#### 0. Frisbii Disabled in Admin Settings

**Check**: Medusa Admin → Settings → Frisbii Pay → Enabled toggle

**Solution**: Turn **Enabled** ON and save. If the storefront integration for display settings is not set up yet, see [INSTALLATION.md – Step 9](./INSTALLATION.md#9-enable-admin-payment-display-settings-recommended).

---

**Check**: Medusa Admin → Regions → Payment Providers

**Solution**: Add Frisbii Payment provider to your region

---

#### 2. Missing Constants Entry

**Check**: `src/lib/constants.tsx`

**Solution**: Add Frisbii to `paymentInfoMap`:

```tsx
import { CreditCard } from "@medusajs/icons"

export const paymentInfoMap = {
  // ... other providers
  "pp_frisbii-payment_frisbii-payment": {
    title: "Frisbii Pay",
    icon: <CreditCard />,
  },
}
```

---

#### 3. Backend Plugin Not Configured

**Check**: Backend logs

```bash
# In backend terminal
grep -i "frisbii" logs/medusa.log
```

**Solution**: Ensure backend plugin is installed and configured:

```bash
cd /path/to/backend
npm install @montaekung/medusa-plugin-frisbii-pay
```

---

### Issue: "Place Order" Button Disabled

**Symptoms**:
- Button shows "Select a payment method"
- Button is greyed out

**Causes & Solutions**:

#### 1. Missing Payment Button Handler

**Check**: `src/modules/checkout/components/payment-button/index.tsx`

**Solution**: Add Frisbii case:

```tsx
import { FrisbiiPaymentButton } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
import { isFrisbii } from "@lib/constants"

switch (true) {
  // ... other cases
  case isFrisbii(paymentSession?.provider_id):
    return <FrisbiiPaymentButton cart={cart} onOrderPlaced={placeOrder} />
  default:
    return <Button disabled>Select a payment method</Button>
}
```

---

#### 2. Payment Session Not Created

**Check**: Browser console

```javascript
console.log(cart.payment_collection?.payment_sessions)
```

**Solution**: Ensure payment session initialization:

```tsx
// In payment component handleSubmit
if (isFrisbii(selectedPaymentMethod)) {
  await initiatePaymentSession(cart, {
    provider_id: selectedPaymentMethod,
    data: { extra: { /* ... */ } }
  })
}
```

---

### Issue: SDK Fails to Load

**Symptoms**:
- Console error: "Reepay is not defined"
- Payment UI doesn't appear

**Causes & Solutions**:

#### 1. Ad Blocker Blocking SDK

**Check**: Disable ad blocker and test

**Solution**: Inform users to disable ad blockers, or use redirect mode

---

#### 2. Network Error

**Check**: Browser DevTools → Network tab

**Solution**: Verify `checkout.reepay.com` is accessible:

```bash
# Test connectivity
curl https://checkout.reepay.com/checkout.js
```

---

#### 3. Content Security Policy

**Check**: Console errors mentioning CSP

**Solution**: Add Reepay to CSP headers:

```
Content-Security-Policy:
  script-src 'self' https://checkout.reepay.com;
```

---

### Issue: Payment Succeeds But No Redirect to Thank-You Page and Cart Not Cleared

**Symptoms**:
- User completes payment in the Reepay overlay/modal
- An order IS created in the Medusa admin
- The browser stays on the checkout page (no redirect to `/order/…/confirmed`)
- Cart items are still visible (cart cookie not cleared)

**Root Cause** (fixed in plugin v0.1.0-beta.2+):

```
Reepay "Accept" event fires (JS SDK)
      ↓
Frontend immediately calls placeOrder(cart.id) via server action
      ↓
Medusa calls authorizePayment() → checks Reepay REST API for charge state
      ↓
RACE CONDITION: Reepay's API still shows charge as "pending"
  (the SDK event fires before Reepay's internal state is fully propagated)
      ↓
authorizePayment() returns "pending"
      ↓
cart.complete() returns { type: "cart" }  ← not an order
      ↓
❌ placeOrder() returns early — no redirect, no removeCartId()

... later ...
Reepay webhook "invoice_authorized" arrives
Medusa processPaymentWorkflow creates the order ✅
But the browser is still on the checkout page ❌
```

**Solution (applied automatically in current plugin version)**:

The `FrisbiiPaymentButton` now redirects the browser to the `accept_url` route
(e.g. `/dk/checkout/frisbii/accept?cart_id=…`) instead of calling `placeOrder()`
directly from the Reepay SDK callback.  The extra HTTP roundtrip gives Reepay
time to mark the charge as "authorized", so `completeOrder()` on the accept
page reliably succeeds.

The `accept_url` is stored in the Medusa payment session data by the backend
plugin's `initiatePayment()`. Any session initiated before this fix was
deployed will fall back to the old `onOrderPlaced(cartId)` path.

**Required setup**:

1. The storefront must pass `accept_url` when initiating the payment session:

```tsx
// In your payment component handleSubmit (payment/index.tsx)
if (isFrisbii(selectedPaymentMethod)) {
  const baseUrl = window.location.origin
  const countryCode = pathname.split("/")[1] || "us"
  sessionData.data = {
    extra: {
      accept_url: `${baseUrl}/${countryCode}/checkout/frisbii/accept?cart_id=${cart.id}`,
      cancel_url: `${baseUrl}/${countryCode}/checkout/frisbii/cancel?cart_id=${cart.id}`,
    },
  }
}
```

2. The accept page must exist at:
   `src/app/[countryCode]/(checkout)/checkout/frisbii/accept/page.tsx`

   Use the two-path pattern with `skipCookieClear: true` (required — Next.js does not allow `cookies().delete()` during Server Component render):

```tsx
import { completeOrder } from "@lib/data/cart"
import { redirect } from "next/navigation"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

async function pollOrderByCart(cartId: string, maxAttempts = 10, delayMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, delayMs))
    try {
      const res = await fetch(`${BACKEND_URL}/store/frisbii/order-by-cart?cart_id=${encodeURIComponent(cartId)}`, {
        cache: "no-store", headers: { "x-publishable-api-key": PUBLISHABLE_KEY }
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.order_id) return { order_id: data.order_id, country_code: data.country_code || "dk" }
      }
    } catch {}
  }
  return null
}

export default async function FrisbiiAcceptPage({ searchParams, params }) {
  const { cart_id: cartId } = await searchParams
  const { countryCode } = await params

  if (!cartId) redirect(`/${countryCode}/checkout?step=review`)

  const result = await completeOrder(cartId!, { skipCookieClear: true })
  if (result.success) redirect(result.redirectUrl)

  const order = await pollOrderByCart(cartId!, 10, 2000)
  if (order) redirect(`/${order.country_code}/order/${order.order_id}/confirmed`)

  redirect(`/${countryCode}/checkout?step=review`)
}
```

3. The confirmed page must clear the cart via a Server Action (see INSTALLATION.md Step 8).

3. Rebuild the backend plugin and restart both servers after updating:

```bash
# Backend plugin
cd /path/to/medusa-plugin-frisbii-pay
npm run build

# Restart medusa-store (picks up new .medusa/server)
# Then restart medusa-store-storefront (picks up new dist/)
```

---

### Issue: Payment Completes But Order Not Created in Medusa

**Symptoms**:
- Payment succeeds in Reepay
- Order not created in Medusa
- Customer charged but no order confirmation

**Causes & Solutions**:

#### 1. Error in placeOrder()

**Check**: Browser console and network tab

**Solution**: Add error handling:

```tsx
<FrisbiiPaymentButton
  cart={cart}
  onOrderPlaced={async (cartId) => {
    try {
      await placeOrder(cartId)
    } catch (error) {
      console.error("Order placement failed:", error)
      
      // Show error to user
      alert("Payment succeeded but order creation failed. Please contact support with this error: " + error.message)
    }
  }}
/>
```

---

#### 2. Backend Error

**Check**: Backend logs

```bash
tail -f logs/medusa.log | grep -i error
```

**Solution**: Check backend payment provider configuration

---

### Issue: Frisbii Still Visible After Setting Enabled = OFF in Admin

**Symptoms**:
- Admin → Settings → Frisbii Pay → Enabled is OFF and saved (shows a success toast)
- Frisbii Pay still appears as a payment option in the storefront checkout

**Root Cause**: The storefront is not calling `getFrisbiiPublicConfig()` to check the setting, or one of the three required code changes is missing.

**Checklist**:

1. **`getFrisbiiPublicConfig()` uses `sdk.client.fetch`, not native `fetch`**

   Native `fetch` does not include the `x-publishable-api-key` header. The backend returns a `401` which is swallowed by `.catch(() => null)`, so the function returns `null` instead of `{enabled: false}`, and Frisbii is never filtered out.

   ```ts
   // ✅ Correct
   sdk.client.fetch("/store/frisbii/config", { method: "GET", cache: "no-store" })

   // ❌ Wrong — will return 401 silently
   fetch(`${BACKEND_URL}/store/frisbii/config`)
   ```

2. **Filter uses `=== false`, not `!config?.enabled`**

   When `getFrisbiiPublicConfig()` returns `null` (e.g. on error), `null?.enabled` is `undefined`, and `!undefined` is `true` — this would incorrectly hide Frisbii on every network error.

   ```tsx
   // ✅ Correct — only filter when explicitly disabled
   if (frisbiiConfig?.enabled === false) { ... }

   // ❌ Wrong — also hides Frisbii on network errors
   if (!frisbiiConfig?.enabled) { ... }
   ```

3. **`CheckoutForm` was updated and storefront was restarted**

   The `CheckoutForm` is a Server Component. Changes to it require a server restart to take effect. If using `next dev`, the server hot-reloads; for production builds run `npm run build` and restart.

---

### Issue: Custom Title Set in Admin Not Shown in Checkout

**Symptoms**:
- Admin → Settings → Frisbii Pay → Title is updated and saved
- Checkout still shows "Frisbii Pay" (the default)

**Causes & Solutions**:

#### 1. `frisbiiTitle` prop not passed to `Payment` component

Confirm `CheckoutForm` passes `frisbiiTitle={frisbiiConfig?.title}` to `<Payment>`.

#### 2. `Payment` component still uses hardcoded `paymentInfoMap`

Confirm `Payment` creates `effectivePaymentInfoMap` and uses it everywhere:

```tsx
const effectivePaymentInfoMap = frisbiiTitle
  ? {
      ...paymentInfoMap,
      "pp_frisbii-payment_frisbii-payment": {
        ...paymentInfoMap["pp_frisbii-payment_frisbii-payment"],
        title: frisbiiTitle,
      },
    }
  : paymentInfoMap
```

Search for every reference to `paymentInfoMap` inside the `Payment` component and replace with `effectivePaymentInfoMap`.

#### 3. Empty string title falls back to default

`getFrisbiiPublicConfig()` returns `{ enabled: false, title: "" }` when config is null. If the admin saved an empty title, `frisbiiTitle` will be `""` (falsy), and `effectivePaymentInfoMap` will fall back to the default. This is correct behaviour — set a non-empty title in the Admin panel.

---

### Issue: TypeScript Errors

**Error**:
```
Cannot find module '@montaekung/medusa-plugin-frisbii-pay-frontend' or its corresponding type declarations.
```

**Causes & Solutions**:

#### 1. Package Not Installed

```bash
npm install @montaekung/medusa-plugin-frisbii-pay-frontend
```

---

#### 2. Missing Type Definitions

```bash
# Check if types are available
ls node_modules/@montaekung/medusa-plugin-frisbii-pay-frontend/dist/*.d.ts
```

**Solution**: Rebuild package if using npm link:

```bash
cd /path/to/plugin
npm run build
```

---

#### 3. Module Resolution Issue

**Check**: `tsconfig.json`

**Solution**: Ensure proper module resolution:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "resolveJsonModule": true
  }
}
```

---

## Display Mode Issues

### Issue: Embedded Mode Not Rendering

**Symptoms**:
- Empty div appears
- No payment form visible

**Solutions**:

#### 1. Check SDK Loading

```tsx
const { loaded } = useFrisbiiCheckout(sessionId)
console.log("SDK loaded:", loaded)
```

---

#### 2. Check Session ID

```tsx
console.log("Session ID:", sessionId)
```

Should output something like: `reepay_session_abc123xyz`

---

#### 3. Check Container Element

Embedded mode needs space to render:

```css
/* Ensure container has proper dimensions */
.payment-container {
  min-height: 400px;
  width: 100%;
}
```

---

### Issue: Overlay Mode Opens and Closes Immediately

**Symptoms**:
- Modal flashes briefly
- Modal closes without user interaction

**Solutions**:

Check for JavaScript errors:

```tsx
useEffect(() => {
  try {
    const rp = new window.Reepay.ModalCheckout(sessionId)
    // ...
  } catch (error) {
    console.error("Modal error:", error)
  }
}, [sessionId])
```

---

### Issue: Redirect Mode Not Working

**Symptoms**:
- No redirect happens
- Page stays on checkout

**Solutions**:

#### 1. Check Session ID

```tsx
useEffect(() => {
  console.log("Redirecting with session:", sessionId)
  if (!sessionId) {
    console.error("No session ID provided")
    return
  }
  window.location.href = `https://checkout.reepay.com/#/${sessionId}`
}, [sessionId])
```

---

#### 2. Accept/Cancel URLs Not Set

**Check**: Payment session data

```tsx
const session = cart.payment_collection?.payment_sessions?.[0]
console.log("Accept URL:", session.data.accept_url)
console.log("Cancel URL:", session.data.cancel_url)
```

---

## Mobile Issues

### Issue: Payment UI Not Mobile-Friendly

**Solutions**:

#### 1. Use Responsive Styles

```tsx
<div className="w-full max-w-md mx-auto">
  <FrisbiiPaymentButton cart={cart} onOrderPlaced={placeOrder} />
</div>
```

---

#### 2. Consider Display Mode

Embedded mode works best on mobile:

```typescript
// Backend config
options: {
  display_type: "embedded"
}
```

---

## Performance Issues

### Issue: Slow SDK Loading

**Symptoms**:
- Long wait before payment UI appears
- "Loading..." shown for extended time

**Solutions**:

#### 1. Preload SDK

```tsx
// In layout or app component
useEffect(() => {
  const link = document.createElement("link")
  link.rel = "preload"
  link.as = "script"
  link.href = "https://checkout.reepay.com/checkout.js"
  document.head.appendChild(link)
}, [])
```

---

#### 2. Show Better Loading State

```tsx
const { loaded } = useFrisbiiCheckout(sessionId)

if (!loaded) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent" />
      <span className="ml-3">Loading payment system...</span>
    </div>
  )
}
```

---

## Production Issues

### Issue: HTTPS Required Error

**Error**: "Reepay requires HTTPS in production"

**Solution**: Ensure all URLs use HTTPS:

```env
# ❌ Wrong
MEDUSA_BACKEND_URL=http://api.yourdomain.com

# ✅ Correct
MEDUSA_BACKEND_URL=https://api.yourdomain.com
```

---

### Issue: Mixed Content Warnings

**Error**: "Mixed Content: The page at 'https://...' was loaded over HTTPS, but requested an insecure resource 'http://...'"

**Solution**: Check all URLs in your code use HTTPS:

```tsx
// Check payment session URLs
const sessionData = {
  extra: {
    accept_url: `https://yourdomain.com/checkout/complete`,  // ✅ HTTPS
    cancel_url: `https://yourdomain.com/checkout/payment`,   // ✅ HTTPS
  }
}
```

---

### Issue: Accept Page Server-Side Exception (500 Error)

**Symptoms**:
- After 3DS / Reepay payment, browser lands on `/dk/checkout/frisbii/accept?cart_id=…`
- Page shows "Application error: a server-side exception has occurred"
- Digest code shown, or console shows:

```
Error: Cookies can only be modified in a Server Action or Route Handler.
```

**Root Cause**: The accept page is a Next.js **Server Component**. Calling `removeCartId()` (which calls `cookies().delete()`) or `revalidateTag()` directly inside its render function is not allowed — these are only permitted in **Server Actions** and **Route Handlers**.

**Solution**: 
1. Pass `{ skipCookieClear: true }` to `completeOrder()` in the accept page.
2. Move cart clearing to the confirmed page via a `"use server"` Server Action + `"use client"` component.

See INSTALLATION.md Steps 7–8 for the complete code pattern.

---

### Issue: Accept Page Redirects to `checkout?step=review` Instead of Confirmed Page

**Symptoms**:
- Browser returns from Reepay to `checkout?step=review` instead of `/order/…/confirmed`
- 404 shown on the review step

**Cause A — `order_cart` table not queried (backend plugin < v0.1.0-beta.2)**:

The `GET /store/frisbii/order-by-cart` endpoint was querying a non-existent `cart_id` column on the `order` table. Medusa v2 stores cart→order links in the `order_cart` JOIN table. Update the backend plugin to v0.1.0-beta.2 or later.

**Cause B — `completeOrder()` retries too short**:

The default delay strategy (`[2000, 3000, 5000]` ms, 4 attempts) may not be enough if Reepay's REST API is slow. Increase `MAX_ATTEMPTS` or delays in your `completeOrder()` implementation.

**Cause C — `pollOrderByCart` timeout too short**:

The slow path polls up to `10 × 2000 ms = 20 s`. If the Reepay webhook takes longer, increase `maxAttempts` in the `pollOrderByCart` call in your accept page.

---

## Debugging Tips

### Enable Debug Logging

```tsx
// Add to your component
useEffect(() => {
  console.group("Frisbii Payment Debug")
  console.log("Session ID:", sessionId)
  console.log("Cart:", cart)
  console.log("Payment Session:", cart.payment_collection?.payment_sessions)
  console.groupEnd()
}, [cart, sessionId])
```

---

### Check Payment Session Structure

```tsx
const session = cart.payment_collection?.payment_sessions?.find(
  (s) => s.status === "pending"
)

console.log("Session data:", {
  session_id: session?.data?.session_id,
  display_type: session?.data?.display_type,
  provider_id: session?.provider_id,
})
```

---

### Test SDK Availability

```tsx
useEffect(() => {
  if (window.Reepay) {
    console.log("✅ Reepay SDK loaded")
    console.log("Available:", {
      EmbeddedCheckout: typeof window.Reepay.EmbeddedCheckout,
      ModalCheckout: typeof window.Reepay.ModalCheckout,
      Event: window.Reepay.Event,
    })
  } else {
    console.log("❌ Reepay SDK not loaded")
  }
}, [])
```

---

## Getting Help

If you're still experiencing issues:

### 1. Check Documentation

- [Installation Guide](./INSTALLATION.md)
- [API Reference](./API_REFERENCE.md)
- [Configuration Guide](./CONFIGURATION.md)

### 2. Search Existing Issues

[GitHub Issues](https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend/issues)

### 3. Create New Issue

Include:
- Package version
- Next.js version  
- React version
- Browser and OS
- Error messages (full stack trace)
- Steps to reproduce
- Code snippets

### 4. Debug Checklist

Before opening an issue, verify:

- [ ] Backend plugin installed and configured
- [ ] Frontend package installed correctly
- [ ] Environment variables set
- [ ] Payment provider assigned to region
- [ ] `paymentInfoMap` includes Frisbii entry
- [ ] Payment button handler added
- [ ] Payment session initialization added
- [ ] Browser console checked for errors
- [ ] Network tab checked for failed requests
- [ ] HTTPS enabled in production

---

## Quick Fixes

### Reset Everything

```bash
# 1. Clear node_modules
rm -rf node_modules package-lock.json

# 2. Reinstall
npm install

# 3. Rebuild
npm run build

# 4. Restart dev server
npm run dev
```

---

### Force SDK Reload

```tsx
// Remove existing script and reload
useEffect(() => {
  const existing = document.getElementById("reepay-checkout-sdk")
  if (existing) {
    existing.remove()
  }
  // useFrisbiiCheckout will reload it
}, [])
```

---

### Test Minimal Setup

Create a minimal test page:

```tsx
"use client"

import { FrisbiiPaymentButton } from "@montaekung/medusa-plugin-frisbii-pay-frontend"

export default function TestPage() {
  return (
    <div className="p-8">
      <h1>Frisbii Payment Test</h1>
      <FrisbiiPaymentButton
        cart={mockCart} // Use mock cart data
        onOrderPlaced={async () => console.log("Order placed")}
      />
    </div>
  )
}
```
