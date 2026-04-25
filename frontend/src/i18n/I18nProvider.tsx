import { createContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_LABELS, SUPPORTED_LOCALES, type MessageKey, type SupportedLocale } from "./catalog";
import { I18N_STORAGE_KEY, normalizeLocale, resolveInitialLocale } from "./config";
import { formatCurrency, formatDate, formatNumber, translate } from "./translate";
import type { TranslationParams } from "./types";

export interface I18nContextValue {
  locale: SupportedLocale;
  defaultLocale: SupportedLocale;
  availableLocales: readonly SupportedLocale[];
  setLocale: (locale: SupportedLocale) => void;
  getLocaleLabel: (locale: SupportedLocale) => string;
  t: (key: MessageKey, params?: TranslationParams) => string;
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  currency: (
    value: number,
    currency?: string,
    options?: Intl.NumberFormatOptions,
  ) => string;
  date: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string;
}

export interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: SupportedLocale;
  storageKey?: string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale,
  storageKey = I18N_STORAGE_KEY,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() =>
    resolveInitialLocale(initialLocale, storageKey),
  );

  useEffect(() => {
    const normalized = normalizeLocale(locale) ?? DEFAULT_LOCALE;
    document.documentElement.lang = normalized;
    document.documentElement.dir = "ltr";
    window.localStorage.setItem(storageKey, normalized);
  }, [locale, storageKey]);

  const value: I18nContextValue = {
    locale,
    defaultLocale: DEFAULT_LOCALE,
    availableLocales: SUPPORTED_LOCALES,
    setLocale: setLocaleState,
    getLocaleLabel: (nextLocale) => LOCALE_LABELS[nextLocale] ?? nextLocale,
    t: (key, params) => translate(locale, key, params),
    number: (valueToFormat, options) => formatNumber(locale, valueToFormat, options),
    currency: (valueToFormat, currencyCode, options) =>
      formatCurrency(locale, valueToFormat, currencyCode, options),
    date: (valueToFormat, options) => formatDate(locale, valueToFormat, options),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
