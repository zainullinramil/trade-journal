import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

export const LOCALES = ["en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_KEY = "journal-locale-v1";

export const MESSAGES = { en, ru } as const;

export function localePreference(value: string | null | undefined): Locale {
  return value === "ru" ? "ru" : DEFAULT_LOCALE;
}
