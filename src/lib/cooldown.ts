export const MAX_COOL_MS = 7000;

/** temperature 50 → 0ms、temperature 100 → MAX_COOL_MS */
export function cooldownMs(temp: number): number {
	const t = Math.max(0, Math.min(1, (temp - 50) / 50));
	return Math.round(t * MAX_COOL_MS);
}

/** 0=青, 50=amber, 100=赤 の HSL 補間 */
export function tempColor(temp: number): string {
	const t = Math.max(0, Math.min(1, temp / 100));
	const hue = Math.round(220 - t * 220);
	return `hsl(${hue}, 90%, 55%)`;
}

export function formatMs(ms: number): string {
	return `${(ms / 1000).toFixed(1)}s`;
}
