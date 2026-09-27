// Turntable sound effects played alongside the YouTube embed. The embed's audio
// can't be processed, so physical interactions are sold with these samples instead.
// Clips live in public/sfx (CC0, see CREDITS.md there).

export type SfxName =
	| "needleDrop"
	| "needleLift"
	| "scratchShort"
	| "recordStop";

const CLIPS: Record<SfxName, { src: string; gain: number }> = {
	// Gains even out the clips' very different loudness (measured in LUFS)
	needleDrop: { src: "/sfx/needle-drop.mp3", gain: 2.2 },
	needleLift: { src: "/sfx/needle-lift.mp3", gain: 8 },
	scratchShort: { src: "/sfx/scratch-short.mp3", gain: 0.45 },
	recordStop: { src: "/sfx/record-stop.mp3", gain: 0.35 },
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let loading: Promise<void> | null = null;
const buffers = new Map<SfxName, AudioBuffer>();
let volume = 0.7;

function load() {
	if (!ctx || loading) return loading;
	const audio = ctx;
	loading = Promise.all(
		(Object.keys(CLIPS) as SfxName[]).map(async (name) => {
			try {
				const res = await fetch(CLIPS[name].src);
				buffers.set(name, await audio.decodeAudioData(await res.arrayBuffer()));
			} catch {
				// A missing clip just stays silent
			}
		}),
	).then(() => undefined);
	return loading;
}

/** Browsers only allow audio after a user gesture, so call this from one. */
export function unlockSfx() {
	if (typeof window === "undefined") return;
	if (!ctx) {
		const AudioCtx =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext })
				.webkitAudioContext;
		if (!AudioCtx) return;
		ctx = new AudioCtx();
		master = ctx.createGain();
		master.gain.value = volume;
		master.connect(ctx.destination);
	}
	if (ctx.state === "suspended") void ctx.resume();
	void load();
}

export function playSfx(
	name: SfxName,
	{ rate = 1, gain = 1 }: { rate?: number; gain?: number } = {},
) {
	if (!ctx || !master) return;
	const buffer = buffers.get(name);
	if (!buffer) return;
	const source = ctx.createBufferSource();
	source.buffer = buffer;
	source.playbackRate.value = rate;
	const g = ctx.createGain();
	g.gain.value = CLIPS[name].gain * gain;
	source.connect(g).connect(master);
	source.start();
}

/** Effects follow the player's volume so they never overpower the music. */
export function setSfxVolume(v: number) {
	volume = v;
	if (master && ctx) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
}
