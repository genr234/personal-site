import { useEffect, useRef, useState } from "preact/hooks";
import playlistData from "../../data/playlist.json";
import { useWindowHeader } from "../../lib/useWindowHeader";
import { setSfxVolume, unlockSfx } from "../../lib/vinylSfx";
import { focusedWindowId } from "../../lib/windowManager";
import {
	getYoutubeIdFromUrl,
	loadYouTubeIframeApi,
	youtubeThumbnailUrl,
} from "../../lib/youtube";
import "../WindowSystem/styles/windows/music-window.scss";
import {
	ChevronLeft,
	FastForwardIcon,
	ListMusic,
	PauseIcon,
	PlayIcon,
	Repeat,
	Repeat1,
	Shuffle,
	Volume,
	Volume1,
	Volume2,
	VolumeOff,
	X,
} from "lucide-preact";
import { Marquee } from "./music/Marquee";
import { NyanSeekBar } from "./music/NyanSeekBar";
import { Turntable } from "./music/Turntable";

interface Track {
	title: string;
	artist: string;
	video: string;
	cover?: string;
}

interface Playlist {
	id: string;
	name: string;
	tracks: Track[];
}

type RepeatMode = "all" | "one" | "off";

const playlists = playlistData.playlists as Playlist[];
const STORAGE_KEY = "genr-music-v1";
const YT_PLAYING = 1;
const YT_ENDED = 0;
const SHELF_HEADER = "#1c110b";

const trackCover = (track: Track) => {
	const id = getYoutubeIdFromUrl(track.video);
	return track.cover || (id ? youtubeThumbnailUrl(id) : "");
};

const isTouchDevice = () =>
	window.matchMedia("(pointer:coarse)").matches ||
	window.matchMedia("(hover:none)").matches;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Sleeves lean toward the cursor, with the glare following it
const tilt = (e: PointerEvent) => {
	if (e.pointerType !== "mouse") return;
	const el = e.currentTarget as HTMLElement;
	const r = el.getBoundingClientRect();
	const x = (e.clientX - r.left) / r.width - 0.5;
	const y = (e.clientY - r.top) / r.height - 0.5;
	el.style.setProperty("--rx", `${(-y * 14).toFixed(2)}deg`);
	el.style.setProperty("--ry", `${(x * 16).toFixed(2)}deg`);
	el.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
	el.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
};
const untilt = (e: PointerEvent) => {
	const el = e.currentTarget as HTMLElement;
	for (const p of ["--rx", "--ry", "--gx", "--gy"]) el.style.removeProperty(p);
};

function EqBars({ paused }: { paused: boolean }) {
	return (
		<span className={`eq-bars ${paused ? "paused" : ""}`} aria-hidden="true">
			<span />
			<span />
			<span />
		</span>
	);
}

export function MusicWindow() {
	const [currentPlaylistIdx, setCurrentPlaylistIdx] = useState(0);
	const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(0.7);
	const [isChanging, setIsChanging] = useState(false);
	const [isEntering, setIsEntering] = useState(false);
	const [showLibrary, setShowLibrary] = useState(false);
	// null = record shelf (all collections), number = open crate for that playlist
	const [openCrateIdx, setOpenCrateIdx] = useState<number | null>(null);
	const [dragOver, setDragOver] = useState(false);
	const [shuffle, setShuffle] = useState(false);
	const [repeat, setRepeat] = useState<RepeatMode>("all");
	// Needle rests on its post until the first play (and after being parked)
	const [armParked, setArmParked] = useState(true);
	// Debounced "audio is actually coming out", so brief buffering doesn't flick the needle
	const [ytPlaying, setYtPlaying] = useState(false);
	const [pulling, setPulling] = useState<string | null>(null);

	const playerHostRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<YT.Player | null>(null);
	const [playerReady, setPlayerReady] = useState(false);
	const [embedError, setEmbedError] = useState(false);
	const isPlayingRef = useRef(false);
	const volumeRef = useRef(volume);
	const fadeToken = useRef(0);
	const fadeInPending = useRef(false);
	// Arm lifted or hand on the record: playback waits for the user
	const holdRef = useRef(false);
	const scrubBase = useRef<number | null>(null);
	const restoreTime = useRef<number | null>(null);
	const ytStateRef = useRef(-1);
	const ytPlayingTimer = useRef<number>();
	const endedRef = useRef<() => void>(() => {});
	const discRefMap = useRef(new Map<string, HTMLDivElement>());
	const albumTargetRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [flyingVinyl, setFlyingVinyl] = useState<{
		cover: string;
		x: number;
		y: number;
		dx: number;
		dy: number;
		size: number;
		scale: number;
	} | null>(null);

	const currentPlaylist = playlists[currentPlaylistIdx];
	const currentTrack = currentPlaylist.tracks[currentTrackIdx];
	const currentVideoId = getYoutubeIdFromUrl(currentTrack.video);
	const currentCover = trackCover(currentTrack);
	const inCrate = showLibrary && openCrateIdx !== null;

	isPlayingRef.current = isPlaying;
	volumeRef.current = volume;

	useWindowHeader("music", {
		hidden: Boolean(isPlaying && currentVideoId),
		// Blend the title bar into the walnut record shelf while it's open
		background: showLibrary ? SHELF_HEADER : undefined,
		textColor: showLibrary ? "#f1e2d3" : undefined,
	});

	// ── YouTube volume fades: music eases in on play and out on pause ──

	const fadeVolume = (to: number, ms: number, done?: () => void) => {
		const player = playerRef.current;
		if (!player) return;
		const token = ++fadeToken.current;
		const from = player.getVolume?.() ?? to;
		const start = performance.now();
		// Timers rather than rAF so a fade still finishes in a background tab
		const step = () => {
			if (token !== fadeToken.current) return;
			const t = Math.min(1, (performance.now() - start) / ms);
			player.setVolume(Math.round(from + (to - from) * t));
			if (t < 1) window.setTimeout(step, 30);
			else done?.();
		};
		step();
	};

	const startAudio = () => {
		const player = playerRef.current;
		if (!player) return;
		fadeToken.current++;
		player.setVolume(0);
		fadeInPending.current = true; // ramps up once audio actually starts
		player.playVideo();
	};

	const stopAudio = (fadeMs = 750) => {
		const player = playerRef.current;
		if (!player) return;
		fadeInPending.current = false;
		if (fadeMs <= 0 || ytStateRef.current !== YT_PLAYING) {
			fadeToken.current++;
			player.pauseVideo();
			return;
		}
		fadeVolume(0, fadeMs, () => player.pauseVideo());
	};

	// ── Track changes ──

	const changeTrack = (playlistIdx: number, trackIdx: number) => {
		if (
			playlistIdx === currentPlaylistIdx &&
			trackIdx === currentTrackIdx &&
			isPlaying
		)
			return;

		unlockSfx();
		setIsChanging(true);
		setArmParked(false);
		stopAudio(350);

		setTimeout(() => {
			setCurrentPlaylistIdx(playlistIdx);
			setCurrentTrackIdx(trackIdx);
			setIsChanging(false);
			setIsEntering(true);
			setCurrentTime(0);
			setDuration(0);
			setIsPlaying(true);

			setTimeout(() => setIsEntering(false), 600);
		}, 400);
	};

	const nextIndex = (manual: boolean): number | null => {
		const count = currentPlaylist.tracks.length;
		if (shuffle && count > 1) {
			let n = currentTrackIdx;
			while (n === currentTrackIdx) n = Math.floor(Math.random() * count);
			return n;
		}
		if (currentTrackIdx + 1 < count) return currentTrackIdx + 1;
		return repeat === "off" && !manual ? null : 0;
	};

	const nextTrack = () => {
		const n = nextIndex(true);
		if (n !== null) changeTrack(currentPlaylistIdx, n);
	};

	const prevTrack = () => {
		// Like any player: first press restarts the song
		if (currentTime > 3) {
			seekTo(0);
			return;
		}
		const count = currentPlaylist.tracks.length;
		changeTrack(currentPlaylistIdx, (currentTrackIdx - 1 + count) % count);
	};

	endedRef.current = () => {
		const player = playerRef.current;
		if (repeat === "one" && player) {
			player.seekTo(0, true);
			player.playVideo();
			return;
		}
		const n = nextIndex(false);
		if (n === null) {
			// End of the record: the arm returns home
			setIsPlaying(false);
			setArmParked(true);
			player?.seekTo(0, true);
			player?.pauseVideo();
			setCurrentTime(0);
			return;
		}
		changeTrack(currentPlaylistIdx, n);
	};

	const seekTo = (seconds: number) => {
		const player = playerRef.current;
		const d = duration || player?.getDuration() || 0;
		const t = clamp(seconds, 0, d || seconds);
		player?.seekTo(t, true);
		setCurrentTime(t);
	};

	const togglePlay = () => {
		unlockSfx();
		if (!isPlaying) setArmParked(false);
		setIsPlaying(!isPlaying);
	};

	// ── Shelf → turntable ──

	const launchVinyl = (key: string, cover: string) => {
		const fromEl = discRefMap.current.get(key);
		const toEl = albumTargetRef.current?.querySelector<HTMLElement>(".turntable");
		const container = containerRef.current;
		if (!fromEl || !toEl || !container) return;
		// Centers relative to the player, so window transforms don't skew the flight
		const origin = container.getBoundingClientRect();
		const center = (r: DOMRect) => ({
			x: r.left + r.width / 2 - origin.left,
			y: r.top + r.height / 2 - origin.top,
		});
		const from = center(fromEl.getBoundingClientRect());
		const to = center(toEl.getBoundingClientRect());
		const size = toEl.offsetWidth;
		setFlyingVinyl({
			cover,
			x: from.x,
			y: from.y,
			dx: to.x - from.x,
			dy: to.y - from.y,
			size,
			scale: fromEl.offsetWidth / size,
		});
	};

	const playFromCrate = (playlistIdx: number, trackIdx: number) => {
		unlockSfx();
		if (isTouchDevice()) {
			changeTrack(playlistIdx, trackIdx);
			setShowLibrary(false);
			return;
		}
		// Slide the record out of its sleeve first, then send it to the platter
		const key = `${playlistIdx}:${trackIdx}`;
		setPulling(key);
		window.setTimeout(() => {
			launchVinyl(key, trackCover(playlists[playlistIdx].tracks[trackIdx]));
			changeTrack(playlistIdx, trackIdx);
			setShowLibrary(false);
			window.setTimeout(() => setPulling(null), 500);
		}, 240);
	};

	const toggleLibrary = () => {
		unlockSfx();
		if (!showLibrary) setOpenCrateIdx(null);
		setShowLibrary(!showLibrary);
	};

	const handleDragStart = (
		e: DragEvent,
		playlistIdx: number,
		trackIdx: number,
	) => {
		e.dataTransfer?.setData(
			"application/json",
			JSON.stringify({ playlistIdx, trackIdx }),
		);
		setShowLibrary(false); // Reveal the turntable to drop onto
	};

	const handleDragOver = (e: DragEvent) => {
		e.preventDefault();
		setDragOver(true);
	};

	const handleDrop = (e: DragEvent) => {
		e.preventDefault();
		setDragOver(false);

		const dataStr = e.dataTransfer?.getData("application/json");
		if (!dataStr) return;
		try {
			const data = JSON.parse(dataStr);
			if (data.playlistIdx !== undefined && data.trackIdx !== undefined) {
				changeTrack(data.playlistIdx, data.trackIdx);
			}
		} catch (error) {
			console.error("Error parsing drop data:", error);
		}
	};

	// ── Hands on the turntable ──

	const handleArmLift = () => {
		unlockSfx();
		holdRef.current = true;
		stopAudio(0); // lifting the needle cuts the sound; the platter keeps turning
	};

	const handleArmDrop = (fraction: number) => {
		holdRef.current = false;
		setArmParked(false);
		const d = duration || playerRef.current?.getDuration() || 0;
		if (d > 0) seekTo(fraction * d);
		if (isPlaying) startAudio();
		else setIsPlaying(true);
	};

	const handleArmPark = () => {
		holdRef.current = false;
		setArmParked(true);
		setIsPlaying(false);
	};

	const handleGrab = () => {
		unlockSfx();
		holdRef.current = true;
		scrubBase.current = playerRef.current?.getCurrentTime() ?? currentTime;
		stopAudio(0); // a hand on the platter stops the music dead
	};

	const handleScrub = (seconds: number) => {
		if (scrubBase.current === null) return;
		const d = duration || playerRef.current?.getDuration() || 0;
		setCurrentTime(clamp(scrubBase.current + seconds, 0, d || Infinity));
	};

	const handleRelease = (seconds: number) => {
		holdRef.current = false;
		if (scrubBase.current !== null && Math.abs(seconds) > 0.05) {
			seekTo(scrubBase.current + seconds);
		}
		scrubBase.current = null;
		if (isPlaying) startAudio();
	};

	// ── YouTube player ──

	useEffect(() => {
		let cancelled = false;
		const host = playerHostRef.current;
		if (!host) return;

		loadYouTubeIframeApi()
			.then(() => {
				if (cancelled || playerRef.current || !playerHostRef.current) return;
				playerRef.current = new YT.Player(playerHostRef.current, {
					playerVars: {
						autoplay: 0,
						controls: 0,
						disablekb: 1,
						fs: 0,
						modestbranding: 1,
						playsinline: 1,
						rel: 0,
						iv_load_policy: 3,
						origin: window.location.origin,
					},
					events: {
						onReady: () => {
							setPlayerReady(true);
							setEmbedError(false);
						},
						onStateChange: (event) => {
							ytStateRef.current = event.data;
							window.clearTimeout(ytPlayingTimer.current);
							if (event.data === YT_PLAYING) {
								setYtPlaying(true);
								setDuration(event.target.getDuration() || 0);
								if (fadeInPending.current) {
									fadeInPending.current = false;
									fadeVolume(volumeRef.current * 100, 450);
								}
							} else {
								ytPlayingTimer.current = window.setTimeout(() => {
									if (ytStateRef.current !== YT_PLAYING) setYtPlaying(false);
								}, 300);
							}
							if (event.data === YT_ENDED) endedRef.current();
						},
						onError: () => {
							setEmbedError(true);
							setIsPlaying(false);
						},
					},
				});
			})
			.catch(() => {
				if (!cancelled) setEmbedError(true);
			});

		return () => {
			cancelled = true;
			fadeToken.current++;
			setPlayerReady(false);
			playerRef.current?.destroy();
			playerRef.current = null;
		};
	}, []);

	// Load (or cue) the current track
	useEffect(() => {
		const player = playerRef.current;
		if (!player || !playerReady || !currentVideoId) return;
		setEmbedError(false);
		const startSeconds = restoreTime.current ?? 0;
		restoreTime.current = null;
		if (isPlayingRef.current && !holdRef.current) {
			fadeToken.current++;
			player.setVolume(0);
			fadeInPending.current = true;
			player.loadVideoById(currentVideoId, startSeconds);
		} else {
			player.cueVideoById(currentVideoId, startSeconds);
		}
		setCurrentTime(startSeconds);
	}, [currentVideoId, playerReady]);

	// Play / pause with the fades
	useEffect(() => {
		if (!playerReady || isChanging || holdRef.current) return;
		if (isPlaying) startAudio();
		else stopAudio();
	}, [isPlaying, playerReady, isChanging]);

	useEffect(() => {
		const player = playerRef.current;
		if (player && playerReady && ytStateRef.current === YT_PLAYING) {
			fadeToken.current++;
			player.setVolume(Math.round(volume * 100));
		}
		setSfxVolume(volume);
	}, [volume]);

	// Poll position (the embed has no time events)
	useEffect(() => {
		if (!playerReady) return;
		const id = window.setInterval(() => {
			const player = playerRef.current;
			if (!player || scrubBase.current !== null) return;
			if (ytStateRef.current !== YT_PLAYING) return;
			setCurrentTime(player.getCurrentTime() || 0);
			const d = player.getDuration() || 0;
			if (d) setDuration(d);
		}, 250);
		return () => window.clearInterval(id);
	}, [playerReady]);

	// ── Remember the last song, position and settings between visits ──

	const saveRef = useRef(() => {});
	saveRef.current = () => {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					playlistId: currentPlaylist.id,
					video: currentTrack.video,
					time: playerRef.current?.getCurrentTime?.() ?? currentTime,
					volume,
					shuffle,
					repeat,
				}),
			);
		} catch {
			// Storage blocked (private mode etc.): nothing to remember
		}
	};

	useEffect(() => {
		try {
			const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
			if (!saved) return;
			const pIdx = playlists.findIndex((p) => p.id === saved.playlistId);
			const tIdx = pIdx >= 0 ? playlists[pIdx].tracks.findIndex((t) => t.video === saved.video) : -1;
			if (pIdx >= 0 && tIdx >= 0) {
				setCurrentPlaylistIdx(pIdx);
				setCurrentTrackIdx(tIdx);
				if (saved.time > 0) {
					restoreTime.current = saved.time;
					setCurrentTime(saved.time);
				}
			}
			if (typeof saved.volume === "number") setVolume(clamp(saved.volume, 0, 1));
			if (typeof saved.shuffle === "boolean") setShuffle(saved.shuffle);
			if (["all", "one", "off"].includes(saved.repeat)) setRepeat(saved.repeat);
		} catch {
			// Unreadable storage: start fresh
		}
	}, []);

	useEffect(() => {
		saveRef.current();
	}, [currentPlaylistIdx, currentTrackIdx, volume, shuffle, repeat]);

	useEffect(() => {
		const id = window.setInterval(() => {
			if (isPlayingRef.current) saveRef.current();
		}, 5000);
		const onHide = () => saveRef.current();
		window.addEventListener("pagehide", onHide);
		return () => {
			window.clearInterval(id);
			window.removeEventListener("pagehide", onHide);
			saveRef.current();
		};
	}, []);

	// ── OS media controls (lock screen, media keys) ──

	const actionsRef = useRef({ togglePlay, nextTrack, prevTrack, seekTo, currentTime });
	actionsRef.current = { togglePlay, nextTrack, prevTrack, seekTo, currentTime };

	useEffect(() => {
		if (!("mediaSession" in navigator)) return;
		const ms = navigator.mediaSession;
		const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
			["play", () => !isPlayingRef.current && actionsRef.current.togglePlay()],
			["pause", () => isPlayingRef.current && actionsRef.current.togglePlay()],
			["nexttrack", () => actionsRef.current.nextTrack()],
			["previoustrack", () => actionsRef.current.prevTrack()],
			["seekto", (d) => d.seekTime !== undefined && actionsRef.current.seekTo(d.seekTime)],
			["seekbackward", (d) => actionsRef.current.seekTo(actionsRef.current.currentTime - (d.seekOffset ?? 10))],
			["seekforward", (d) => actionsRef.current.seekTo(actionsRef.current.currentTime + (d.seekOffset ?? 10))],
		];
		for (const [action, handler] of handlers) {
			try {
				ms.setActionHandler(action, handler);
			} catch {
				// Action not supported by this browser
			}
		}
		return () => {
			for (const [action] of handlers) {
				try {
					ms.setActionHandler(action, null);
				} catch {}
			}
		};
	}, []);

	useEffect(() => {
		if (!("mediaSession" in navigator)) return;
		navigator.mediaSession.metadata = new MediaMetadata({
			title: currentTrack.title,
			artist: currentTrack.artist,
			album: currentPlaylist.name,
			artwork: currentCover ? [{ src: currentCover, sizes: "640x640" }] : [],
		});
	}, [currentTrack, currentPlaylist, currentCover]);

	useEffect(() => {
		if (!("mediaSession" in navigator)) return;
		navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
	}, [isPlaying]);

	useEffect(() => {
		if (!("mediaSession" in navigator) || duration <= 0) return;
		try {
			navigator.mediaSession.setPositionState({
				duration,
				playbackRate: 1,
				position: clamp(currentTime, 0, duration),
			});
		} catch {}
	}, [Math.floor(currentTime), duration]);

	// ── Keyboard shortcuts while the music window is focused ──

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (focusedWindowId.value !== "music" || e.metaKey || e.ctrlKey || e.altKey) return;
			const target = e.target as HTMLElement | null;
			if (target?.closest("input, textarea, select, button, [contenteditable]")) return;
			const a = actionsRef.current;
			if (e.key === " " || e.key === "k") {
				e.preventDefault();
				a.togglePlay();
			} else if (e.key === "ArrowRight") {
				e.preventDefault();
				if (e.shiftKey) a.nextTrack();
				else a.seekTo(a.currentTime + 5);
			} else if (e.key === "ArrowLeft") {
				e.preventDefault();
				if (e.shiftKey) a.prevTrack();
				else a.seekTo(a.currentTime - 5);
			} else if (e.key === "Escape") {
				setShowLibrary(false);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const handleVolumeChange = (e: Event) => {
		const target = e.target as HTMLInputElement;
		setVolume(Number(target.value));
	};

	const getVolumeRange = (volume: number) => {
		if (volume === undefined || volume === 0) return <VolumeOff />;
		if (volume <= 0.33) return <Volume />;
		if (volume <= 0.66) return <Volume1 />;
		return <Volume2 />;
	};

	const cycleRepeat = () =>
		setRepeat((r) => (r === "all" ? "one" : r === "one" ? "off" : "all"));

	const renderShelf = () => (
		<div className="library-view shelf-view" key="shelf">
			<header className="library-header">
				<h3 className="library-title">record shelf</h3>
			</header>

			<div className="collection-grid">
				{playlists.map((playlist, pIdx) => {
					const covers = playlist.tracks.slice(0, 3).map(trackCover);
					const isActive = currentPlaylistIdx === pIdx;
					return (
						<div
							key={playlist.id}
							role="button"
							tabIndex={0}
							className={`collection ${isActive ? "active" : ""} ${isActive && isPlaying ? "playing" : ""}`}
							style={{ "--i": pIdx } as unknown as Record<string, string>}
							onClick={() => setOpenCrateIdx(pIdx)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									setOpenCrateIdx(pIdx);
								}
							}}
						>
							<div className="collection-stack">
								<div
									className="stack-frame"
									onPointerMove={tilt}
									onPointerLeave={untilt}
								>
									{covers.map((cover, i) => (
										<div
											key={cover + i}
											className={`stack-sleeve stack-sleeve-${i}`}
										>
											<img src={cover} alt="" loading="lazy" />
										</div>
									))}
									<div
										className="stack-disc"
										style={{ "--label": `url(${covers[0]})` } as unknown as Record<string, string>}
									/>
								</div>
							</div>
							<div className="collection-meta">
								<span className="collection-name">
									<span>{playlist.name}</span>
									{isActive && <EqBars paused={!isPlaying} />}
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);

	const renderCrate = (pIdx: number) => {
		const playlist = playlists[pIdx];
		const isThisPlaylist = currentPlaylistIdx === pIdx;
		return (
			<div className="library-view crate-view" key={`crate-${pIdx}`}>
				<header className="crate-header">
					<button
						type="button"
						className="crate-back"
						onClick={() => setOpenCrateIdx(null)}
					>
						<ChevronLeft size={16} /> shelf
					</button>
					<div className="crate-heading">
						<div>
							<h3 className="library-title">{playlist.name}</h3>
							<p className="library-meta">
								{playlist.tracks.length} records
							</p>
						</div>
						<button
							type="button"
							className="crate-play"
							onClick={() => {
								if (isThisPlaylist && isPlaying) {
									setIsPlaying(false);
								} else if (isThisPlaylist) {
									togglePlay();
									setShowLibrary(false);
								} else {
									const start = shuffle
										? Math.floor(Math.random() * playlist.tracks.length)
										: 0;
									playFromCrate(pIdx, start);
								}
							}}
							aria-label={
								isThisPlaylist && isPlaying ? "Pause" : `Play ${playlist.name}`
							}
						>
							{isThisPlaylist && isPlaying ? <PauseIcon /> : <PlayIcon />}
						</button>
					</div>
				</header>

				<div className="record-grid">
					{playlist.tracks.map((track, tIdx) => {
						const isNowPlaying = isThisPlaylist && currentTrackIdx === tIdx;
						const cover = trackCover(track);
						const key = `${pIdx}:${tIdx}`;
						return (
							<div
								key={track.video}
								role="button"
								tabIndex={0}
								className={`record ${isNowPlaying ? "now-playing" : ""} ${isNowPlaying && isPlaying ? "spinning" : ""} ${pulling === key ? "pulling" : ""}`}
								style={{ "--i": tIdx } as unknown as Record<string, string>}
								draggable={true}
								onDragStart={(e) => handleDragStart(e, pIdx, tIdx)}
								onDragEnd={() => setDragOver(false)}
								onClick={() => playFromCrate(pIdx, tIdx)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										playFromCrate(pIdx, tIdx);
									}
								}}
							>
								<div
									className="record-sleeve"
									onPointerMove={tilt}
									onPointerLeave={untilt}
								>
									<div
										className="record-disc"
										ref={(el) => {
											if (el) discRefMap.current.set(key, el);
											else discRefMap.current.delete(key);
										}}
										style={{ "--label": `url(${cover})` } as unknown as Record<string, string>}
									/>
									<div className="record-cover">
										<img src={cover} alt={track.title} loading="lazy" />
										{isNowPlaying && (
											<span className="record-now">
												<EqBars paused={!isPlaying} />
											</span>
										)}
									</div>
								</div>
								<span className="record-title">{track.title}</span>
								<span className="record-artist">{track.artist}</span>
							</div>
						);
					})}
				</div>
			</div>
		);
	};

	return (
		<div
			className="music-player-container"
			ref={containerRef}
		>
			<button
				type="button"
				// Playlist views close via "shelf", so the toggle only shows on the shelf and player
				className={`playlist-toggle ${inCrate ? "hidden" : ""}`}
				tabIndex={inCrate ? -1 : undefined}
				aria-hidden={inCrate}
				onClick={toggleLibrary}
				aria-label={showLibrary ? "Close record shelf" : "Open record shelf"}
			>
				{showLibrary ? <X /> : <ListMusic />}
			</button>

			<div
				className={`record-library ${showLibrary ? "visible" : ""}`}
				aria-hidden={!showLibrary}
			>
				{openCrateIdx === null ? renderShelf() : renderCrate(openCrateIdx)}
			</div>

			<div
				className={`player-video-bg ${isPlaying && currentVideoId ? "playing" : ""}`}
				aria-hidden="true"
			>
				<div ref={playerHostRef} />
			</div>

			{flyingVinyl && (
				<div
					className="flying-vinyl"
					style={
						{
							"--from-x": `${flyingVinyl.x}px`,
							"--from-y": `${flyingVinyl.y}px`,
							"--dx": `${flyingVinyl.dx}px`,
							"--dy": `${flyingVinyl.dy}px`,
							"--size": `${flyingVinyl.size}px`,
							"--s0": flyingVinyl.scale,
							"--label": `url(${flyingVinyl.cover})`,
						} as unknown as Record<string, string>
					}
					onAnimationEnd={() => setFlyingVinyl(null)}
				/>
			)}

			<div
				className={`player-body ${dragOver ? "drag-over" : ""}`}
				onDragOver={handleDragOver}
				onDragLeave={() => setDragOver(false)}
				onDrop={handleDrop}
			>
				<div className="album-art-container" ref={albumTargetRef}>
					<Turntable
						cover={currentCover}
						motorOn={isPlaying && !isChanging}
						needleDown={ytPlaying && !armParked}
						armParked={armParked}
						progress={duration > 0 ? currentTime / duration : 0}
						isChanging={isChanging}
						isEntering={isEntering}
						onArmLift={handleArmLift}
						onArmDrop={handleArmDrop}
						onArmPark={handleArmPark}
						onGrab={handleGrab}
						onScrub={handleScrub}
						onRelease={handleRelease}
					/>
				</div>

				<div className="track-info">
					<Marquee className="track-title">{currentTrack.title}</Marquee>
					<p className="track-artist">
						{currentTrack.artist}
						<span className="track-source"> · {currentPlaylist.name}</span>
					</p>
					{embedError && (
						<p className="track-embed-error">
							This track can’t play here.{" "}
							<a
								href={currentTrack.video}
								target="_blank"
								rel="noreferrer"
							>
								Open on YouTube
							</a>
						</p>
					)}
				</div>

				<div className="controls-area">
					<NyanSeekBar
						currentTime={currentTime}
						duration={duration}
						onSeek={(f) => {
							const d = duration || playerRef.current?.getDuration() || 0;
							if (d > 0) seekTo(f * d);
						}}
					/>

					<div className="main-controls">
						<button
							type="button"
							className={`control-btn mode-btn ${shuffle ? "active" : ""}`}
							onClick={() => setShuffle(!shuffle)}
							aria-label="Shuffle"
							aria-pressed={shuffle}
							title={shuffle ? "Shuffle on" : "Shuffle off"}
						>
							<Shuffle />
						</button>
						<button
							type="button"
							className="control-btn prev-btn"
							onClick={prevTrack}
							aria-label="Previous"
						>
							<FastForwardIcon style={{ transform: "rotate(-180deg)" }} />
						</button>
						<button
							type="button"
							className={`control-btn play-btn ${isPlaying ? "playing" : ""}`}
							onClick={togglePlay}
							aria-label={isPlaying ? "Pause" : "Play"}
						>
							{isPlaying ? <PauseIcon /> : <PlayIcon />}
						</button>
						<button
							type="button"
							className="control-btn next-btn"
							onClick={nextTrack}
							aria-label="Next"
						>
							<FastForwardIcon />
						</button>
						<button
							type="button"
							className={`control-btn mode-btn ${repeat !== "off" ? "active" : ""}`}
							onClick={cycleRepeat}
							aria-label={`Repeat: ${repeat}`}
							title={
								repeat === "all"
									? "Repeat playlist"
									: repeat === "one"
										? "Repeat this song"
										: "Repeat off"
							}
						>
							{repeat === "one" ? <Repeat1 /> : <Repeat />}
						</button>
					</div>

					<div className="volume-control">
						<span className="vol-icon">{getVolumeRange(volume)}</span>
						<input
							type="range"
							className="volume-slider"
							min="0"
							max="1"
							step="0.05"
							value={volume}
							onInput={handleVolumeChange}
							aria-label="Volume"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
