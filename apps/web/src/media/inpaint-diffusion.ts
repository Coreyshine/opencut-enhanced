/**
 * Content-aware fill for watermark removal.
 * Jacobi iteration on the masked region: each masked pixel converges to the
 * average of its neighbors. Initialized with global average for fast convergence.
 *
 * This is the classical Laplacian inpainting approach. For typical
 * watermark-sized regions (<200x200 px) it converges in a few hundred
 * iterations with excellent results on natural backgrounds.
 */

export function inpaintDiffusion({
	rgba,
	mask,
	width,
	height,
	iterations = 500,
}: {
	rgba: Uint8ClampedArray;
	mask: Uint8Array;
	width: number;
	height: number;
	iterations?: number;
}): void {
	// Identify masked pixels.
	const isMasked = new Uint8Array(mask.length);
	let maskedCount = 0;
	for (let i = 0; i < mask.length; i++) {
		isMasked[i] = mask[i] > 0 ? 1 : 0;
		if (isMasked[i]) maskedCount++;
	}
	if (maskedCount === 0) return;

	// Phase 1: Fast initialization — fill masked pixels by scanning inward
	// from the boundary (BFS-like onion peel for a good starting point).
	initializeMaskedRegion({ rgba, isMasked, width, height });

	// Phase 2: Jacobi iterations to refine (converge to harmonic solution).
	// Read from `current`, write to `next`, then swap.
	const current = new Float32Array(rgba); // RGBA interleaved
	const next = new Float32Array(current.length);

	for (let pass = 0; pass < iterations; pass++) {
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const idx = y * width + x;
				const pi = idx * 4;
				if (!isMasked[idx]) {
					next[pi] = current[pi];
					next[pi + 1] = current[pi + 1];
					next[pi + 2] = current[pi + 2];
					next[pi + 3] = current[pi + 3];
					continue;
				}

				// Average of 4 neighbors with bounds checking
				let r = 0, g = 0, b = 0, count = 0;
				if (x > 0) { const ni = (idx - 1) * 4; r += current[ni]; g += current[ni+1]; b += current[ni+2]; count++; }
				if (x < width - 1) { const ni = (idx + 1) * 4; r += current[ni]; g += current[ni+1]; b += current[ni+2]; count++; }
				if (y > 0) { const ni = (idx - width) * 4; r += current[ni]; g += current[ni+1]; b += current[ni+2]; count++; }
				if (y < height - 1) { const ni = (idx + width) * 4; r += current[ni]; g += current[ni+1]; b += current[ni+2]; count++; }

				if (count > 0) {
					next[pi] = r / count;
					next[pi + 1] = g / count;
					next[pi + 2] = b / count;
					next[pi + 3] = 255;
				} else {
					next[pi] = current[pi];
					next[pi + 1] = current[pi + 1];
					next[pi + 2] = current[pi + 2];
					next[pi + 3] = current[pi + 3];
				}
			}
		}
		// Swap current ↔ next
		current.set(next);
	}

	// Copy result back to rgba (masked pixels only).
	for (let i = 0; i < width * height; i++) {
		if (isMasked[i]) {
			rgba[i * 4] = current[i * 4];
			rgba[i * 4 + 1] = current[i * 4 + 1];
			rgba[i * 4 + 2] = current[i * 4 + 2];
			rgba[i * 4 + 3] = 255;
		}
	}

	// Light smoothing pass on masked area.
	smoothMasked({ rgba, isMasked, width, height, radius: 1 });
}

/**
 * Fast initialization: for each masked pixel, find the nearest known pixel
 * by scanning in 4 directions and use the first found value.
 */
function initializeMaskedRegion({
	rgba,
	isMasked,
	width,
	height,
}: {
	rgba: Uint8ClampedArray;
	isMasked: Uint8Array;
	width: number;
	height: number;
}): void {
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = y * width + x;
			if (!isMasked[idx]) continue;

			const pi = idx * 4;
			// Scan left, right, up, down for nearest known pixel
			let found = false;
			for (let dist = 1; dist < Math.max(width, height) && !found; dist++) {
				// Left
				if (x - dist >= 0 && !isMasked[idx - dist]) {
					rgba[pi] = rgba[(idx - dist) * 4];
					rgba[pi + 1] = rgba[(idx - dist) * 4 + 1];
					rgba[pi + 2] = rgba[(idx - dist) * 4 + 2];
					found = true; break;
				}
				// Right
				if (x + dist < width && !isMasked[idx + dist]) {
					rgba[pi] = rgba[(idx + dist) * 4];
					rgba[pi + 1] = rgba[(idx + dist) * 4 + 1];
					rgba[pi + 2] = rgba[(idx + dist) * 4 + 2];
					found = true; break;
				}
				// Up
				if (y - dist >= 0 && !isMasked[idx - dist * width]) {
					rgba[pi] = rgba[(idx - dist * width) * 4];
					rgba[pi + 1] = rgba[(idx - dist * width) * 4 + 1];
					rgba[pi + 2] = rgba[(idx - dist * width) * 4 + 2];
					found = true; break;
				}
				// Down
				if (y + dist < height && !isMasked[idx + dist * width]) {
					rgba[pi] = rgba[(idx + dist * width) * 4];
					rgba[pi + 1] = rgba[(idx + dist * width) * 4 + 1];
					rgba[pi + 2] = rgba[(idx + dist * width) * 4 + 2];
					found = true; break;
				}
			}
			if (!found) {
				rgba[pi] = 128;
				rgba[pi + 1] = 128;
				rgba[pi + 2] = 128;
			}
		}
	}
}

function smoothMasked({
	rgba,
	isMasked,
	width,
	height,
	radius,
}: {
	rgba: Uint8ClampedArray;
	isMasked: Uint8Array;
	width: number;
	height: number;
	radius: number;
}): void {
	const original = new Uint8ClampedArray(rgba);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = y * width + x;
			if (!isMasked[idx]) continue;
			let r = 0, g = 0, b = 0, count = 0;
			for (let dy = -radius; dy <= radius; dy++) {
				for (let dx = -radius; dx <= radius; dx++) {
					const nx = x + dx;
					const ny = y + dy;
					if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
					const ni = (ny * width + nx) * 4;
					r += original[ni];
					g += original[ni + 1];
					b += original[ni + 2];
					count++;
				}
			}
			if (count > 0) {
				rgba[idx * 4] = r / count;
				rgba[idx * 4 + 1] = g / count;
				rgba[idx * 4 + 2] = b / count;
			}
		}
	}
}
