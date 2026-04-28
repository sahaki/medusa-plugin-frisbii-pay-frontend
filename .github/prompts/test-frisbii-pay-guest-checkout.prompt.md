---
description: "Test the full Guest Checkout flow with Frisbii Pay (Reepay) from product selection through to the Thank You page"
name: "Test Frisbii Pay — Guest Checkout"
argument-hint: "Specify the display mode to test: overlay | embedded | redirect (default: overlay)"
agent: "agent"
tools:
  - mcp_microsoft_pla_browser_navigate
  - mcp_microsoft_pla_browser_snapshot
  - mcp_microsoft_pla_browser_click
  - mcp_microsoft_pla_browser_run_code
  - mcp_microsoft_pla_browser_wait_for
  - mcp_microsoft_pla_browser_take_screenshot
---

# Test: Frisbii Pay — Guest Checkout (End-to-End)

Tests the Guest checkout flow with Frisbii Pay (Reepay) covering every step.

**Prerequisites**:
- Medusa Backend running at `http://localhost:9000`
- Medusa Storefront running at `http://localhost:8000`
- Frisbii Pay plugin configured and assigned to the Denmark region

---

## Key Principles (Read Before Starting)

**Use `mcp_microsoft_pla_browser_run_code` as the primary tool** — this tool runs Playwright code directly, making it faster than snapshot + click step by step; multiple actions can be combined in a single call.

**Do not call snapshot unnecessarily** — only snapshot when debugging or when a ref is needed.

**Form field order** for this storefront (verified from actual testing):
- `input[placeholder=" "]` nth(0) = first_name
- `input[placeholder=" "]` nth(1) = last_name  
- `input[placeholder=" "]` nth(2) = address_1
- `input[placeholder=" "]` nth(3) = company (can be skipped)
- `input[placeholder=" "]` nth(4) = postal_code
- `input[placeholder=" "]` nth(5) = city
- `select[name="shipping_address.country_code"]` = country
- `input[placeholder=" "]` nth(7) = email

**Reepay card form fields** (verified):
- `input.form-control.rp-content-card-input` nth(0) = card number
- `input.form-control.rp-content-card-input` nth(1) = expiry (MM/YY format)
- `input.form-control.rp-content-card-input` nth(2) = CVV

**Available testids**:
- `add-product-button` = Add to Cart
- `submit-address-button` = Continue to delivery
- `submit-delivery-option-button` = Continue to payment
- `submit-payment-button` = Continue to review
- `submit-order-button` = Place order

---

## Step 1 — Add product to cart (1 call)

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:8000/dk/products/shorts')
  await page.waitForTimeout(1500)
  // Select Size L (or the first enabled size)
  const sizeButtons = page.locator('button:not([disabled])').filter({ hasText: /^[LMSXL]+$/ })
  const count = await sizeButtons.count()
  if (count === 0) return 'ERROR: no size available'
  await sizeButtons.first().click()
  await page.waitForTimeout(500)
  await page.getByTestId('add-product-button').click()
  await page.waitForTimeout(2000)
  // Check cart counter
  const cartText = await page.locator('button[data-testid], a[href*="/cart"]').first().textContent().catch(() => '')
  return `added to cart. cart text: ${cartText}`
}
```

> If return contains "ERROR" → screenshot and report

---

## Step 2 — Go to Checkout and fill in Address details (1 call)

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:8000/dk/checkout?step=address')
  await page.waitForTimeout(1500)
  const inputs = page.locator('input[placeholder=" "]')
  await inputs.nth(0).fill('Test')
  await inputs.nth(1).fill('Man')
  await inputs.nth(2).fill('Test Street 1')
  await inputs.nth(4).fill('2300')
  await inputs.nth(5).fill('Copenhagen')
  await page.locator('select[name="shipping_address.country_code"]').selectOption({ label: 'Denmark' })
  await inputs.nth(7).fill('test@example.com')
  await page.getByTestId('submit-address-button').click()
  await page.waitForURL('**/checkout?step=delivery', { timeout: 10000 })
  return page.url()
}
```

---

## Step 3 — Select Shipping and Payment (2 calls)

```js
// run_code (delivery):
async (page) => {
  await page.getByRole('radio', { name: /Standard Shipping/ }).click()
  await page.waitForTimeout(500)
  await page.getByTestId('submit-delivery-option-button').click()
  await page.waitForURL('**/checkout?step=payment', { timeout: 10000 })
  return page.url()
}
```

```js
// run_code (select Frisbii Pay):
async (page) => {
  await page.getByRole('radio', { name: 'Frisbii Pay' }).click()
  await page.waitForTimeout(500)
  const hasFrisbii = await page.getByRole('radio', { name: 'Frisbii Pay' }).isChecked()
  if (!hasFrisbii) return 'ERROR: Frisbii Pay not found'
  await page.getByTestId('submit-payment-button').click()
  await page.waitForURL('**/checkout?step=review', { timeout: 10000 })
  return page.url()
}
```

---

## Step 4 — Place Order → Reepay → 3DS → Wait for result

### 4.1 Place order

```js
// run_code:
async (page) => {
  await page.getByTestId('submit-order-button').click()
  // Wait for browser to redirect to Reepay (may take 5-10 seconds)
  try {
    await page.waitForURL('**/checkout.reepay.com/**', { timeout: 15000 })
  } catch {
    // May still be on the same page, check URL
  }
  return page.url()
}
```

> Verify that the URL starts with `https://checkout.reepay.com/#/cs_` — if not → snapshot and report

### 4.2 Fill in card details and pay

```js
// run_code:
async (page) => {
  await page.waitForTimeout(2000)
  const formInputs = page.locator('input.form-control.rp-content-card-input')
  await formInputs.nth(0).fill('4111111111111111')
  await formInputs.nth(1).fill('12/97')
  await formInputs.nth(2).fill('123')
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /Pay EUR/ }).click()
  // Wait for 3DS iframe to appear
  await page.waitForTimeout(3000)
  return 'payment submitted, waiting for 3DS'
}
```

### 4.3 Pass 3DS Challenge

```js
// run_code:
async (page) => {
  // Pass challenge in the 3DS iframe
  const frame = page.frameLocator('iframe[name="threedV2ChallengeFrame"]')
  await frame.getByRole('button', { name: 'Pass challenge' }).click({ timeout: 10000 })
  return '3DS passed'
}
```

### 4.4 Wait for result (critical)

**Wait 20 seconds** — the backend has retry logic that can take up to ~11 seconds in the worst case. Then check the URL:

```js
// run_code:
async (page) => {
  await page.waitForTimeout(20000)
  return page.url()
}
```

> - URL contains `/order/order_` → **PASS** → go to Step 5
> - URL is still `checkout.reepay.com` or `checkout?step=review` → FAIL → snapshot + report

---

## Step 5 — Verify the Thank You Page

```js
// run_code:
async (page) => {
  const url = page.url()
  const isConfirmed = url.includes('/order/') && url.includes('/confirmed')
  const pageText = await page.locator('body').textContent()
  const hasOrderId = /order_[A-Za-z0-9]+/.test(pageText || '')
  return JSON.stringify({ url, isConfirmed, hasOrderId })
}
```

Then **verify the cart is empty**:

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:8000/dk/cart')
  await page.waitForTimeout(1500)
  const cartText = await page.locator('body').textContent()
  const isEmpty = cartText?.includes('Your shopping bag is empty') || cartText?.includes('cart is empty')
  return JSON.stringify({ isEmpty, cartText: cartText?.substring(0, 200) })
}
```

---

## Reporting Results

### ✅ Success

```
PASS — Frisbii Pay Guest Checkout

Order ID: order_XXXX
Thank You URL: http://localhost:8000/dk/order/order_XXXX/confirmed
Cart cleared: ✅
Console errors: none
```

### ❌ Failure

```
FAIL — Frisbii Pay Guest Checkout

Failed at: Step X
Error: <error message>
Current URL: <url>
```

Include a screenshot of the page where the error occurred

---

## Reference

- **Storefront**: `http://localhost:8000`
- **Backend Admin**: `http://localhost:9000/app`
- **Reepay Test Card**: `4111 1111 1111 1111` / `12/97` / `123` (Visa)
- **Provider ID**: `pp_frisbii-payment_frisbii-payment`
- **Accept URL pattern**: `/{countryCode}/checkout/frisbii/accept?cart_id={cart_id}`
- **Accept page**: will call `completeOrder()` which has 4 retries (1.5s/2.5s/4s delays)
- **authorizePayment**: has 5 retries (1s/2s/3s/5s delays) — maximum total time ~11 seconds
