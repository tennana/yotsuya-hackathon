import type { RealtimeChannel } from '@supabase/supabase-js';
import { z } from 'zod';
import { Category, SignalEvent, type Kind, type SignalEvent as SignalEventType } from '../events';

const Classification = z.object({
	category: Category,
	intensity: z.number().min(0).max(1)
});

export type Classification = z.infer<typeof Classification>;

export function getParticipantId(): string {
	const key = 'unsaid-board-participant-id';
	const existing = localStorage.getItem(key);
	if (existing) return existing;

	const id = crypto.randomUUID();
	localStorage.setItem(key, id);
	return id;
}

export async function classifyText(text: string, kind: Kind): Promise<Classification> {
	const response = await fetch('/api/classify', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({ text, kind })
	});

	if (!response.ok) throw new Error(`classify failed: ${response.status}`);
	return Classification.parse(await response.json());
}

export function createSignalEvent(input: {
	participantId: string;
	kind: Kind;
	classification: Classification;
	text?: string;
}): SignalEventType {
	return SignalEvent.parse({
		participantId: input.participantId,
		kind: input.kind,
		category: input.classification.category,
		intensity: input.classification.intensity,
		text: input.kind === 'sent' ? input.text : undefined,
		t: Date.now()
	});
}

export async function broadcastSignal(channel: RealtimeChannel | null, event: SignalEventType) {
	if (!channel) return;
	await channel.send({
		type: 'broadcast',
		event: 'signal',
		payload: event
	});
}
