"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { OptionSelect } from "./ui/option-select";
import { LOCALES, type Locale } from "@/lib/locale";
import { useLocalePreference } from "./locale-provider";

export function LanguageSettings() {
  const t = useTranslations("language");
  const { locale, ready, setLocale } = useLocalePreference();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="interface-language" className="mb-1 block text-xs text-muted-foreground">
            {t("label")}
          </Label>
          <OptionSelect
            id="interface-language"
            value={locale}
            disabled={!ready}
            onValueChange={(value) => setLocale(value as Locale)}
          >
            {LOCALES.map((code) => (
              <option key={code} value={code}>
                {t(code)}
              </option>
            ))}
          </OptionSelect>
          <p className="mt-1 text-xs text-muted-foreground">{t("help")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
