import { catalogs, DEFAULT_LOCALE, type MessageCatalog, type MessageKey, type SupportedLocale } from "./catalog";
import type { TranslationDictionary, TranslationParams } from "./types";

function isTranslationDictionary(value: unknown): value is TranslationDictionary {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveMessage(catalog: MessageCatalog, key: MessageKey): string | null {
  let current: unknown = catalog;

  for (const segment of key.split(".")) {
    if (!isTranslationDictionary(current) || !(segment in current)) {
      return null;
    }

    current = current[segment];
  }

  return typeof current === "string" ? current : null;
}

function serializeParamValue(value: TranslationParams[string]): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined || value === null ? match : serializeParamValue(value);
  });
}

export function getCatalog(locale: SupportedLocale): MessageCatalog {
  return catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
}

export function translate(
  locale: SupportedLocale,
  key: MessageKey,
  params?: TranslationParams,
): string {
  const localized = resolveMessage(getCatalog(locale), key);
  const fallback = resolveMessage(getCatalog(DEFAULT_LOCALE), key);
  return interpolate(localized ?? fallback ?? key, params);
}

export function formatNumber(
  locale: SupportedLocale,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(
  locale: SupportedLocale,
  value: number,
  currency = "USD",
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...options,
  }).format(value);
}

export function formatDate(
  locale: SupportedLocale,
  value: Date | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, options).format(value);
}
