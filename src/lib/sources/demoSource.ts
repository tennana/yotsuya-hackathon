import type { SignalEvent } from '../events';

type DemoTimelineEvent = Omit<SignalEvent, 't'> & { at: number };
type Emit = (event: SignalEvent) => void;

export const DEMO_TIMELINE: DemoTimelineEvent[] = [
	{
		at: 0,
		participantId: 'demo-a',
		kind: 'sent',
		category: '納得',
		intensity: 0.3,
		text: 'なるほど、方向性は理解しました。'
	},
	{
		at: 3_200,
		participantId: 'demo-b',
		kind: 'sent',
		category: '納得',
		intensity: 0.35,
		text: 'いいと思います。進めましょう。'
	},
	{
		at: 7_400,
		participantId: 'demo-c',
		kind: 'sent',
		category: '納得',
		intensity: 0.28,
		text: '了解です。'
	},
	{
		at: 10_500,
		participantId: 'demo-d',
		kind: 'hesitation',
		category: '不安',
		intensity: 0.45
	},
	{
		at: 12_500,
		participantId: 'demo-e',
		kind: 'deleted',
		category: '反論',
		intensity: 0.52
	},
	{
		at: 15_500,
		participantId: 'demo-b',
		kind: 'sent',
		category: '納得',
		intensity: 0.22,
		text: '一旦その案で大丈夫そうです。'
	},
	{
		at: 17_200,
		participantId: 'demo-f',
		kind: 'hesitation',
		category: '反論',
		intensity: 0.56
	},
	{
		at: 20_000,
		participantId: 'demo-g',
		kind: 'deleted',
		category: '反論',
		intensity: 0.68
	},
	{
		at: 23_500,
		participantId: 'demo-h',
		kind: 'deleted',
		category: '質問',
		intensity: 0.44
	},
	{
		at: 25_500,
		participantId: 'demo-i',
		kind: 'deleted',
		category: '反論',
		intensity: 0.78
	},
	{
		at: 28_800,
		participantId: 'demo-j',
		kind: 'hesitation',
		category: '反論',
		intensity: 0.82
	},
	{
		at: 32_000,
		participantId: 'demo-a',
		kind: 'sent',
		category: '納得',
		intensity: 0.24,
		text: 'では次の議題に移りますか。'
	},
	{
		at: 34_500,
		participantId: 'demo-k',
		kind: 'deleted',
		category: '反論',
		intensity: 0.88
	},
	{
		at: 39_000,
		participantId: 'demo-l',
		kind: 'hesitation',
		category: '不安',
		intensity: 0.55
	}
];

export function createDemoSource() {
	let timers: ReturnType<typeof setTimeout>[] = [];

	function stop() {
		for (const timer of timers) clearTimeout(timer);
		timers = [];
	}

	function start(emit: Emit, onDone?: () => void) {
		stop();

		for (const item of DEMO_TIMELINE) {
			const timer = setTimeout(() => {
				emit({
					participantId: item.participantId,
					kind: item.kind,
					category: item.category,
					intensity: item.intensity,
					text: item.text,
					t: Date.now()
				});
			}, item.at);
			timers.push(timer);
		}

		const last = Math.max(...DEMO_TIMELINE.map((event) => event.at));
		timers.push(
			setTimeout(() => {
				timers = [];
				onDone?.();
			}, last + 300)
		);
	}

	return {
		start,
		stop,
		reset: start
	};
}
