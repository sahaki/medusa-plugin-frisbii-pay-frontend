import { en } from "./translations/en"
import { da } from "./translations/da"
import type { TranslationKeys } from "./translations/en"

// ─── Internal locale map ────────────────────────────────────────────────────

const TRANSLATIONS: Record<string, TranslationKeys> = {
  en_GB: en,
  en_US: en,
  en: en,
  da_DK: da,
  da: da,
}

// ─── Pure function (SSR-safe) ────────────────────────────────────────────────

/**
 * Returns the translation object for the given Reepay/Medusa locale string.
 * Falls back to English for any unrecognised locale.
 * SSR-safe — does not use any browser APIs.
 *
 * @example
 * ```ts
 * const t = getTranslation("da_DK")
 * // t.placeOrder → "Afgiv ordre"
 *
 * const t = getTranslation("en_GB")
 * // t.placeOrder → "Place order"
 * ```
 */
export function getTranslation(locale?: string | null): TranslationKeys {
  if (!locale) return en
  // Exact match first (e.g. "da_DK")
  if (locale in TRANSLATIONS) return TRANSLATIONS[locale]
  // Language-prefix match (e.g. "da" from "da-DK")
  const prefix = locale.split(/[-_]/)[0].toLowerCase()
  return TRANSLATIONS[prefix] ?? en
}
