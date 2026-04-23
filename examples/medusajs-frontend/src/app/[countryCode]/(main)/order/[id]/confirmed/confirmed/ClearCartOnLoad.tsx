"use client"

import { useEffect } from "react"
import { clearCartAction } from "./actions"

/**
 * Clears the cart cookie once the order confirmed page mounts.
 * This runs client-side after SSR so the Server Action can modify cookies.
 */
export default function ClearCartOnLoad() {
  useEffect(() => {
    clearCartAction().catch(() => {
      // Ignore errors — cart cookie will expire naturally
    })
  }, [])

  return null
}
