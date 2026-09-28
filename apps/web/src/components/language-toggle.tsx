"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18nStore } from "@/i18n";

export function LanguageToggle() {
	const locale = useI18nStore((s) => s.locale);
	const toggleLocale = useI18nStore((s) => s.toggleLocale);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={toggleLocale}
					className="text-sm font-medium"
					aria-label="Toggle language / 切换语言"
				>
					{locale === "en" ? "EN" : "中"}
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				{locale === "en" ? "切换到中文" : "Switch to English"}
			</TooltipContent>
		</Tooltip>
	);
}
