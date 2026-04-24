import { listCartShippingMethods } from "@lib/data/fulfillment"
import { getFrisbiiPublicConfig, listCartPaymentMethods } from "@lib/data/payment"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"

export default async function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart) {
    return null
  }

  const shippingMethods = await listCartShippingMethods(cart.id)
  let paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")
  const frisbiiConfig = await getFrisbiiPublicConfig()

  // Filter out Frisbii if disabled in admin settings
  if (frisbiiConfig?.enabled === false) {
    paymentMethods =
      paymentMethods?.filter((m) => !m.id.startsWith("pp_frisbii")) ?? []
  }

  if (!shippingMethods || !paymentMethods) {
    return null
  }

  return (
    <div className="w-full grid grid-cols-1 gap-y-8">
      <Addresses cart={cart} customer={customer} />

      <Shipping cart={cart} availableShippingMethods={shippingMethods} />

      <Payment
        cart={cart}
        availablePaymentMethods={paymentMethods}
        frisbiiTitle={frisbiiConfig?.title}
      />

      <Review cart={cart} />
    </div>
  )
}
