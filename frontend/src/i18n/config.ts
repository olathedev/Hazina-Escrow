import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from "./catalog";

export const I18N_STORAGE_KEY = "hazina.locale";

export function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export function normalizeLocale(input: string | null | undefined): SupportedLocale | null {
  if (!input) {
    return null;
  }

  const normalized = input.toLowerCase();
  if (isSupportedLocale(normalized)) {
    return normalized;
  }

  const base = normalized.split("-")[0];
  return isSupportedLocale(base) ? base : null;
}

export function detectBrowserLocale(): SupportedLocale {
  if (typeof navigator === "undefined") {
    return DEFAULT_LOCALE;
  }

  const candidates = [...navigator.languages, navigator.language];
  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) {
      return locale;
    }
  }

  return DEFAULT_LOCALE;
}

export function loadStoredLocale(storageKey = I18N_STORAGE_KEY): SupportedLocale | null {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeLocale(window.localStorage.getItem(storageKey));
}

export function resolveInitialLocale(
  initialLocale?: SupportedLocale,
  storageKey = I18N_STORAGE_KEY,
): SupportedLocale {
  return initialLocale ?? loadStoredLocale(storageKey) ?? detectBrowserLocale();
}
