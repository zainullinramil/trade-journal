"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import {
  DEFAULT_LOCALE,
  LOCALE_KEY,
  MESSAGES,
  localePreference,
  type Locale,
} from "@/lib/locale";

const LocaleContext = createContext({
  locale: DEFAULT_LOCALE as Locale,
  ready: false,
  setLocale: (_locale: Locale) => {},
});

function applyDocumentLang(locale: Locale) {
  document.documentElement.lang = locale;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LOCALE_KEY);
    } catch {
      saved = null;
    }
    const next = localePreference(saved);
    applyDocumentLang(next);
    setLocaleState(next);
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === LOCALE_KEY || event.key === null) {
        const synced = localePreference(event.newValue);
        applyDocumentLang(synced);
        setLocaleState(synced);
        setError("");
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const setLocale = (next: Locale) => {
    applyDocumentLang(next);
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_KEY, next);
      setError("");
    } catch {
      setError(
        next === "ru"
          ? "Язык изменён, но браузер не смог сохранить его для следующего визита."
          : "Language changed, but your browser could not save it for next time.",
      );
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, ready, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
        {children}
      </NextIntlClientProvider>
      {error && (
        <p
          role="status"
          className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-32px)] rounded-lg border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg"
        >
          {error}
        </p>
      )}
    </LocaleContext.Provider>
  );
}

export function useLocalePreference() {
  return useContext(LocaleContext);
}
