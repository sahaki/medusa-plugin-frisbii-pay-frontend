---
description: "Test the Payment Display Locale setting in Admin Settings — covers Backend (saving, persistence, API validator) and Frontend (UI text based on locale)"
name: "Test Frisbii Pay — Payment Display Locale"
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

# Test: Frisbii Pay — Payment Display Locale

Tests the **Payment Display Locale** feature covering:
- **Backend**: Dropdown shows enabled/disabled locales correctly, saves and restores values, API validator rejects unsupported locales, Public config endpoint returns the saved locale
- **Frontend**: UI text of FrisbiiPaymentButton changes according to the configured locale

**Supported locales**: `en_GB` (English) and `da_DK` (Danish)  
**Disabled locales (Coming soon)**: sv_SE, nb_NO, de_DE, fr_FR, es_ES, nl_NL, pl_PL

**Prerequisites**:
- Medusa Backend running at `http://localhost:9000`
- Medusa Storefront running at `http://localhost:8000`
- Frisbii Pay plugin configured and assigned to the Denmark region

---

## Key Principles (Read Before Starting)

**Use `mcp_microsoft_pla_browser_run_code` as the primary tool** — combine multiple actions in a single call for speed.

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

## AC1 — Dropdown shows enabled/disabled correctly

Verify that:
- `en_GB` and `da_DK` appear in the list and can be selected (no `disabled` attribute)
- Other locales (sv_SE, nb_NO, de_DE, fr_FR, es_ES, nl_NL, pl_PL) appear but are `disabled` and show the text "Coming soon" / "Kommer snart"

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

> Verify that the URL redirects to `/app/` — if not → snapshot and report

---

### AC1-Step 2 — Open the Locale Dropdown and scan items

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  // Find the Locale select trigger (the third trigger — after Display Type)
  // Locale select is next to Display Type select on the Payment Display page
  const triggers = page.locator('button[role="combobox"]')
  const triggerCount = await triggers.count()
  if (triggerCount < 2) return `ERROR: Need at least 2 select triggers, found ${triggerCount}`

  // Locale select is the second trigger (index 1) in the Payment Display section
  // (Display Type is index 0)
  // Try using the label to locate it
  const localeLabel = page.locator('label').filter({ hasText: /^(Sprog|Locale)$/i })
  const localeLabelVisible = await localeLabel.isVisible().catch(() => false)
  if (!localeLabelVisible) return 'ERROR: Locale label not found'

  // Find the select trigger near the "Locale" / "Sprog" label
  const localeSection = localeLabel.locator('..').locator('..')
  const localeTrigger = localeSection.locator('button[role="combobox"]').first()
  const localeTriggerVisible = await localeTrigger.isVisible().catch(() => false)
  if (!localeTriggerVisible) {
    // Fallback: use the second trigger (0-indexed) from all triggers
    await triggers.nth(1).click()
  } else {
    await localeTrigger.click()
  }
  await page.waitForTimeout(500)

  // Read items in the dropdown
  const items = page.locator('[role="option"]')
  const count = await items.count()
  if (count === 0) return 'ERROR: No dropdown items found — dropdown may not have opened'

  const result: Record<string, any>[] = []
  for (let i = 0; i < count; i++) {
    const item = items.nth(i)
    const text = (await item.textContent() || '').trim()
    const isDisabled = await item.getAttribute('data-disabled') || await item.getAttribute('aria-disabled') || 'false'
    const hasComingSoon = text.toLowerCase().includes('coming soon') || text.toLowerCase().includes('kommer snart')
    result.push({ text, isDisabled, hasComingSoon })
  }

  // Close dropdown
  await page.keyboard.press('Escape')

  return JSON.stringify(result, null, 2)
}
```

> **Expected**:
> - Items with `en_GB` text (`English` / `Engelsk`) → `isDisabled` is `false` or null
> - Items with `da_DK` text (`Danish` / `Dansk`) → `isDisabled` is `false` or null
> - All other items (Swedish, Norwegian, German, French, Spanish, Dutch, Polish) → `isDisabled` ≠ `false` and `hasComingSoon = true`

Take a screenshot after the dropdown opens to document the UI state

---

## AC2 — Save Locale = en_GB, then Reload retains the value

### AC2-Step 1 — Set Locale to en_GB and Save

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  // Find the Locale trigger
  const localeLabel = page.locator('label').filter({ hasText: /^(Sprog|Locale)$/i })
  const localeSection = localeLabel.locator('..').locator('..')
  const localeTrigger = localeSection.locator('button[role="combobox"]').first()

  // Open dropdown
  await localeTrigger.click()
  await page.waitForTimeout(500)

  // Click en_GB option (English / Engelsk)
  const enOption = page.locator('[role="option"]').filter({ hasText: /English|Engelsk/ }).first()
  const enVisible = await enOption.isVisible().catch(() => false)
  if (!enVisible) return 'ERROR: English (en_GB) option not visible in dropdown'
  await enOption.click()
  await page.waitForTimeout(500)

  // Verify selected value
  const triggerText = await localeTrigger.textContent()

  // Save
  await page.getByRole('button', { name: /Save Configuration|Gem konfiguration/i }).click()
  await page.waitForTimeout(2000)

  const toast = await page.locator('[data-sonner-toast], [role="status"]').first().textContent().catch(() => '')
  return JSON.stringify({ selectedValue: triggerText?.trim(), toast: toast?.trim() })
}
```

> Verify that the toast shows "Configuration saved" / "Konfiguration gemt"

---

### AC2-Step 2 — Reload the Settings page and verify the saved Locale ✅

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  const localeLabel = page.locator('label').filter({ hasText: /^(Sprog|Locale)$/i })
  const localeSection = localeLabel.locator('..').locator('..')
  const localeTrigger = localeSection.locator('button[role="combobox"]').first()
  const triggerText = (await localeTrigger.textContent() || '').trim()

  const isEnglish = /English|Engelsk/i.test(triggerText)

  return JSON.stringify({
    localeShown: triggerText,
    result: isEnglish
      ? 'PASS: en_GB persisted after reload'
      : `FAIL: Expected English/Engelsk but got "${triggerText}"`
  })
}
```

> **Expected**: `result = "PASS: en_GB persisted after reload"`

---

## AC3 — Save Locale = da_DK, then Reload retains the value

### AC3-Step 1 — Set Locale to da_DK and Save

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  const localeLabel = page.locator('label').filter({ hasText: /^(Sprog|Locale)$/i })
  const localeSection = localeLabel.locator('..').locator('..')
  const localeTrigger = localeSection.locator('button[role="combobox"]').first()

  await localeTrigger.click()
  await page.waitForTimeout(500)

  // Click da_DK option (Danish / Dansk)
  const daOption = page.locator('[role="option"]').filter({ hasText: /Danish|Dansk/ }).first()
  const daVisible = await daOption.isVisible().catch(() => false)
  if (!daVisible) return 'ERROR: Danish (da_DK) option not visible in dropdown'

  // Verify this option is not disabled
  const daDisabled = await daOption.getAttribute('data-disabled') || await daOption.getAttribute('aria-disabled')
  if (daDisabled && daDisabled !== 'false') return `ERROR: da_DK option is disabled (data-disabled="${daDisabled}")`

  await daOption.click()
  await page.waitForTimeout(500)

  const triggerText = await localeTrigger.textContent()

  await page.getByRole('button', { name: /Save Configuration|Gem konfiguration/i }).click()
  await page.waitForTimeout(2000)

  const toast = await page.locator('[data-sonner-toast], [role="status"]').first().textContent().catch(() => '')
  return JSON.stringify({ selectedValue: triggerText?.trim(), toast: toast?.trim() })
}
```

---

### AC3-Step 2 — Reload the Settings page and verify the saved Locale ✅

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  const localeLabel = page.locator('label').filter({ hasText: /^(Sprog|Locale)$/i })
  const localeSection = localeLabel.locator('..').locator('..')
  const localeTrigger = localeSection.locator('button[role="combobox"]').first()
  const triggerText = (await localeTrigger.textContent() || '').trim()

  const isDanish = /Danish|Dansk/i.test(triggerText)

  return JSON.stringify({
    localeShown: triggerText,
    result: isDanish
      ? 'PASS: da_DK persisted after reload'
      : `FAIL: Expected Danish/Dansk but got "${triggerText}"`
  })
}
```

> **Expected**: `result = "PASS: da_DK persisted after reload"`

---

## AC4 — Public Config API returns the locale matching what was saved

Verify that the `GET /store/frisbii/config` endpoint returns a `locale` that matches the Admin Settings.

### AC4-Step 1 — Set locale to en_GB then check the API

```js
// run_code:
async (page) => {
  // Set en_GB first (must already be in admin session)
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  const localeLabel = page.locator('label').filter({ hasText: /^(Sprog|Locale)$/i })
  const localeSection = localeLabel.locator('..').locator('..')
  const localeTrigger = localeSection.locator('button[role="combobox"]').first()

  await localeTrigger.click()
  await page.waitForTimeout(500)
  const enOption = page.locator('[role="option"]').filter({ hasText: /English|Engelsk/ }).first()
  await enOption.click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Save Configuration|Gem konfiguration/i }).click()
  await page.waitForTimeout(2000)

  // Call the public config API
  const resp = await page.evaluate(async () => {
    const r = await fetch('http://localhost:9000/store/frisbii/config')
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return r.json()
  })

  const locale = resp?.config?.locale
  return JSON.stringify({
    apiResponse: resp,
    locale,
    result: locale === 'en_GB'
      ? 'PASS: API returns locale=en_GB'
      : `FAIL: Expected locale="en_GB", got "${locale}"`
  })
}
```

> **Expected**: `locale === "en_GB"` and `result = "PASS"`

---

### AC4-Step 2 — Change locale to da_DK then check the API ✅

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  const localeLabel = page.locator('label').filter({ hasText: /^(Sprog|Locale)$/i })
  const localeSection = localeLabel.locator('..').locator('..')
  const localeTrigger = localeSection.locator('button[role="combobox"]').first()

  await localeTrigger.click()
  await page.waitForTimeout(500)
  const daOption = page.locator('[role="option"]').filter({ hasText: /Danish|Dansk/ }).first()
  await daOption.click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Save Configuration|Gem konfiguration/i }).click()
  await page.waitForTimeout(2000)

  const resp = await page.evaluate(async () => {
    const r = await fetch('http://localhost:9000/store/frisbii/config')
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return r.json()
  })

  const locale = resp?.config?.locale
  return JSON.stringify({
    locale,
    result: locale === 'da_DK'
      ? 'PASS: API returns locale=da_DK'
      : `FAIL: Expected locale="da_DK", got "${locale}"`
  })
}
```

> **Expected**: `locale === "da_DK"` and `result = "PASS"`

---

## AC5 — API Validator rejects unsupported locales

Verify that sending `locale: "sv_SE"` (a disabled locale) directly via the API is rejected with HTTP 4xx.

### AC5-Step 1 — POST locale=sv_SE directly via API ✅

```js
// run_code:
async (page) => {
  // Send POST from admin context (with session cookie)
  const resp = await page.evaluate(async () => {
    const r = await fetch('http://localhost:9000/admin/frisbii/config', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'sv_SE' })
    })
    const body = await r.json().catch(() => ({}))
    return { status: r.status, ok: r.ok, body }
  })

  const isRejected = !resp.ok && resp.status >= 400
  return JSON.stringify({
    httpStatus: resp.status,
    responseBody: resp.body,
    result: isRejected
      ? `PASS: API rejected locale="sv_SE" with HTTP ${resp.status}`
      : `FAIL: API accepted an invalid locale (HTTP ${resp.status})`
  })
}
```

> **Expected**: HTTP 400 (bad request) and `result = "PASS"`  
> Body typically contains an error message from Zod validation

---

### AC5-Step 2 — POST locale=pl_PL to confirm rejection with another disabled locale

```js
// run_code:
async (page) => {
  const resp = await page.evaluate(async () => {
    const r = await fetch('http://localhost:9000/admin/frisbii/config', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'pl_PL' })
    })
    const body = await r.json().catch(() => ({}))
    return { status: r.status, ok: r.ok, body }
  })

  const isRejected = !resp.ok && resp.status >= 400
  return JSON.stringify({
    httpStatus: resp.status,
    result: isRejected
      ? `PASS: API rejected locale="pl_PL" with HTTP ${resp.status}`
      : `FAIL: API accepted an invalid locale (HTTP ${resp.status})`
  })
}
```

> **Expected**: HTTP 4xx and `result = "PASS"`

---

## AC6 — Frontend Payment Button shows English text when locale = en_GB

### AC6-Step 1 — Set locale = en_GB in Admin

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  const localeLabel = page.locator('label').filter({ hasText: /^(Sprog|Locale)$/i })
  const localeSection = localeLabel.locator('..').locator('..')
  const localeTrigger = localeSection.locator('button[role="combobox"]').first()

  await localeTrigger.click()
  await page.waitForTimeout(500)
  const enOption = page.locator('[role="option"]').filter({ hasText: /English|Engelsk/ }).first()
  await enOption.click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Save Configuration|Gem konfiguration/i }).click()
  await page.waitForTimeout(2000)

  const toast = await page.locator('[data-sonner-toast], [role="status"]').first().textContent().catch(() => '')
  return `Saved. Toast: ${toast?.trim()}`
}
```

---

### AC6-Step 2 — Add a product to cart

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

### AC6-Step 3 — Fill in Address and Delivery

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
  await page.getByRole('radio', { name: /Standard Shipping/ }).click()
  await page.waitForTimeout(500)
  await page.getByTestId('submit-delivery-option-button').click()
  await page.waitForURL('**/checkout?step=payment', { timeout: 10000 })
  return page.url()
}
```

---

### AC6-Step 4 — Select Frisbii Pay and verify Button Text ✅

```js
// run_code:
async (page) => {
  await page.waitForTimeout(1500)

  // Find Frisbii Pay radio
  const frisbiiRadio = page.getByRole('radio', { name: /frisbii/i })
  const frisbiiCount = await frisbiiRadio.count()
  if (frisbiiCount === 0) return 'ERROR: Frisbii Pay not found in payment options — check that Enabled=true in Admin'
  await frisbiiRadio.first().click()
  await page.waitForTimeout(500)

  // Find the Payment Button (data-testid="submit-payment-button" or button with "Place order" text)
  const submitBtn = page.getByTestId('submit-payment-button')
  const submitBtnExists = await submitBtn.count() > 0

  let buttonText = ''
  if (submitBtnExists) {
    buttonText = (await submitBtn.textContent() || '').trim()
  } else {
    // Frisbii Payment Button may render separately
    const frisbiiBtn = page.locator('button').filter({ hasText: /Place order|Afgiv ordre/i })
    buttonText = (await frisbiiBtn.first().textContent().catch(() => '')) || ''
  }

  const isEnglish = buttonText === 'Place order'

  return JSON.stringify({
    buttonText,
    result: isEnglish
      ? 'PASS: Button shows "Place order" (en_GB)'
      : `FAIL: Expected "Place order", got "${buttonText}"`
  })
}
```

> **Expected**: `buttonText = "Place order"` and `result = "PASS"`  
> Take a screenshot to confirm the button text

---

## AC7 — Frontend Payment Button shows Danish text when locale = da_DK

### AC7-Step 1 — Change locale = da_DK in Admin and Save

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  const localeLabel = page.locator('label').filter({ hasText: /^(Sprog|Locale)$/i })
  const localeSection = localeLabel.locator('..').locator('..')
  const localeTrigger = localeSection.locator('button[role="combobox"]').first()

  await localeTrigger.click()
  await page.waitForTimeout(500)
  const daOption = page.locator('[role="option"]').filter({ hasText: /Danish|Dansk/ }).first()
  await daOption.click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Save Configuration|Gem konfiguration/i }).click()
  await page.waitForTimeout(2000)

  const toast = await page.locator('[data-sonner-toast], [role="status"]').first().textContent().catch(() => '')
  return `Saved. Toast: ${toast?.trim()}`
}
```

---

### AC7-Step 2 — Create a new cart and navigate to the Payment step

> **Note**: The cart created during AC6 is stale; a new cart must be created so that session data carries the updated locale (da_DK).

```js
// run_code:
async (page) => {
  // Clear old cart: navigate to storefront home and create a new cart
  await page.goto('http://localhost:8000/dk')
  await page.waitForTimeout(1000)

  await page.goto('http://localhost:8000/dk/products/shorts')
  await page.waitForTimeout(1500)
  const sizeButtons = page.locator('button:not([disabled])').filter({ hasText: /^[LMSXL]+$/ })
  const count = await sizeButtons.count()
  if (count === 0) return 'ERROR: no size available'
  await sizeButtons.first().click()
  await page.waitForTimeout(500)
  await page.getByTestId('add-product-button').click()
  await page.waitForTimeout(2000)

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
  await page.getByRole('radio', { name: /Standard Shipping/ }).click()
  await page.waitForTimeout(500)
  await page.getByTestId('submit-delivery-option-button').click()
  await page.waitForURL('**/checkout?step=payment', { timeout: 10000 })
  return page.url()
}
```

---

### AC7-Step 3 — Select Frisbii Pay and verify Button Text ✅

```js
// run_code:
async (page) => {
  await page.waitForTimeout(1500)

  const frisbiiRadio = page.getByRole('radio', { name: /frisbii/i })
  const frisbiiCount = await frisbiiRadio.count()
  if (frisbiiCount === 0) return 'ERROR: Frisbii Pay not found in payment options'
  await frisbiiRadio.first().click()
  await page.waitForTimeout(500)

  // Check Payment Button Text
  const submitBtn = page.getByTestId('submit-payment-button')
  const submitBtnExists = await submitBtn.count() > 0

  let buttonText = ''
  if (submitBtnExists) {
    buttonText = (await submitBtn.textContent() || '').trim()
  } else {
    const frisbiiBtn = page.locator('button').filter({ hasText: /Place order|Afgiv ordre/i })
    buttonText = (await frisbiiBtn.first().textContent().catch(() => '')) || ''
  }

  // "Afgiv ordre" is Danish for "Place order"
  const isDanish = buttonText === 'Afgiv ordre'

  // Confirm session data locale
  const sessionLocale = await page.evaluate(() => {
    // Try to retrieve from React state or data attributes (if present)
    const btn = document.querySelector('[data-locale]')
    return btn?.getAttribute('data-locale') || 'not found in DOM'
  })

  return JSON.stringify({
    buttonText,
    sessionLocale,
    result: isDanish
      ? 'PASS: Button shows "Afgiv ordre" (da_DK)'
      : `FAIL: Expected "Afgiv ordre", got "${buttonText}"`
  })
}
```

> **Expected**: `buttonText = "Afgiv ordre"` and `result = "PASS"`  
> Take a screenshot to confirm

---

## AC8 — Locale is passed in Session Data (API Integrity Check)

Verify that `session.data.locale` in the cart payment session matches what was configured in Admin.

### AC8-Step 1 — Retrieve Payment Session Data and verify the locale field ✅

> Continue from AC7 (still on the checkout payment step with locale = da_DK)

```js
// run_code:
async (page) => {
  // Retrieve cart ID from cookie or URL
  await page.waitForTimeout(1000)

  const sessionData = await page.evaluate(async () => {
    // Try to retrieve cart data from Next.js fetch or localStorage
    // The most reliable method is to intercept the network or retrieve from DOM
    // Try querying the cart API if the cart ID is known
    const scripts = Array.from(document.querySelectorAll('script[type="application/json"]'))
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '')
        if (data?.cart?.payment_collection?.payment_sessions) {
          return data.cart.payment_collection.payment_sessions
        }
      } catch {}
    }

    // Fallback: check page source
    const bodyText = document.body.innerHTML
    const match = bodyText.match(/"locale"\s*:\s*"([^"]+)"/)
    return match ? { localeFromDOM: match[1] } : { note: 'locale not found in DOM — verify via network tab' }
  })

  return JSON.stringify({ sessionData, result: 'Check sessionData.locale or localeFromDOM value' })
}
```

> **Expected**: `locale` field in session data = `"da_DK"` — confirms that the Backend correctly passes locale with the session.  
> If locale does not appear in the DOM, check the Network tab in the browser → request to `/store/carts/{id}`

---

## Reporting Results

### ✅ All ACs passed

```
PASS — Frisbii Pay Payment Display Locale

AC1 (Dropdown UI):          en_GB/da_DK enabled, others disabled with "Coming soon" ✅
AC2 (Persist en_GB):        en_GB saved and reloads correctly ✅
AC3 (Persist da_DK):        da_DK saved and reloads correctly ✅
AC4 (Public Config API):    API returns correct locale after save ✅
AC5 (API Validator):        Invalid locales (sv_SE, pl_PL) rejected with HTTP 4xx ✅
AC6 (Frontend en_GB text):  Button shows "Place order" ✅
AC7 (Frontend da_DK text):  Button shows "Afgiv ordre" ✅
AC8 (Session data locale):  session.data.locale matches saved locale ✅
```

### ❌ One or more ACs failed

```
FAIL — Frisbii Pay Payment Display Locale

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
- **Public Config Endpoint**: `GET http://localhost:9000/store/frisbii/config`
- **Admin Config Endpoint**: `POST http://localhost:9000/admin/frisbii/config`

### Locale Reference Values

| value   | label (EN)  | label (DA)  | enabled |
|---------|-------------|-------------|---------|
| en_GB   | English     | Engelsk     | ✅       |
| da_DK   | Danish      | Dansk       | ✅       |
| sv_SE   | Swedish     | Svensk      | ❌ Coming soon |
| nb_NO   | Norwegian   | Norsk       | ❌ Coming soon |
| de_DE   | German      | Tysk        | ❌ Coming soon |
| fr_FR   | French      | Fransk      | ❌ Coming soon |
| es_ES   | Spanish     | Spansk      | ❌ Coming soon |
| nl_NL   | Dutch       | Hollandsk   | ❌ Coming soon |
| pl_PL   | Polish      | Polsk       | ❌ Coming soon |

### Frontend Translation Reference

| Key                  | en_GB                                        | da_DK                                          |
|----------------------|----------------------------------------------|------------------------------------------------|
| `placeOrder`         | Place order                                  | Afgiv ordre                                    |
| `processing`         | Processing...                                | Behandler...                                   |
| `openingPaymentWindow` | Opening payment window...                  | Åbner betalingsvindue...                       |
| `loadingPaymentForm` | Loading payment form...                      | Indlæser betalingsformular...                  |
| `redirectingToPayment` | Redirecting to payment...                  | Omdirigerer til betaling...                    |
| `paymentInitFailed`  | Payment could not be initialised. Please try again. | Betaling kunne ikke startes. Prøv igen. |
| `paymentCancelled`   | Payment was cancelled.                       | Betaling blev annulleret.                      |
