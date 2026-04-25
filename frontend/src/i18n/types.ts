export type TranslationValue = string | readonly string[] | TranslationDictionary;

export interface TranslationDictionary {
  [key: string]: TranslationValue;
}

export type TranslationParams = Record<
  string,
  string | number | boolean | Date | null | undefined
>;

type Join<K extends string, P extends string> = `${K}.${P}`;

export type TranslationKey<T extends TranslationDictionary> = {
  [K in Extract<keyof T, string>]: T[K] extends string
    ? K
    : T[K] extends readonly string[]
      ? never
    : T[K] extends TranslationDictionary
      ? K | Join<K, TranslationKey<T[K]>>
      : never;
}[Extract<keyof T, string>];

export type TranslationShape<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends readonly string[]
      ? readonly string[]
      : T[K] extends TranslationDictionary
      ? TranslationShape<T[K]>
      : never;
};
