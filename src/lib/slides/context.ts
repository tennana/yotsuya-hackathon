import { getContext, setContext } from 'svelte';

const KEY = Symbol('deck');

export interface DeckContext {
	/** Called once by each Slide at init; returns its zero-based position. */
	register: () => number;
	/** Currently visible slide index (reactive). */
	readonly current: number;
}

export function setDeckContext(ctx: DeckContext): void {
	setContext(KEY, ctx);
}

export function getDeckContext(): DeckContext {
	const ctx = getContext<DeckContext>(KEY);
	if (!ctx) throw new Error('<Slide> must be used inside <Deck>');
	return ctx;
}
