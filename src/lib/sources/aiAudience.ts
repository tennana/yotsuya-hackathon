import type { SignalEvent } from '../events';

export type AiAudienceStop = () => void;

export function startAiAudience(emit: (event: SignalEvent) => void): AiAudienceStop {
	// ASSUMPTION: AI audience is a stretch goal. Keep the source slot explicit without running it.
	void emit;
	return () => {};
}
