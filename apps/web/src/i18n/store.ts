import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ZH_DICTIONARY } from "./zh";

export type Locale = "en" | "zh";

interface I18nStore {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	toggleLocale: () => void;
}

export const useI18nStore = create<I18nStore>()(
	persist(
		(set, get) => ({
			locale: "en",
			setLocale: (locale) => set({ locale }),
			toggleLocale: () =>
				set({ locale: get().locale === "en" ? "zh" : "en" }),
		}),
		{ name: "opencut-locale" },
	),
);

/** Translate an English UI string into the active locale (zh dictionary; en passes through). */
export function translate(
	english: string,
	locale: Locale,
): string {
	if (locale !== "zh") return english;
	return ZH_DICTIONARY[english] ?? english;
}
