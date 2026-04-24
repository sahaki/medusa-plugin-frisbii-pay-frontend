"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { HttpTypes } from "@medusajs/types"

export const listCartPaymentMethods = async (regionId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("payment_providers")),
  }

  return sdk.client
    .fetch<HttpTypes.StorePaymentProviderListResponse>(
      `/store/payment-providers`,
      {
        method: "GET",
        query: { region_id: regionId },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ payment_providers }) =>
      payment_providers.sort((a, b) => {
        return a.id > b.id ? 1 : -1
      })
    )
    .catch(() => {
      return null
    })
}

export const getFrisbiiPublicConfig = async (): Promise<{
  enabled: boolean
  title: string
} | null> => {
  return sdk.client
    .fetch<{ config: { enabled: boolean; title: string } | null }>(
      "/store/frisbii/config",
      {
        method: "GET",
        cache: "no-store",
      }
    )
    .then((data) => {
      // Backend returns { config: null } when enabled=false
      if (!data?.config) {
        return { enabled: false, title: "" }
      }
      return data.config
    })
    .catch(() => null)
}
