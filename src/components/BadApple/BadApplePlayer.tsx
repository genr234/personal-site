import { useEffect, useRef, useState } from "preact/hooks";
import {
	badAppleError,
	badApplePlaying,
} from "../../lib/badApple/state";
import type {
	BadAppleSchedule,
	DecodedTrack,
	EncodedTrack,
	TrackKeyframe,
} from "../../lib/badApple/types";
import styles from "./bad-apple.module.scss";
import windowStyles from "../WindowSystem/styles/window.module.scss";

const SCHEDULE_URL = "/bad-apple/schedule.json";
const AUDIO_URL = "/bad-apple/audio.webm";
const HARD_WINDOW_CAP = 250;

interface PreparedSchedule {
	schedule: BadAppleSchedule;
	tracks: DecodedTrack[];
	starts: DecodedTrack[][];
	ends: DecodedTrack[][];
}

function decodeTrack(track: EncodedTrack): DecodedTrack {
	let frame = track.startFrame;
	let [x, y, width, height] = track.initial;
	const keyframes: TrackKeyframe[] = [{ frame, x, y, width, height }];
	for (const [frameDelta, xDelta, yDelta, widthDelta, heightDelta] of track.keyframes) {
		frame += frameDelta;
		x += xDelta;
		y += yDelta;
		width += widthDelta;
		height += heightDelta;
		keyframes.push({ frame, x, y, width, height });
	}
	return { id: track.id, startFrame: track.startFrame, endFrame: track.endFrame, keyframes };
}

function interpolateTrack(track: DecodedTrack, frame: number): TrackKeyframe {
	const keyframes = track.keyframes;
	if (frame <= keyframes[0].frame) return keyframes[0];
	const last = keyframes[keyframes.length - 1];
	if (frame >= last.frame) return last;

	let low = 0;
	let high = keyframes.length - 1;
	while (low + 1 < high) {
		const middle = (low + high) >> 1;
		if (keyframes[middle].frame <= frame) low = middle;
		else high = middle;
	}
	const from = keyframes[low];
	const to = keyframes[high];
	const progress = (frame - from.frame) / (to.frame - from.frame);
	return {
		frame,
		x: from.x + (to.x - from.x) * progress,
		y: from.y + (to.y - from.y) * progress,
		width: from.width + (to.width - from.width) * progress,
		height: from.height + (to.height - from.height) * progress,
	};
}

function prepareSchedule(schedule: BadAppleSchedule): PreparedSchedule {
	if (
		schedule.meta.version !== 1 ||
		schedule.meta.frameCount <= 0 ||
		schedule.meta.peakWindows > HARD_WINDOW_CAP
	) {
		throw new Error("playback data is invalid");
	}
	const tracks = schedule.tracks.map(decodeTrack);
	const starts = Array.from({ length: schedule.meta.frameCount }, () => [] as DecodedTrack[]);
	const ends = Array.from({ length: schedule.meta.frameCount }, () => [] as DecodedTrack[]);
	for (const track of tracks) {
		starts[track.startFrame]?.push(track);
		ends[track.endFrame]?.push(track);
	}
	return { schedule, tracks, starts, ends };
}

export function BadApplePlayer() {
	const audioRef = useRef<HTMLAudioElement>(null);
	const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
	const preparedRef = useRef<PreparedSchedule | null>(null);
	const animationRef = useRef<number | null>(null);
	const activeRef = useRef(new Map<number, DecodedTrack>());
	const assignmentsRef = useRef(new Map<number, number>());
	const freeNodesRef = useRef<number[]>([]);
	const lastFrameRef = useRef(-1);
	const [visible, setVisible] = useState(false);

	const clearNodes = () => {
		for (const node of nodeRefs.current) {
			if (node) node.style.display = "none";
		}
		activeRef.current.clear();
		assignmentsRef.current.clear();
		freeNodesRef.current = Array.from(
			{ length: HARD_WINDOW_CAP },
			(_, index) => HARD_WINDOW_CAP - index - 1,
		);
		lastFrameRef.current = -1;
	};

	const stop = () => {
		if (animationRef.current !== null) {
			cancelAnimationFrame(animationRef.current);
			animationRef.current = null;
		}
		const audio = audioRef.current;
		if (audio) {
			audio.pause();
			audio.currentTime = 0;
		}
		clearNodes();
		setVisible(false);
		badApplePlaying.value = false;
	};

	const render = () => {
		const audio = audioRef.current;
		const prepared = preparedRef.current;
		if (!audio || !prepared || audio.paused || audio.ended) return;
		const { schedule, starts, ends } = prepared;
		const exactFrame = Math.min(
			audio.currentTime * schedule.meta.fps,
			schedule.meta.frameCount - 1,
		);
		const frame = Math.floor(exactFrame);

		if (frame < lastFrameRef.current) {
			clearNodes();
		}
		for (let cursor = lastFrameRef.current + 1; cursor <= frame; cursor++) {
			for (const track of starts[cursor] ?? []) {
				const nodeIndex = freeNodesRef.current.pop();
				if (nodeIndex === undefined) continue;
				activeRef.current.set(track.id, track);
				assignmentsRef.current.set(track.id, nodeIndex);
			}
			if (cursor > 0) {
				for (const track of ends[cursor - 1] ?? []) {
					activeRef.current.delete(track.id);
					const nodeIndex = assignmentsRef.current.get(track.id);
					if (nodeIndex !== undefined) {
						assignmentsRef.current.delete(track.id);
						freeNodesRef.current.push(nodeIndex);
						const node = nodeRefs.current[nodeIndex];
						if (node) node.style.display = "none";
					}
				}
			}
		}
		lastFrameRef.current = frame;

		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const scale = Math.min(
			viewportWidth / schedule.meta.gridWidth,
			viewportHeight / schedule.meta.gridHeight,
		);
		const offsetX = (viewportWidth - schedule.meta.gridWidth * scale) / 2;
		const offsetY = (viewportHeight - schedule.meta.gridHeight * scale) / 2;

		for (const [id, track] of activeRef.current) {
			const nodeIndex = assignmentsRef.current.get(id);
			if (nodeIndex === undefined) continue;
			const node = nodeRefs.current[nodeIndex];
			if (!node) continue;
			const state = interpolateTrack(track, exactFrame);
			node.style.display = "block";
			node.style.setProperty("--bad-apple-width", `${state.width * scale}px`);
			node.style.setProperty("--bad-apple-height", `${state.height * scale}px`);
			node.style.transform = `translate3d(${offsetX + state.x * scale}px, ${offsetY + state.y * scale}px, 0)`;
		}
		animationRef.current = requestAnimationFrame(render);
	};

	const start = async () => {
		badAppleError.value = null;
		try {
			if (!preparedRef.current) {
				const response = await fetch(SCHEDULE_URL);
				if (!response.ok) throw new Error("playback assets are unavailable");
				preparedRef.current = prepareSchedule(
					(await response.json()) as BadAppleSchedule,
				);
			}
			const audio = audioRef.current;
			if (!audio) return;
			clearNodes();
			setVisible(true);
			audio.src = AUDIO_URL;
			audio.currentTime = 0;
			await audio.play();
			badApplePlaying.value = true;
			animationRef.current = requestAnimationFrame(render);
		} catch (error) {
			stop();
			badAppleError.value =
				error instanceof Error ? error.message : "playback failed";
		}
	};

	useEffect(() => {
		freeNodesRef.current = Array.from(
			{ length: HARD_WINDOW_CAP },
			(_, index) => HARD_WINDOW_CAP - index - 1,
		);
		const toggle = () => {
			if (badApplePlaying.value) stop();
			else void start();
		};
		const escape = (event: KeyboardEvent) => {
			if (event.key === "Escape" && badApplePlaying.value) stop();
		};
		window.addEventListener("bad-apple:toggle", toggle);
		window.addEventListener("keydown", escape);
		return () => {
			window.removeEventListener("bad-apple:toggle", toggle);
			window.removeEventListener("keydown", escape);
			stop();
		};
	}, []);

	return (
		<>
			<audio ref={audioRef} preload="auto" onEnded={stop} />
			<div
				class={[styles.stage, visible && styles.stageVisible].filter(Boolean).join(" ")}
				aria-hidden="true"
			>
				{Array.from({ length: HARD_WINDOW_CAP }, (_, index) => (
					<div
						key={index}
						ref={(node) => {
							nodeRefs.current[index] = node;
						}}
						class={`${windowStyles.window} ${styles.shapeWindow}`}
					>
						<header class={windowStyles.windowHeader}>
							<div class={windowStyles.headerLeft} />
							<div class={windowStyles.headerRight}>
								<button
									type="button"
									class={windowStyles.minimizeButton}
									tabIndex={-1}
									aria-hidden="true"
								>
									–
								</button>
								<button
									type="button"
									class={windowStyles.closeButton}
									tabIndex={-1}
									aria-hidden="true"
								>
									×
								</button>
							</div>
						</header>
						<div class={windowStyles.windowContent}>
							<div class={styles.windowBody} />
						</div>
					</div>
				))}
			</div>
			{badAppleError.value && (
				<div class={styles.error} role="status">
					{badAppleError.value}
				</div>
			)}
		</>
	);
}
