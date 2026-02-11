// i18n Configuration for UnionEyes
// Supports English (en) and French (fr) for Canadian market

export const locales = ['en', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇨🇦', // Canadian English
  fr: '🇨🇦', // Canadian French (Quebec)
};

