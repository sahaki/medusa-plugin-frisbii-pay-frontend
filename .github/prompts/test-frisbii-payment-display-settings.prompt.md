---
description: "ทดสอบการตั้งค่า Payment Display (Enabled, Title) ใน Admin Settings และตรวจสอบผลลัพธ์ที่หน้า Checkout"
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

ทดสอบว่าการตั้งค่า **Enabled** และ **Title** ใน Admin Settings ส่งผลต่อหน้า Checkout ได้ถูกต้อง

**ข้อกำหนดก่อนทดสอบ**:
- Medusa Backend รันที่ `http://localhost:9000`
- Medusa Storefront รันที่ `http://localhost:8000`
- Plugin Frisbii Pay ถูก configure และ assign ให้ region Denmark แล้ว

---

## หลักการสำคัญ (อ่านก่อนเริ่ม)

**ใช้ `mcp_microsoft_pla_browser_run_code` เป็นหลัก** — tool นี้รัน Playwright code โดยตรงทำให้เร็วกว่าการ snapshot + click ทีละขั้น รวมหลาย action ไว้ใน call เดียวได้

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

## AC1 — Enabled = false → Frisbii Pay ไม่ควรแสดงใน Checkout

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

> ตรวจสอบ URL ว่า redirect เข้า `/app/` หรือ `/app/dashboard` ได้ — ถ้าไม่ใช่ → snapshot และรายงาน

---

### AC1-Step 2 — ตั้งค่า Enabled = false

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  // ตรวจสอบว่าอยู่ในหน้า settings ถูกต้อง
  const heading = await page.locator('h1, h2').filter({ hasText: /frisbii/i }).first().textContent().catch(() => '')
  if (!heading) return 'ERROR: Frisbii settings page not found'

  // หา Switch สำหรับ Enabled
  // Switch มักอยู่ถัดจาก Label "Enabled"
  const enabledLabel = page.locator('label, span').filter({ hasText: /^Enabled$/i }).first()
  const enabledLabelVisible = await enabledLabel.isVisible().catch(() => false)
  if (!enabledLabelVisible) return 'ERROR: Enabled label not found'

  // ตรวจสอบ state ปัจจุบันของ Switch — ถ้า checked ให้ click เพื่อ disable
  const switchBtn = page.locator('button[role="switch"]').first()
  const isChecked = await switchBtn.getAttribute('data-state').catch(() => 'unknown')
  if (isChecked === 'checked') {
    await switchBtn.click()
    await page.waitForTimeout(500)
  }

  // ตรวจสอบว่า switch เป็น unchecked แล้ว
  const newState = await switchBtn.getAttribute('data-state').catch(() => 'unknown')
  if (newState !== 'unchecked') return `ERROR: Switch state is still "${newState}", expected "unchecked"`

  // Save
  await page.getByRole('button', { name: /Save/i }).click()
  await page.waitForTimeout(2000)

  // ตรวจสอบ toast success
  const toast = await page.locator('[data-sonner-toast], [role="status"]').first().textContent().catch(() => '')
  return JSON.stringify({ switchNewState: newState, toast })
}
```

> ตรวจสอบว่า toast แสดง success และ switch เป็น `unchecked`

---

### AC1-Step 3 — เพิ่มสินค้าลงตะกร้า

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

### AC1-Step 4 — กรอก Address

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

### AC1-Step 5 — เลือก Shipping

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

### AC1-Step 6 — ตรวจสอบว่า Frisbii Pay ไม่แสดง ✅

```js
// run_code:
async (page) => {
  await page.waitForTimeout(1000)
  const bodyText = await page.locator('body').textContent()

  // ตรวจว่า Frisbii Pay ไม่มีในรายการ
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

> **Expected**: `frisbiiRadioCount === 0` และ `result = "PASS"`  
> Take screenshot เพื่อยืนยันสภาพหน้า Payment

---

## AC2 — Enabled = true → Frisbii Pay ควรกลับมาแสดง

### AC2-Step 1 — กลับตั้งค่า Enabled = true

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

> ตรวจสอบว่า switch เป็น `checked` และ toast แสดง success

---

### AC2-Step 2 — Refresh หน้า Checkout Payment และตรวจสอบ Frisbii Pay ✅

```js
// run_code:
async (page) => {
  // Reload checkout payment step
  await page.goto('http://localhost:8000/dk/checkout?step=payment')
  await page.waitForTimeout(2000)

  const frisbiiRadio = page.getByRole('radio', { name: /frisbii/i })
  const frisbiiCount = await frisbiiRadio.count()

  // ตรวจ label text
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

> **Expected**: `frisbiiRadioCount >= 1` และ `result = "PASS"`  
> Take screenshot เพื่อยืนยัน

---

## AC3 — Title = "Frisbii Payment" → แสดงชื่อที่อัปเดตใน Checkout

### AC3-Step 1 — ตั้งค่า Title = "Frisbii Payment"

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  // หา input ของ Title (ถัดจาก Label "Title")
  const titleLabel = page.locator('label, span').filter({ hasText: /^Title$/i }).first()
  const titleLabelVisible = await titleLabel.isVisible().catch(() => false)
  if (!titleLabelVisible) return 'ERROR: Title label not found'

  // Input ถัดจาก label "Title"
  const titleInput = page.locator('input[type="text"]').filter({ hasNot: page.locator('[type="password"]') }).nth(0)

  // ล้างค่าเดิมและกรอกค่าใหม่
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

> ตรวจสอบว่า toast แสดง success

---

### AC3-Step 2 — Refresh หน้า Checkout Payment และตรวจสอบ Title ✅

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:8000/dk/checkout?step=payment')
  await page.waitForTimeout(2000)

  // ตรวจหาชื่อ "Frisbii Payment" ในรายการ payment methods
  const paymentMethodLabel = page.getByRole('radio', { name: /Frisbii Payment/i })
  const exactMatchCount = await paymentMethodLabel.count()

  // ตรวจว่าชื่อเก่า "Frisbii Pay" หายไปแล้ว
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

> **Expected**: `hasNewTitle = true` และ `result = "PASS"`  
> Take screenshot เพื่อยืนยัน

---

## การรายงานผล

### ✅ กรณีทุก AC ผ่าน

```
PASS — Frisbii Pay Payment Display Settings

AC1 (Enabled=false): Frisbii Pay hidden from checkout ✅
AC2 (Enabled=true):  Frisbii Pay visible in checkout ✅
AC3 (Title update):  Title shows "Frisbii Payment" ✅
```

### ❌ กรณีมี AC ล้มเหลว

```
FAIL — Frisbii Pay Payment Display Settings

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
- **Provider ID**: `pp_frisbii-payment_frisbii-payment`
