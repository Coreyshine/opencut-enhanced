import { toast } from "sonner";
import { getT } from "@/i18n";

export interface MediaUploadToastResult {
	uploadedCount: number;
	assetNames?: string[];
}

function getAssetLabel({ count }: { count: number }): string {
	return count === 1 ? "media asset" : "media assets";
}


function waitForNextPaint(): Promise<void> {
	return new Promise((resolve) => {
		let settled = false;
		const finish = () => {
			if (!settled) {
				settled = true;
				resolve();
			}
		};
		// rAF stalls in occluded panes/tabs; the timeout guarantees progress.
		requestAnimationFrame(() => {
			requestAnimationFrame(finish);
		});
		setTimeout(finish, 120);
	});
}

export async function showMediaUploadToast<T extends MediaUploadToastResult>({
	filesCount,
	promise,
}: {
	filesCount: number;
	promise: Promise<T> | (() => Promise<T>);
}) {
	const t = getT();
	const run = typeof promise === "function" ? promise : () => promise;
	const label = t(getAssetLabel({ count: filesCount }));
	const toastPromise = toast.promise(async () => {
		await waitForNextPaint();
		return run();
	}, {
		loading: `${t("Uploading")} ${label}…`,
		success: ({ uploadedCount, assetNames }) => {
			if (uploadedCount === 1) {
				const assetName = assetNames?.[0];
				return assetName
					? `${assetName} ${t("has been uploaded")}`
					: t("1 media asset has been uploaded");
			}

			if (uploadedCount > 1) {
				return t("{n} media assets have been uploaded").replace(
					"{n}",
					String(uploadedCount),
				);
			}

			return t("No media assets were uploaded");
		},
		error: `${t("Failed to upload")} ${label}`,
	});

	return toastPromise.unwrap();
}
