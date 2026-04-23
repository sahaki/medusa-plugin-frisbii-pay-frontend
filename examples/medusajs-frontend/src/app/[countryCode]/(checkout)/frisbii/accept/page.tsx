import { completeOrder } from "@lib/data/cart"
import { redirect } from "next/navigation"

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

/**
 * Poll the backend to see whether the Reepay webhook has already
 * completed the cart and created a Medusa order.
 * Returns { order_id, country_code } when found, null otherwise.
 */
async function pollOrderByCart(
  cartId: string,
  maxAttempts = 15,
  delayMs = 2000
): Promise<{ order_id: string; country_code: string } | null> {
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    try {
      const res = await fetch(
        `${BACKEND_URL}/store/frisbii/order-by-cart?cart_id=${encodeURIComponent(cartId)}`,
        {
          cache: "no-store",
          headers: {
            "x-publishable-api-key": PUBLISHABLE_KEY,
          },
        }
      )
      if (res.ok) {
        const data = await res.json()
        if (data?.order_id) {
          return {
            order_id: data.order_id,
            country_code: data.country_code || "dk",
          }
        }
      }
    } catch {
      // network error — keep retrying
    }
  }
  return null
}

export default async function FrisbiiAcceptPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ cart_id?: string }>
  params: Promise<{ countryCode: string }>
}) {
  const { cart_id: cartId } = await searchParams
  const { countryCode } = await params

  if (!cartId) {
    redirect(`/${countryCode}/checkout?step=review`)
  }

  // --- Fast path: call cart.complete() with retries (~10-20s max) ---------
  // skipCookieClear=true avoids removeCartId() which is not allowed in Server
  // Component renders. Cart cookie cleanup is handled on next checkout visit.
  const result = await completeOrder(cartId!, { skipCookieClear: true })
  if (result.success) {
    redirect(result.redirectUrl)
  }

  // --- Slow path: poll order-by-cart in case webhook fired during retries --
  const order = await pollOrderByCart(cartId!, 10, 2000) // up to 20s
  if (order) {
    redirect(`/${order.country_code}/order/${order.order_id}/confirmed`)
  }

  // Final fallback
  console.error("Frisbii accept: order not found after all attempts, cart:", cartId)
  redirect(`/${countryCode}/checkout?step=review`)
}
