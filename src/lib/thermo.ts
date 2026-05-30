import { CATEGORIES, type Category, type SignalEvent } from './events';

export interface ThermoOptions {
	scale?: number;
	tauMs?: number;
}

export type Temperatures = Record<Category, number>;

const DEFAULT_SCALE = 60;
const DEFAULT_TAU_MS = 45_000;

export function emptyTemperatures(): Temperatures {
	return {
		不安: 0,
		反論: 0,
		質問: 0,
		納得: 0
	};
}

export function computeTemperatures(
	events: SignalEvent[],
	now = Date.now(),
	options: ThermoOptions = {}
): Temperatures {
	const scale = options.scale ?? DEFAULT_SCALE;
	const tauMs = options.tauMs ?? DEFAULT_TAU_MS;
	const temps = emptyTemperatures();

	for (const event of events) {
		if (!event.category) continue;
		const age = Math.max(0, now - event.t);
		const heat = event.intensity * scale * Math.exp(-age / tauMs);
		temps[event.category] = Math.min(100, temps[event.category] + heat);
	}

	return temps;
}

export function categoryColor(temp: number): string {
	const clamped = Math.max(0, Math.min(100, temp));
	if (clamped < 55) {
		const ratio = clamped / 55;
		const hue = 205 - ratio * 165;
		const lightness = 48 + ratio * 6;
		return `hsl(${hue} 86% ${lightness}%)`;
	}

	const ratio = (clamped - 55) / 45;
	const hue = 40 - ratio * 36;
	return `hsl(${hue} 88% 56%)`;
}

export function categorySummary(temps: Temperatures): { category: Category; temp: number }[] {
	return CATEGORIES.map((category) => ({ category, temp: temps[category] }));
}

export function dominantCategory(temps: Temperatures): Category {
	return CATEGORIES.reduce((current, next) => (temps[next] > temps[current] ? next : current));
}
