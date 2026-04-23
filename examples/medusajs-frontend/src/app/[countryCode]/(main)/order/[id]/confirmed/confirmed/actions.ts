"use server"

import { removeCartId } from "@lib/data/cookies"

/**
 * Server Action to clear the cart cookie.
 * Called from the client-side ClearCartOnLoad component after order confirmation.
 * Must be in a "use server" file to allow cookie modification.
 */
export async function clearCartAction() {
  await removeCartId()
}
