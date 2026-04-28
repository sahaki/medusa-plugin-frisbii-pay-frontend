---
description: "Test Payment Display settings (Enabled, Title) in Admin Settings and verify results on the Checkout page"
name: "Test Frisbii Pay — Payment Display Settings"
agent: "agent"
tools:
  - mcp_microsoft_pla_browser_navigate
  - mcp_microsoft_pla_browser_snapshot
  - mcp_microsoft_pla_browser_click
  - mcp_microsoft_pla_browser_run_code
  - mcp_microsoft_pla_browser_wait_for
  - mcp_microsoft_pla_browser_take_screenshot
  - mcp_microsoft_pla_browser_fill
  - mcp_microsoft_pla_browser_select_option
---

# Test: Frisbii Pay — Payment Display Settings

Verifies that the **Enabled** and **Title** settings in Admin Settings correctly affect the Checkout page.

**Prerequisites**:
- Medusa Backend running at `http://localhost:9000`
- Medusa Storefront running at `http://localhost:8000`
- Frisbii Pay plugin configured and assigned to the Denmark region

---

## Key Principles (Read Before Starting)

**Use `mcp_microsoft_pla_browser_run_code` as the primary tool** — it runs Playwright code directly, which is faster than snapshot + click step by step; multiple actions can be combined in a single call.

**Do not call snapshot unnecessarily** — only snapshot when debugging or when a ref is needed.

**Form field order** for this storefront:
- `input[placeholder=" "]` nth(0) = first_name
- `input[placeholder=" "]` nth(1) = last_name  
- `input[placeholder=" "]` nth(2) = address_1
- `input[placeholder=" "]` nth(4) = postal_code
- `input[placeholder=" "]` nth(5) = city
- `select[name="shipping_address.country_code"]` = country
- `input[placeholder=" "]` nth(7) = email

---

## AC1 — Enabled = false → Frisbii Pay should not appear in Checkout

### AC1-Step 1 — Log in to Admin

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app')
  await page.waitForTimeout(1500)
  await page.locator('input[name="email"], input[type="email"]').fill('boyd@radarsofthouse.dk')
  await page.locator('input[name="password"], input[type="password"]').fill('Test#1234')
  await page.getByRole('button', { name: /Sign in|Login/i }).click()
  await page.waitForURL('**/app/**', { timeout: 10000 })
  return page.url()
}
```

> Verify that the URL redirects to `/app/` or `/app/dashboard` — if not → snapshot and report

---

### AC1-Step 2 — Set Enabled = false

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  // Verify we are on the correct settings page
  const heading = await page.locator('h1, h2').filter({ hasText: /frisbii/i }).first().textContent().catch(() => '')
  if (!heading) return 'ERROR: Frisbii settings page not found'

  // Find the Enabled switch
  // The switch is typically adjacent to the "Enabled" label
  const enabledLabel = page.locator('label, span').filter({ hasText: /^Enabled$/i }).first()
  const enabledLabelVisible = await enabledLabel.isVisible().catch(() => false)
  if (!enabledLabelVisible) return 'ERROR: Enabled label not found'

  // Check current switch state — if checked, click to disable
  const switchBtn = page.locator('button[role="switch"]').first()
  const isChecked = await switchBtn.getAttribute('data-state').catch(() => 'unknown')
  if (isChecked === 'checked') {
    await switchBtn.click()
    await page.waitForTimeout(500)
  }

  // Verify the switch is now unchecked
  const newState = await switchBtn.getAttribute('data-state').catch(() => 'unknown')
  if (newState !== 'unchecked') return `ERROR: Switch state is still "${newState}", expected "unchecked"`

  // Save
  await page.getByRole('button', { name: /Save/i }).click()
  await page.waitForTimeout(2000)

  // Verify success toast
  const toast = await page.locator('[data-sonner-toast], [role="status"]').first().textContent().catch(() => '')
  return JSON.stringify({ switchNewState: newState, toast })
}
```

> Verify that the toast shows success and the switch is `unchecked`

---

### AC1-Step 3 — Add a product to cart

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:8000/dk/products/shorts')
  await page.waitForTimeout(1500)
  const sizeButtons = page.locator('button:not([disabled])').filter({ hasText: /^[LMSXL]+$/ })
  const count = await sizeButtons.count()
  if (count === 0) return 'ERROR: no size available'
  await sizeButtons.first().click()
  await page.waitForTimeout(500)
  await page.getByTestId('add-product-button').click()
  await page.waitForTimeout(2000)
  return 'added to cart'
}
```

---

### AC1-Step 4 — Fill in the Address

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

### AC1-Step 5 — Select Shipping

```js
// run_code:
async (page) => {
  await page.getByRole('radio', { name: /Standard Shipping/ }).click()
  await page.waitForTimeout(500)
  await page.getByTestId('submit-delivery-option-button').click()
  await page.waitForURL('**/checkout?step=payment', { timeout: 10000 })
  return page.url()
}
```

---

### AC1-Step 6 — Verify Frisbii Pay is not shown ✅

```js
// run_code:
async (page) => {
  await page.waitForTimeout(1000)
  const bodyText = await page.locator('body').textContent()

  // Verify Frisbii Pay is not in the list
  const frisbiiRadio = page.getByRole('radio', { name: /frisbii/i })
  const frisbiiCount = await frisbiiRadio.count()

  const hasFrisbiiText = (bodyText || '').toLowerCase().includes('frisbii')

  return JSON.stringify({
    frisbiiRadioCount: frisbiiCount,
    hasFrisbiiText,
    result: frisbiiCount === 0 ? 'PASS: Frisbii Pay not visible (Enabled=false)' : 'FAIL: Frisbii Pay still visible'
  })
}
```

> **Expected**: `frisbiiRadioCount === 0` and `result = "PASS"`  
> Take a screenshot to confirm the Payment page state

---

## AC2 — Enabled = true → Frisbii Pay should appear again

### AC2-Step 1 — Re-enable Enabled = true

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  const switchBtn = page.locator('button[role="switch"]').first()
  const isChecked = await switchBtn.getAttribute('data-state').catch(() => 'unknown')
  if (isChecked === 'unchecked') {
    await switchBtn.click()
    await page.waitForTimeout(500)
  }

  const newState = await switchBtn.getAttribute('data-state').catch(() => 'unknown')
  if (newState !== 'checked') return `ERROR: Switch state is still "${newState}", expected "checked"`

  await page.getByRole('button', { name: /Save/i }).click()
  await page.waitForTimeout(2000)

  const toast = await page.locator('[data-sonner-toast], [role="status"]').first().textContent().catch(() => '')
  return JSON.stringify({ switchNewState: newState, toast })
}
```

> Verify that the switch is `checked` and the toast shows success

---

### AC2-Step 2 — Refresh the Checkout Payment page and verify Frisbii Pay ✅

```js
// run_code:
async (page) => {
  // Reload checkout payment step
  await page.goto('http://localhost:8000/dk/checkout?step=payment')
  await page.waitForTimeout(2000)

  const frisbiiRadio = page.getByRole('radio', { name: /frisbii/i })
  const frisbiiCount = await frisbiiRadio.count()

  // Check label text
  const frisbiiLabel = frisbiiCount > 0
    ? await frisbiiRadio.first().locator('..').textContent().catch(() => '')
    : ''

  return JSON.stringify({
    frisbiiRadioCount: frisbiiCount,
    frisbiiLabel,
    result: frisbiiCount > 0 ? 'PASS: Frisbii Pay visible (Enabled=true)' : 'FAIL: Frisbii Pay not visible'
  })
}
```

> **Expected**: `frisbiiRadioCount >= 1` and `result = "PASS"`  
> Take a screenshot to confirm

---

## AC3 — Title = "Frisbii Payment" → Updated title shown in Checkout

### AC3-Step 1 — Set Title = "Frisbii Payment"

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  // Find the Title input (next to the "Title" label)
  const titleLabel = page.locator('label, span').filter({ hasText: /^Title$/i }).first()
  const titleLabelVisible = await titleLabel.isVisible().catch(() => false)
  if (!titleLabelVisible) return 'ERROR: Title label not found'

  // Input adjacent to the "Title" label
  const titleInput = page.locator('input[type="text"]').filter({ hasNot: page.locator('[type="password"]') }).nth(0)

  // Clear the existing value and fill in the new one
  await titleInput.clear()
  await titleInput.fill('Frisbii Payment')
  await page.waitForTimeout(500)

  const currentValue = await titleInput.inputValue()
  if (currentValue !== 'Frisbii Payment') return `ERROR: Title input value is "${currentValue}", expected "Frisbii Payment"`

  await page.getByRole('button', { name: /Save/i }).click()
  await page.waitForTimeout(2000)

  const toast = await page.locator('[data-sonner-toast], [role="status"]').first().textContent().catch(() => '')
  return JSON.stringify({ titleValue: currentValue, toast })
}
```

> Verify that the toast shows success

---

### AC3-Step 2 — Refresh the Checkout Payment page and verify the Title ✅

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:8000/dk/checkout?step=payment')
  await page.waitForTimeout(2000)

  // Look for "Frisbii Payment" in the payment methods list
  const paymentMethodLabel = page.getByRole('radio', { name: /Frisbii Payment/i })
  const exactMatchCount = await paymentMethodLabel.count()

  // Verify the old name "Frisbii Pay" is no longer present
  const oldLabel = page.getByRole('radio', { name: /^Frisbii Pay$/i })
  const oldLabelCount = await oldLabel.count()

  const bodyText = await page.locator('body').textContent()
  const hasNewTitle = (bodyText || '').includes('Frisbii Payment')
  const hasOldTitle = (bodyText || '').includes('Frisbii Pay')

  return JSON.stringify({
    newTitleCount: exactMatchCount,
    oldTitleCount: oldLabelCount,
    hasNewTitle,
    hasOldTitle,
    result: hasNewTitle ? 'PASS: Title updated to "Frisbii Payment"' : 'FAIL: New title not visible'
  })
}
```

> **Expected**: `hasNewTitle = true` and `result = "PASS"`  
> Take a screenshot to confirm

---

## Reporting Results

### ✅ All ACs passed

```
PASS — Frisbii Pay Payment Display Settings

AC1 (Enabled=false): Frisbii Pay hidden from checkout ✅
AC2 (Enabled=true):  Frisbii Pay visible in checkout ✅
AC3 (Title update):  Title shows "Frisbii Payment" ✅
```

### ❌ One or more ACs failed

```
FAIL — Frisbii Pay Payment Display Settings

Failed AC: AC<N>
Failed at: Step <X>
Error: <error message>
Current URL: <url>
Expected: <expected behaviour>
Actual: <actual behaviour>
```

Include a screenshot of the page where the error occurred

---

## Reference

- **Storefront**: `http://localhost:8000`
- **Backend Admin**: `http://localhost:9000/app`
- **Admin User**: `boyd@radarsofthouse.dk` / `Test#1234`
- **Frisbii Settings URL**: `http://localhost:9000/app/settings/frisbii`
- **Provider ID**: `pp_frisbii-payment_frisbii-payment`
