import { useI18nStore, translate, type Locale } from "./store";

/** React hook: active locale + t() bound to it. */
export function useT() {
	const locale = useI18nStore((s) => s.locale);
	return { locale, t: (english: string) => translateWith(locale, english) };
}

export function translateWith(locale: Locale, english: string): string {
	return translate(english, locale);
}

export function getT(): (english: string) => string {
	const locale = useI18nStore.getState().locale;
	return (english: string) => translateWith(locale, english);
}

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
	(window as unknown as { __i18nDebug: object }).__i18nDebug = {
		translateWith,
		getLocale: () => useI18nStore.getState().locale,
	};
}
