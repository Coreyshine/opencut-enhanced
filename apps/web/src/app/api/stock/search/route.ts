import { webEnv } from "@/env/web";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/auth/rate-limit";

const searchParamsSchema = z.object({
	q: z.string().max(500, "Query too long").optional(),
	type: z.enum(["videos", "photos"]).default("videos"),
	page: z.coerce.number().int().min(1).max(1000).default(1),
	per_page: z.coerce.number().int().min(1).max(80).default(24),
	orientation: z.enum(["landscape", "portrait", "square"]).optional(),
});

const pexelsVideoFileSchema = z.object({
	id: z.number(),
	quality: z.string().optional(),
	file_type: z.string().optional(),
	width: z.number().optional(),
	height: z.number().optional(),
	link: z.string().url(),
});

const pexelsVideoSchema = z.object({
	id: z.number(),
	width: z.number(),
	height: z.number(),
	duration: z.number(),
	image: z.string().url(),
	user: z.object({ name: z.string() }).passthrough().optional(),
	video_files: z.array(pexelsVideoFileSchema),
});

const pexelsPhotoSchema = z.object({
	id: z.number(),
	width: z.number(),
	height: z.number(),
	alt: z.string().optional(),
	src: z.object({
		original: z.string().url(),
		large2x: z.string().url().optional(),
		large: z.string().url().optional(),
		medium: z.string().url(),
	}),
	photographer: z.string().optional(),
});

const stockItemSchema = z.object({
	id: z.string(),
	kind: z.enum(["video", "photo"]),
	name: z.string(),
	previewUrl: z.string(),
	downloadUrl: z.string(),
	width: z.number().optional(),
	height: z.number().optional(),
	duration: z.number().optional(),
	author: z.string().optional(),
	license: z.string(),
	licenseUrl: z.string().url(),
});

const apiResponseSchema = z.object({
	configured: z.boolean(),
	page: z.number(),
	perPage: z.number(),
	total: z.number(),
	items: z.array(stockItemSchema),
});

/** Picks the best (smallest file that is still >= 720p when possible). */
function pickVideoFile({
	files,
}: {
	files: z.infer<typeof pexelsVideoFileSchema>[];
}) {
	const mp4Files = files.filter((file) => file.file_type === "video/mp4");
	const candidates = mp4Files.length > 0 ? mp4Files : files;
	if (candidates.length === 0) return null;
	const sorted = [...candidates].sort((a, b) => {
		const aScore = (a.width ?? 0) * (a.height ?? 0);
		const bScore = (b.width ?? 0) * (b.height ?? 0);
		return aScore - bScore;
	});
	const hd = sorted.find(
		(file) => (file.width ?? 0) >= 1280 || sorted.length === 1,
	);
	return hd ?? sorted[sorted.length - 1];
}

export async function GET(request: NextRequest) {
	try {
		const { limited } = await checkRateLimit({ request });
		if (limited) {
			return NextResponse.json({ error: "Too many requests" }, { status: 429 });
		}

		const apiKey = webEnv.PEXELS_API_KEY;
		if (!apiKey) {
			return NextResponse.json(
				{
					configured: false,
					error: "Stock media is not configured",
					message:
						"Set PEXELS_API_KEY in apps/web/.env.local with a free key from https://www.pexels.com/api/ to enable the stock panel.",
				},
				{ status: 501 },
			);
		}

		const { searchParams } = new URL(request.url);
		const validationResult = searchParamsSchema.safeParse({
			q: searchParams.get("q") || undefined,
			type: searchParams.get("type") || undefined,
			page: searchParams.get("page") || undefined,
			per_page: searchParams.get("per_page") || undefined,
			orientation: searchParams.get("orientation") || undefined,
		});

		if (!validationResult.success) {
			return NextResponse.json(
				{ error: "Invalid parameters" },
				{ status: 400 },
			);
		}

		const { q: query, type, page, per_page: perPage, orientation } =
			validationResult.data;

		const params = new URLSearchParams({
			per_page: perPage.toString(),
			page: page.toString(),
		});
		if (query) params.set("query", query);
		if (orientation) params.set("orientation", orientation);

		const endpoint =
			type === "videos"
				? `https://api.pexels.com/videos/search?${params.toString()}`
				: `https://api.pexels.com/v1/search?${params.toString()}`;

		// Every item on Pexels is distributed under the Pexels License
		// (free for commercial use, no attribution required). Surfaced
		// per-item so the UI can always show what applies.
		const license = "Pexels License";
		const licenseUrl = "https://www.pexels.com/license/";

		const response = await fetch(endpoint, {
			headers: { Authorization: apiKey },
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Pexels API error:", response.status, errorText);
			return NextResponse.json(
				{ error: "Failed to search stock media" },
				{ status: response.status },
			);
		}

		const rawData = await response.json();
		const items: z.infer<typeof stockItemSchema>[] = [];
		let total = 0;

		if (type === "videos") {
			const parsed = z
				.object({
					total_results: z.number(),
					videos: z.array(pexelsVideoSchema),
				})
				.safeParse(rawData);
			if (!parsed.success) {
				return NextResponse.json(
					{ error: "Invalid response from Pexels" },
					{ status: 502 },
				);
			}
			total = parsed.data.total_results;
			for (const video of parsed.data.videos) {
				const file = pickVideoFile({ files: video.video_files });
				if (!file) continue;
				items.push({
					id: `pexels-video-${video.id}`,
					kind: "video",
					name: `Pexels ${video.id}`,
					previewUrl: video.image,
					downloadUrl: file.link,
					width: file.width ?? video.width,
					height: file.height ?? video.height,
					duration: video.duration,
					author: video.user?.name,
					license,
					licenseUrl,
				});
			}
		} else {
			const parsed = z
				.object({
					total_results: z.number(),
					photos: z.array(pexelsPhotoSchema),
				})
				.safeParse(rawData);
			if (!parsed.success) {
				return NextResponse.json(
					{ error: "Invalid response from Pexels" },
					{ status: 502 },
				);
			}
			total = parsed.data.total_results;
			for (const photo of parsed.data.photos) {
				items.push({
					id: `pexels-photo-${photo.id}`,
					kind: "photo",
					name: photo.alt?.slice(0, 60) || `Pexels ${photo.id}`,
					previewUrl: photo.src.medium,
					downloadUrl: photo.src.original,
					width: photo.width,
					height: photo.height,
					author: photo.photographer,
					license,
					licenseUrl,
				});
			}
		}

		const responseData = {
			configured: true,
			page,
			perPage,
			total,
			items,
		};

		const responseValidation = apiResponseSchema.safeParse(responseData);
		if (!responseValidation.success) {
			return NextResponse.json(
				{ error: "Internal response formatting error" },
				{ status: 500 },
			);
		}

		return NextResponse.json(responseValidation.data);
	} catch (error) {
		console.error("Error searching stock media:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
