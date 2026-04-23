"use client"

import { useSearchParams, useRouter, useParams } from "next/navigation"
import { useEffect } from "react"

export default function FrisbiiCancelPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { countryCode } = useParams()

  const cartId = searchParams.get("cart_id")

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(`/${countryCode}/checkout`)
    }, 2000)

    return () => clearTimeout(timer)
  }, [router, countryCode])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <p>Payment was cancelled. Redirecting back to checkout...</p>
    </div>
  )
}
