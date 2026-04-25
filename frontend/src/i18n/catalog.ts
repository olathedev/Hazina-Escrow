import { en, type EnglishMessages } from "./messages/en";
import { es } from "./messages/es";
import { fr } from "./messages/fr";
import { sw } from "./messages/sw";
import type { TranslationKey } from "./types";

export const catalogs = {
  en,
  es,
  fr,
  sw,
} as const;

export const SUPPORTED_LOCALES = Object.keys(catalogs) as Array<
  keyof typeof catalogs
>;

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  sw: "Kiswahili",
};

export type SupportedLocale = keyof typeof catalogs;
export type MessageCatalog = EnglishMessages;
export type MessageKey = TranslationKey<EnglishMessages>;
