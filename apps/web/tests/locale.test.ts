import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, localePreference } from "../src/lib/locale";

describe("localePreference", () => {
  it("defaults to en and accepts only known locales", () => {
    expect(localePreference(null)).toBe(DEFAULT_LOCALE);
    expect(localePreference(undefined)).toBe("en");
    expect(localePreference("invalid")).toBe("en");
    expect(localePreference("en")).toBe("en");
    expect(localePreference("ru")).toBe("ru");
  });
});
