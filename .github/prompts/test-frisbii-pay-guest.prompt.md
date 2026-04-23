---
description: "ทดสอบกระบวนการจ่ายเงินแบบ Guest ด้วย Frisbii Pay (Reepay) ครบ flow ตั้งแต่เลือกสินค้าจนถึง Thank You page"
name: "Test Frisbii Pay — Guest Checkout"
argument-hint: "ระบุ display mode ที่ต้องการทดสอบ: overlay | embedded | redirect (default: overlay)"
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

ทดสอบกระบวนการจ่ายเงินแบบ Guest ด้วย Frisbii Pay (Reepay) ให้ครบทุก step

**ข้อกำหนดก่อนทดสอบ**:
- Medusa Backend รันที่ `http://localhost:9000`
- Medusa Storefront รันที่ `http://localhost:8000`
- Plugin Frisbii Pay ถูก configure และ assign ให้ region Denmark แล้ว

---

## หลักการสำคัญ (อ่านก่อนเริ่ม)

**ใช้ `mcp_microsoft_pla_browser_run_code` เป็นหลัก** — tool นี้รัน Playwright code โดยตรงทำให้เร็วกว่าการ snapshot + click ทีละขั้น รวมหลาย action ไว้ใน call เดียวได้

**อย่าเรียก snapshot โดยไม่จำเป็น** — snapshot เฉพาะเมื่อต้องการ debug หรือหา ref เท่านั้น

**ลำดับ form fields** ของ storefront นี้ (ตรวจสอบแล้วจากการทดสอบจริง):
- `input[placeholder=" "]` nth(0) = first_name
- `input[placeholder=" "]` nth(1) = last_name  
- `input[placeholder=" "]` nth(2) = address_1
- `input[placeholder=" "]` nth(3) = company (ข้ามได้)
- `input[placeholder=" "]` nth(4) = postal_code
- `input[placeholder=" "]` nth(5) = city
- `select[name="shipping_address.country_code"]` = country
- `input[placeholder=" "]` nth(7) = email

**Reepay card form fields** (ตรวจสอบแล้ว):
- `input.form-control.rp-content-card-input` nth(0) = card number
- `input.form-control.rp-content-card-input` nth(1) = expiry (MM/YY format)
- `input.form-control.rp-content-card-input` nth(2) = CVV

**testid ที่ใช้ได้**:
- `add-product-button` = Add to Cart
- `submit-address-button` = Continue to delivery
- `submit-delivery-option-button` = Continue to payment
- `submit-payment-button` = Continue to review
- `submit-order-button` = Place order

---

## Step 1 — เพิ่มสินค้าลงตะกร้า (รวม 1 call)

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:8000/dk/products/shorts')
  await page.waitForTimeout(1500)
  // เลือก Size L (หรือ Size แรกที่ enable)
  const sizeButtons = page.locator('button:not([disabled])').filter({ hasText: /^[LMSXL]+$/ })
  const count = await sizeButtons.count()
  if (count === 0) return 'ERROR: no size available'
  await sizeButtons.first().click()
  await page.waitForTimeout(500)
  await page.getByTestId('add-product-button').click()
  await page.waitForTimeout(2000)
  // ตรวจสอบ cart counter
  const cartText = await page.locator('button[data-testid], a[href*="/cart"]').first().textContent().catch(() => '')
  return `added to cart. cart text: ${cartText}`
}
```

> หาก return มี "ERROR" → screenshot และรายงาน

---

## Step 2 — ไป Checkout และกรอกข้อมูล Address (รวม 1 call)

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

## Step 3 — เลือก Shipping และ Payment (รวม 2 call)

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

## Step 4 — Place Order → Reepay → 3DS → รอผล

### 4.1 Place order

```js
// run_code:
async (page) => {
  await page.getByTestId('submit-order-button').click()
  // รอให้ browser redirect ไป Reepay (อาจใช้เวลา 5-10 วินาที)
  try {
    await page.waitForURL('**/checkout.reepay.com/**', { timeout: 15000 })
  } catch {
    // อาจยังอยู่ที่หน้าเดิม เช็ค URL
  }
  return page.url()
}
```

> ตรวจสอบ URL ว่าขึ้นต้นด้วย `https://checkout.reepay.com/#/cs_` — ถ้าไม่ใช่ → snapshot และรายงาน

### 4.2 กรอกบัตรและจ่ายเงิน

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
  // รอ 3DS iframe ปรากฏ
  await page.waitForTimeout(3000)
  return 'payment submitted, waiting for 3DS'
}
```

### 4.3 Pass 3DS Challenge

```js
// run_code:
async (page) => {
  // Pass challenge ใน 3DS iframe
  const frame = page.frameLocator('iframe[name="threedV2ChallengeFrame"]')
  await frame.getByRole('button', { name: 'Pass challenge' }).click({ timeout: 10000 })
  return '3DS passed'
}
```

### 4.4 รอผลลัพธ์ (สำคัญมาก)

**รอ 20 วินาที** — backend มี retry logic ที่ใช้เวลา ~11 วินาทีในกรณีแย่ที่สุด จากนั้นตรวจ URL:

```js
// run_code:
async (page) => {
  await page.waitForTimeout(20000)
  return page.url()
}
```

> - URL มี `/order/order_` → **PASS** → ไปยัง Step 5
> - URL ยังเป็น `checkout.reepay.com` หรือ `checkout?step=review` → FAIL → snapshot + รายงาน

---

## Step 5 — ตรวจสอบ Thank You Page

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

จากนั้น **ตรวจสอบ cart ว่างเปล่า**:

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

## การรายงานผล

### ✅ กรณีสำเร็จ

```
PASS — Frisbii Pay Guest Checkout

Order ID: order_XXXX
Thank You URL: http://localhost:8000/dk/order/order_XXXX/confirmed
Cart cleared: ✅
Console errors: none
```

### ❌ กรณีล้มเหลว

```
FAIL — Frisbii Pay Guest Checkout

Failed at: Step X
Error: <error message>
Current URL: <url>
```

พร้อม screenshot ของหน้าที่เกิด error

---

## ข้อมูลอ้างอิง

- **Storefront**: `http://localhost:8000`
- **Backend Admin**: `http://localhost:9000/app`
- **Reepay Test Card**: `4111 1111 1111 1111` / `12/97` / `123` (Visa)
- **Provider ID**: `pp_frisbii-payment_frisbii-payment`
- **Accept URL pattern**: `/{countryCode}/checkout/frisbii/accept?cart_id={cart_id}`
- **Accept page**: จะเรียก `completeOrder()` ซึ่งมี retry 4 ครั้ง (1.5s/2.5s/4s delays)
- **authorizePayment**: มี retry 5 ครั้ง (1s/2s/3s/5s delays) — รวมเวลาสูงสุด ~11 วินาที
