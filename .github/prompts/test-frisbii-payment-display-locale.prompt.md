---
description: "ทดสอบการตั้งค่า Payment Display Locale ใน Admin Settings — ครอบคลุมทั้ง Backend (การบันทึก, persistence, API validator) และ Frontend (UI text ตาม locale)"
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

ทดสอบฟีเจอร์ **Payment Display Locale** ครอบคลุม:
- **Backend**: Dropdown แสดง locale ที่ enabled/disabled ถูกต้อง, บันทึกและคืนค่าได้, API validator ปฏิเสธ locale ที่ไม่รองรับ, Public config endpoint คืน locale ที่บันทึกไว้
- **Frontend**: UI text ของ FrisbiiPaymentButton เปลี่ยนตาม locale ที่กำหนด

**Locale ที่รองรับ**: `en_GB` (English) และ `da_DK` (Danish)  
**Locale ปิดไว้ (Coming soon)**: sv_SE, nb_NO, de_DE, fr_FR, es_ES, nl_NL, pl_PL

**ข้อกำหนดก่อนทดสอบ**:
- Medusa Backend รันที่ `http://localhost:9000`
- Medusa Storefront รันที่ `http://localhost:8000`
- Plugin Frisbii Pay ถูก configure และ assign ให้ region Denmark แล้ว

---

## หลักการสำคัญ (อ่านก่อนเริ่ม)

**ใช้ `mcp_microsoft_pla_browser_run_code` เป็นหลัก** — รวมหลาย action ไว้ใน call เดียวเพื่อความเร็ว

**อย่าเรียก snapshot โดยไม่จำเป็น** — snapshot เฉพาะเมื่อต้องการ debug หรือหา ref เท่านั้น

**ลำดับ form fields** ของ storefront นี้:
- `input[placeholder=" "]` nth(0) = first_name
- `input[placeholder=" "]` nth(1) = last_name
- `input[placeholder=" "]` nth(2) = address_1
- `input[placeholder=" "]` nth(4) = postal_code
- `input[placeholder=" "]` nth(5) = city
- `select[name="shipping_address.country_code"]` = country
- `input[placeholder=" "]` nth(7) = email

---

## AC1 — Dropdown แสดง enabled/disabled ถูกต้อง

ตรวจสอบว่า:
- `en_GB` และ `da_DK` ปรากฏในรายการและสามารถเลือกได้ (ไม่มี attribute `disabled`)
- Locale อื่น (sv_SE, nb_NO, de_DE, fr_FR, es_ES, nl_NL, pl_PL) ปรากฏแต่มี `disabled` และมีข้อความ "Coming soon" / "Kommer snart"

### AC1-Step 1 — Login Admin

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

> ตรวจสอบ URL ว่า redirect เข้า `/app/` ได้ — ถ้าไม่ใช่ → snapshot และรายงาน

---

### AC1-Step 2 — เปิด Locale Dropdown และสแกน Items

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  // คลิก trigger ของ Locale select (trigger ที่ 3 — หลัง Display Type)
  // Locale select อยู่ถัดจาก Display Type select ในหน้า Payment Display
  const triggers = page.locator('button[role="combobox"]')
  const triggerCount = await triggers.count()
  if (triggerCount < 2) return `ERROR: Need at least 2 select triggers, found ${triggerCount}`

  // Locale select เป็น trigger ที่ 2 (index 1) ใน Payment Display section
  // (Display Type คือ index 0)
  // ลองใช้ label เพื่อระบุตำแหน่ง
  const localeLabel = page.locator('label').filter({ hasText: /^(Sprog|Locale)$/i })
  const localeLabelVisible = await localeLabel.isVisible().catch(() => false)
  if (!localeLabelVisible) return 'ERROR: Locale label not found'

  // หา select trigger ที่อยู่ใกล้ label "Locale" / "Sprog"
  const localeSection = localeLabel.locator('..').locator('..')
  const localeTrigger = localeSection.locator('button[role="combobox"]').first()
  const localeTriggerVisible = await localeTrigger.isVisible().catch(() => false)
  if (!localeTriggerVisible) {
    // Fallback: ใช้ตำแหน่งที่ 2 (0-indexed) ของ trigger ทั้งหมด
    await triggers.nth(1).click()
  } else {
    await localeTrigger.click()
  }
  await page.waitForTimeout(500)

  // อ่าน items ใน dropdown
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

  // ปิด dropdown
  await page.keyboard.press('Escape')

  return JSON.stringify(result, null, 2)
}
```

> **Expected**:
> - Items ที่มี `en_GB` text (`English` / `Engelsk`) → `isDisabled` เป็น `false` หรือ null
> - Items ที่มี `da_DK` text (`Danish` / `Dansk`) → `isDisabled` เป็น `false` หรือ null
> - Items อื่นทั้งหมด (Swedish, Norwegian, German, French, Spanish, Dutch, Polish) → `isDisabled` ≠ `false` และ `hasComingSoon = true`

Take screenshot หลัง dropdown เปิดเพื่อ document สถานะ UI

---

## AC2 — บันทึก Locale = en_GB แล้ว Reload คงค่าเดิม

### AC2-Step 1 — ตั้งค่า Locale เป็น en_GB แล้ว Save

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  // หา Locale trigger
  const localeLabel = page.locator('label').filter({ hasText: /^(Sprog|Locale)$/i })
  const localeSection = localeLabel.locator('..').locator('..')
  const localeTrigger = localeSection.locator('button[role="combobox"]').first()

  // เปิด dropdown
  await localeTrigger.click()
  await page.waitForTimeout(500)

  // คลิก en_GB option (English / Engelsk)
  const enOption = page.locator('[role="option"]').filter({ hasText: /English|Engelsk/ }).first()
  const enVisible = await enOption.isVisible().catch(() => false)
  if (!enVisible) return 'ERROR: English (en_GB) option not visible in dropdown'
  await enOption.click()
  await page.waitForTimeout(500)

  // ตรวจสอบค่าที่เลือก
  const triggerText = await localeTrigger.textContent()

  // Save
  await page.getByRole('button', { name: /Save Configuration|Gem konfiguration/i }).click()
  await page.waitForTimeout(2000)

  const toast = await page.locator('[data-sonner-toast], [role="status"]').first().textContent().catch(() => '')
  return JSON.stringify({ selectedValue: triggerText?.trim(), toast: toast?.trim() })
}
```

> ตรวจสอบว่า toast แสดง "Configuration saved" / "Konfiguration gemt"

---

### AC2-Step 2 — Reload หน้า Settings แล้วตรวจ Locale ที่บันทึกไว้ ✅

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

## AC3 — บันทึก Locale = da_DK แล้ว Reload คงค่าเดิม

### AC3-Step 1 — ตั้งค่า Locale เป็น da_DK แล้ว Save

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

  // คลิก da_DK option (Danish / Dansk)
  const daOption = page.locator('[role="option"]').filter({ hasText: /Danish|Dansk/ }).first()
  const daVisible = await daOption.isVisible().catch(() => false)
  if (!daVisible) return 'ERROR: Danish (da_DK) option not visible in dropdown'

  // ตรวจว่า option นี้ไม่ถูก disabled
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

### AC3-Step 2 — Reload หน้า Settings แล้วตรวจ Locale ที่บันทึกไว้ ✅

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

## AC4 — Public Config API คืน locale ที่ตรงกับที่บันทึกไว้

ตรวจสอบว่า endpoint `GET /store/frisbii/config` คืนค่า `locale` ที่ตรงกับ Admin Settings

### AC4-Step 1 — ตั้ง locale เป็น en_GB แล้วตรวจ API

```js
// run_code:
async (page) => {
  // ตั้งค่า en_GB ก่อน (ต้องอยู่ใน admin session แล้ว)
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

  // เรียก public config API
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

> **Expected**: `locale === "en_GB"` และ `result = "PASS"`

---

### AC4-Step 2 — เปลี่ยน locale เป็น da_DK แล้วตรวจ API ✅

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

> **Expected**: `locale === "da_DK"` และ `result = "PASS"`

---

## AC5 — API Validator ปฏิเสธ Locale ที่ไม่รองรับ

ตรวจสอบว่าการส่ง `locale: "sv_SE"` (locale ที่ปิดไว้) ผ่าน API ตรง ๆ จะถูกปฏิเสธด้วย HTTP 4xx

### AC5-Step 1 — POST locale=sv_SE ผ่าน API โดยตรง ✅

```js
// run_code:
async (page) => {
  // ส่ง POST จาก context ของ admin (มี cookie session)
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

> **Expected**: HTTP 400 (bad request) และ `result = "PASS"`  
> Body มักประกอบด้วย error message จาก Zod validation

---

### AC5-Step 2 — POST locale=pl_PL ยืนยันซ้ำกับ locale อื่นที่ปิดไว้

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

> **Expected**: HTTP 4xx และ `result = "PASS"`

---

## AC6 — Frontend Payment Button แสดง Text เป็นภาษาอังกฤษ เมื่อ locale = en_GB

### AC6-Step 1 — ตั้ง locale = en_GB ใน Admin

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

### AC6-Step 2 — เพิ่มสินค้าลงตะกร้า

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

### AC6-Step 3 — กรอก Address และ Delivery

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

### AC6-Step 4 — เลือก Frisbii Pay และตรวจ Button Text ✅

```js
// run_code:
async (page) => {
  await page.waitForTimeout(1500)

  // เลือก Frisbii Pay radio
  const frisbiiRadio = page.getByRole('radio', { name: /frisbii/i })
  const frisbiiCount = await frisbiiRadio.count()
  if (frisbiiCount === 0) return 'ERROR: Frisbii Pay not found in payment options — check that Enabled=true in Admin'
  await frisbiiRadio.first().click()
  await page.waitForTimeout(500)

  // หา Payment Button (data-testid="submit-payment-button" หรือ button ที่มีข้อความ Place order)
  const submitBtn = page.getByTestId('submit-payment-button')
  const submitBtnExists = await submitBtn.count() > 0

  let buttonText = ''
  if (submitBtnExists) {
    buttonText = (await submitBtn.textContent() || '').trim()
  } else {
    // Frisbii Payment Button อาจ render แยกต่างหาก
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

> **Expected**: `buttonText = "Place order"` และ `result = "PASS"`  
> Take screenshot เพื่อยืนยัน button text

---

## AC7 — Frontend Payment Button แสดง Text เป็นภาษาเดนมาร์ก เมื่อ locale = da_DK

### AC7-Step 1 — เปลี่ยน locale = da_DK ใน Admin แล้ว Save

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

### AC7-Step 2 — สร้าง Cart ใหม่และไปถึง Payment Step

> **หมายเหตุ**: Cart เดิมถูกสร้างในช่วง AC6 แล้ว ต้องสร้าง cart ใหม่เพื่อให้ session data มี locale ใหม่ (da_DK)

```js
// run_code:
async (page) => {
  // ล้าง cart เดิม: ไปที่ storefront หน้าแรกแล้วสร้าง cart ใหม่
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

### AC7-Step 3 — เลือก Frisbii Pay และตรวจ Button Text ✅

```js
// run_code:
async (page) => {
  await page.waitForTimeout(1500)

  const frisbiiRadio = page.getByRole('radio', { name: /frisbii/i })
  const frisbiiCount = await frisbiiRadio.count()
  if (frisbiiCount === 0) return 'ERROR: Frisbii Pay not found in payment options'
  await frisbiiRadio.first().click()
  await page.waitForTimeout(500)

  // ตรวจ Payment Button Text
  const submitBtn = page.getByTestId('submit-payment-button')
  const submitBtnExists = await submitBtn.count() > 0

  let buttonText = ''
  if (submitBtnExists) {
    buttonText = (await submitBtn.textContent() || '').trim()
  } else {
    const frisbiiBtn = page.locator('button').filter({ hasText: /Place order|Afgiv ordre/i })
    buttonText = (await frisbiiBtn.first().textContent().catch(() => '')) || ''
  }

  // "Afgiv ordre" คือ Danish สำหรับ "Place order"
  const isDanish = buttonText === 'Afgiv ordre'

  // ยืนยัน session data locale
  const sessionLocale = await page.evaluate(() => {
    // ลองดึงจาก React state หรือ data attributes (ถ้ามี)
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

> **Expected**: `buttonText = "Afgiv ordre"` และ `result = "PASS"`  
> Take screenshot เพื่อยืนยัน

---

## AC8 — Locale ถูกส่งต่อใน Session Data (API Integrity Check)

ตรวจสอบว่า `session.data.locale` ใน cart payment session ตรงกับที่ตั้งไว้ใน Admin

### AC8-Step 1 — ดึง Payment Session Data และตรวจ locale field ✅

> ทำต่อจาก AC7 (ยังอยู่ที่ checkout payment step กับ locale = da_DK)

```js
// run_code:
async (page) => {
  // ดึง cart ID จาก cookie หรือ URL
  await page.waitForTimeout(1000)

  const sessionData = await page.evaluate(async () => {
    // ลองดึง cart data จาก Next.js fetch หรือ localStorage
    // วิธีที่ reliable ที่สุดคือ intercept network หรือดึงจาก DOM
    // ลอง query cart API ถ้ารู้ cart ID
    const scripts = Array.from(document.querySelectorAll('script[type="application/json"]'))
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '')
        if (data?.cart?.payment_collection?.payment_sessions) {
          return data.cart.payment_collection.payment_sessions
        }
      } catch {}
    }

    // Fallback: ดูจาก page source
    const bodyText = document.body.innerHTML
    const match = bodyText.match(/"locale"\s*:\s*"([^"]+)"/)
    return match ? { localeFromDOM: match[1] } : { note: 'locale not found in DOM — verify via network tab' }
  })

  return JSON.stringify({ sessionData, result: 'Check sessionData.locale or localeFromDOM value' })
}
```

> **Expected**: `locale` field ใน session data = `"da_DK"` — ยืนยันว่า Backend ส่ง locale ไปกับ session ได้ถูกต้อง  
> หาก locale ไม่ปรากฏใน DOM ให้ตรวจสอบ Network tab ใน browser → request ไปยัง `/store/carts/{id}`

---

## การรายงานผล

### ✅ กรณีทุก AC ผ่าน

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

### ❌ กรณีมี AC ล้มเหลว

```
FAIL — Frisbii Pay Payment Display Locale

Failed AC: AC<N>
Failed at: Step <X>
Error: <error message>
Current URL: <url>
Expected: <expected behaviour>
Actual: <actual behaviour>
```

พร้อม screenshot ของหน้าที่เกิด error

---

## ข้อมูลอ้างอิง

- **Storefront**: `http://localhost:8000`
- **Backend Admin**: `http://localhost:9000/app`
- **Admin User**: `boyd@radarsofthouse.dk` / `Test#1234`
- **Frisbii Settings URL**: `http://localhost:9000/app/settings/frisbii`
- **Public Config Endpoint**: `GET http://localhost:9000/store/frisbii/config`
- **Admin Config Endpoint**: `POST http://localhost:9000/admin/frisbii/config`

### Locale Values อ้างอิง

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
