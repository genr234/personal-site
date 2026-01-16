import { useEffect, useRef, useState } from "preact/hooks";
import playlistData from "../../data/playlist.json";
import { setWindowHeaderHidden } from "../../lib/windowManager";
import "../WindowSystem/styles/windows/music-window.scss";
import {
	FastForwardIcon,
	ListMusic,
	PauseIcon,
	PlayIcon,
	Volume,
	Volume1,
	Volume2,
	VolumeOff,
	X,
} from "lucide-preact";

// Types for our new data structure
interface Track {
	title: string;
	artist: string;
	cover: string;
	url: string;
	video?: string; // YouTube URL for background video
}

interface Playlist {
	id: string;
	name: string;
	description: string;
	tracks: Track[];
}

export function MusicWindow() {
	const [currentPlaylistIdx, setCurrentPlaylistIdx] = useState(0);
	const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [volume, setVolume] = useState(0.7);
	const [isChanging, setIsChanging] = useState(false);
	const [isEntering, setIsEntering] = useState(false);
	const [showPlaylist, setShowPlaylist] = useState(false);
	const [dragOver, setDragOver] = useState(false);
	const rangeRef = useRef<HTMLInputElement>(null);
	// New state for "picked up" vinyl
	const [selectedVinyl, setSelectedVinyl] = useState<{
		playlistIdx: number;
		trackIdx: number;
	} | null>(null);

	const audioRef = useRef<HTMLAudioElement>(null);
	const youtubeFrameRef = useRef<HTMLIFrameElement>(null);
	const [isYoutubeReady, setIsYoutubeReady] = useState(false);
	const lastSyncedVideoIdRef = useRef<string | null>(null);
	const vinylRefMap = useRef(new Map<string, HTMLDivElement>());
	const albumTargetRef = useRef<HTMLDivElement>(null);
	const [flyingVinyl, setFlyingVinyl] = useState<{
		cover: string;
		from: DOMRect;
		to: DOMRect;
	} | null>(null);

	const currentPlaylist = playlistData.playlists[
		currentPlaylistIdx
	] as Playlist;
	const currentTrack = currentPlaylist.tracks[currentTrackIdx];

	const getYoutubeIdFromUrl = (url?: string) => {
		if (!url) return null;
		try {
			const parsed = new URL(url);
			if (parsed.hostname === "youtu.be") {
				const id = parsed.pathname.replace(/^\//, "");
				return id || null;
			}
			const v = parsed.searchParams.get("v");
			if (v) return v;
			const pathParts = parsed.pathname.split("/").filter(Boolean);
			const embedIdx = pathParts.indexOf("embed");
			if (embedIdx >= 0 && pathParts[embedIdx + 1])
				return pathParts[embedIdx + 1];
			const shortsIdx = pathParts.indexOf("shorts");
			if (shortsIdx >= 0 && pathParts[shortsIdx + 1])
				return pathParts[shortsIdx + 1];
			return null;
		} catch {
			return null;
		}
	};

	const currentVideoId = getYoutubeIdFromUrl(currentTrack.video);

	const changeTrack = (playlistIdx: number, trackIdx: number) => {
		if (
			playlistIdx === currentPlaylistIdx &&
			trackIdx === currentTrackIdx &&
			isPlaying
		)
			return;

		setIsChanging(true);

		setTimeout(() => {
			setCurrentPlaylistIdx(playlistIdx);
			setCurrentTrackIdx(trackIdx);
			setIsChanging(false);
			setIsEntering(true);
			setProgress(0);
			setIsPlaying(true);
			setSelectedVinyl(null); // Clear selection once playing

			setTimeout(() => {
				setIsEntering(false);
			}, 600);
		}, 400);
	};

	const handleVinylClick = (playlistIdx: number, trackIdx: number) => {
		// Check if touch device
		const isTouchDevice = () => {
			return (
				window.matchMedia("(pointer:coarse)").matches ||
				window.matchMedia("(hover:none)").matches
			);
		};

		// On touch devices, directly play the track
		if (isTouchDevice()) {
			changeTrack(playlistIdx, trackIdx);
			setShowPlaylist(false);
			return;
		}

		// On desktop, use selection for drag-and-drop, but animate snap-to-player.
		if (
			selectedVinyl?.playlistIdx === playlistIdx &&
			selectedVinyl?.trackIdx === trackIdx
		) {
			setSelectedVinyl(null);
			setFlyingVinyl(null);
			return;
		}

		const key = `${playlistIdx}:${trackIdx}`;
		const fromEl = vinylRefMap.current.get(key);
		const toEl = albumTargetRef.current;
		if (fromEl && toEl) {
			const from = fromEl.getBoundingClientRect();
			const to = toEl.getBoundingClientRect();
			const track = playlistData.playlists[playlistIdx].tracks[
				trackIdx
			] as Track;
			setFlyingVinyl({ cover: track.cover, from, to });
		}

		setSelectedVinyl({ playlistIdx, trackIdx });
	};

	const handleDragStart = (
		e: DragEvent,
		playlistIdx: number,
		trackIdx: number,
	) => {
		const key = `${playlistIdx}:${trackIdx}`;
		const fromEl = vinylRefMap.current.get(key);
		const toEl = albumTargetRef.current;
		if (fromEl && toEl) {
			const from = fromEl.getBoundingClientRect();
			const to = toEl.getBoundingClientRect();
			const track = playlistData.playlists[playlistIdx].tracks[
				trackIdx
			] as Track;
			setFlyingVinyl({ cover: track.cover, from, to });
		}

		e.dataTransfer?.setData(
			"application/json",
			JSON.stringify({ playlistIdx, trackIdx }),
		);
		e.dataTransfer?.setDragImage(e.target as Element, 60, 60);
		setShowPlaylist(false); // Hide playlist on drag start to reveal player
	};

	const handleDragEnd = () => {
		setDragOver(false);
	};

	const handleDragOver = (e: DragEvent) => {
		e.preventDefault();
		setDragOver(true);
	};

	const handleDragLeave = () => {
		setDragOver(false);
	};

	const handleDrop = (e: DragEvent) => {
		e.preventDefault();
		setDragOver(false);

		const dataStr = e.dataTransfer?.getData("application/json");
		if (dataStr) {
			try {
				const data = JSON.parse(dataStr);
				if (data.playlistIdx !== undefined && data.trackIdx !== undefined) {
					changeTrack(data.playlistIdx, data.trackIdx);
					setShowPlaylist(false);
				}
			} catch (error) {
				console.error("Error parsing drop data:", error);
			}
		}
	};

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.volume = volume;
			if (isPlaying && !isChanging) {
				const playPromise = audioRef.current.play();
				if (playPromise !== undefined) {
					playPromise.catch(() => {
						// Auto-play was prevented
						setIsPlaying(false);
					});
				}
			} else {
				audioRef.current.pause();
			}
		}
	}, [isPlaying, volume, currentTrackIdx, isChanging]);

	useEffect(() => {
		setWindowHeaderHidden("music", Boolean(isPlaying && currentVideoId));
		return () => setWindowHeaderHidden("music", false);
	}, [isPlaying, currentVideoId]);

	useEffect(() => {
		const iframe = youtubeFrameRef.current;
		if (!iframe) return;

		setIsYoutubeReady(false);
		const onMessage = (event: MessageEvent) => {
			if (event.source !== iframe.contentWindow) return;
			if (typeof event.data !== "string") return;
			try {
				const data = JSON.parse(event.data);
				if (data?.event === "onReady") {
					setIsYoutubeReady(true);
				}
			} catch {
				// ignore
			}
		};

		window.addEventListener("message", onMessage);
		return () => window.removeEventListener("message", onMessage);
	}, [currentVideoId]);

	useEffect(() => {
		const iframe = youtubeFrameRef.current;
		const audio = audioRef.current;
		if (!iframe || !audio || !isYoutubeReady || !currentVideoId) return;

		const post = (func: string, args: unknown[] = []) => {
			iframe.contentWindow?.postMessage(
				JSON.stringify({
					event: "command",
					func,
					args,
				}),
				"*",
			);
		};

		if (isPlaying) post("playVideo");
		else post("pauseVideo");
	}, [isPlaying, isYoutubeReady, currentVideoId]);

	useEffect(() => {
		const iframe = youtubeFrameRef.current;
		const audio = audioRef.current;
		if (!iframe || !audio) return;
		if (!currentVideoId) return;

		const post = (func: string, args: unknown[] = []) => {
			iframe.contentWindow?.postMessage(
				JSON.stringify({
					event: "command",
					func,
					args,
				}),
				"*",
			);
		};

		const syncToAudio = () => {
			if (!isYoutubeReady) return;
			const t = audio.currentTime || 0;
			post("seekTo", [t, true]);
		};

		const onSeeking = () => syncToAudio();
		audio.addEventListener("seeking", onSeeking);

		const interval = window.setInterval(() => {
			if (!isPlaying) return;
			syncToAudio();
		}, 5000);

		return () => {
			audio.removeEventListener("seeking", onSeeking);
			window.clearInterval(interval);
		};
	}, [currentVideoId, isPlaying, isYoutubeReady]);

	const togglePlay = () => {
		setIsPlaying(!isPlaying);
	};

	const nextTrack = () => {
		const nextIdx = (currentTrackIdx + 1) % currentPlaylist.tracks.length;
		changeTrack(currentPlaylistIdx, nextIdx);
	};

	const prevTrack = () => {
		const prevIdx =
			currentTrackIdx === 0
				? currentPlaylist.tracks.length - 1
				: currentTrackIdx - 1;
		changeTrack(currentPlaylistIdx, prevIdx);
	};

	const handleTimeUpdate = () => {
		const audio = audioRef.current;
		if (!audio) return;

		const current = audio.currentTime;
		const duration = audio.duration || 0;
		const percent =
			duration > 0 && Number.isFinite(duration)
				? (current / duration) * 100
				: 0;
		if (percent === 100) {
			nextTrack();
		}

		const clamped = Number.isFinite(percent)
			? Math.max(0, Math.min(100, percent))
			: 0;
		setProgress(clamped);
	};

	const handleSeek = (e: Event) => {
		const target = e.target as HTMLInputElement;
		const val = Number(target.value); // expected 0..100 (percent)

		// If audio is available and has a valid duration, update playback position
		if (audioRef.current) {
			const duration = audioRef.current.duration || 0;
			if (duration > 0 && Number.isFinite(duration)) {
				audioRef.current.currentTime = (val / 100) * duration;
			}
		}

		// Always update the visual CSS variable and local progress state
		if (rangeRef.current) {
			rangeRef.current.style.setProperty("--seek-percent", `${val}%`);
		}
		setProgress(val);
	};

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

	// Helper to get track info for selected vinyl
	const getSelectedTrack = () => {
		if (!selectedVinyl) return null;
		return playlistData.playlists[selectedVinyl.playlistIdx].tracks[
			selectedVinyl.trackIdx
		];
	};

	// Keep CSS variable in sync whenever progress state changes
	useEffect(() => {
		if (rangeRef.current) {
			const pct = Number.isFinite(progress)
				? Math.max(0, Math.min(100, progress))
				: 0;
			rangeRef.current.style.setProperty("--seek-percent", `${pct}%`);
		}
	}, [progress]);

	return (
		<div className="music-player-container">
			<button
				type="button"
				className="playlist-toggle"
				onClick={() => setShowPlaylist(!showPlaylist)}
				aria-label="Toggle playlist"
			>
				{showPlaylist ? <X /> : <ListMusic />}
			</button>

			<div className={`playlist-overlay ${showPlaylist ? "visible" : ""}`}>
				<div className="crates-container">
					{playlistData.playlists.map((playlist, pIdx) => (
						<div key={playlist.id} className="crate-section">
							<h3 className="crate-label">{playlist.name}</h3>
							<div className="vinyl-grid">
								{playlist.tracks.map((track, tIdx) => {
									const isSelected =
										selectedVinyl?.playlistIdx === pIdx &&
										selectedVinyl?.trackIdx === tIdx;
									const isNowPlaying =
										currentPlaylistIdx === pIdx && currentTrackIdx === tIdx;

									return (
										<div
											key={track.url}
											ref={(el) => {
												const key = `${pIdx}:${tIdx}`;
												if (el) vinylRefMap.current.set(key, el);
												else vinylRefMap.current.delete(key);
											}}
											className={`vinyl-item ${isNowPlaying ? "playing" : ""} ${isSelected ? "selected" : ""}`}
											draggable={true}
											onDragStart={(e) => handleDragStart(e, pIdx, tIdx)}
											onDragEnd={handleDragEnd}
											onClick={() => handleVinylClick(pIdx, tIdx)}
											title={track.title}
										>
											<div className="vinyl-sleeve">
												<img src={track.cover} alt={track.title} />
												<div className="vinyl-disc-peek" />
											</div>
											<span className="vinyl-name">{track.title}</span>
											{isSelected && (
												<div className="drag-hint">
													<span>Drag to player ➔</span>
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					))}
				</div>
			</div>

			<audio
				ref={audioRef}
				src={currentTrack.url}
				onTimeUpdate={handleTimeUpdate}
				onEnded={nextTrack}
			/>

			{(() => {
				if (!currentVideoId) return null;
				const src = `https://www.youtube.com/embed/${currentVideoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&autoplay=1&mute=1&controls=0&loop=1&playlist=${currentVideoId}&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3`;
				return (
					<div
						className={`player-video-bg ${isPlaying ? "playing" : ""}`}
						aria-hidden="true"
					>
						<iframe
							ref={youtubeFrameRef}
							title="Background video"
							src={src}
							allow="autoplay; encrypted-media;"
							referrerPolicy="strict-origin-when-cross-origin"
						/>
					</div>
				);
			})()}

			<div
				className={`player-body ${dragOver ? "drag-over" : ""} ${selectedVinyl ? "waiting-for-drop" : ""}`}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				<div className="album-art-container" ref={albumTargetRef}>
					{flyingVinyl && (
						<div
							className="flying-vinyl"
							style={
								{
									"--from-x": `${flyingVinyl.from.left + flyingVinyl.from.width / 2}px`,
									"--from-y": `${flyingVinyl.from.top + flyingVinyl.from.height / 2}px`,
									"--to-x": `${flyingVinyl.to.left + flyingVinyl.to.width / 2}px`,
									"--to-y": `${flyingVinyl.to.top + flyingVinyl.to.height / 2}px`,
								} as unknown as Record<string, string>
							}
							onAnimationEnd={() => setFlyingVinyl(null)}
						>
							<div className="flying-vinyl-record">
								<div
									className="flying-vinyl-label"
									style={{ backgroundImage: `url(${flyingVinyl.cover})` }}
								/>
							</div>
						</div>
					)}

					{!selectedVinyl && (
						<div
							className={`vinyl-record ${isPlaying ? "spinning" : ""} ${isChanging ? "changing" : ""} ${isEntering ? "entering" : ""}`}
						>
							<div className="vinyl-grooves" />
							<div
								className="vinyl-label"
								style={{ backgroundImage: `url(${currentTrack.cover})` }}
							/>
						</div>
					)}

					{selectedVinyl && (
						<div className="selected-vinyl-ghost">
							<div className="ghost-label">Drag me here!</div>
							<div className="vinyl-record-ghost">
								<div className="vinyl-grooves-ghost" />
								<div
									className="vinyl-label-ghost"
									style={{
										backgroundImage: `url(${getSelectedTrack()?.cover})`,
									}}
								/>
							</div>
						</div>
					)}
				</div>

				<div className="track-info">
					<div className="scrolling-text-container">
						<h3 className="track-title">{currentTrack.title}</h3>
					</div>
					<p className="track-artist">{currentTrack.artist}</p>
				</div>

				<div className="controls-area">
					<div className="progress-bar-container">
						<input
							type="range"
							className="seek-slider"
							min="0"
							max="100"
							ref={rangeRef}
							value={
								Number.isFinite(progress)
									? Math.max(0, Math.min(100, progress))
									: 0
							}
							onInput={handleSeek}
						/>
					</div>

					<div className="main-controls">
						<button
							type="button"
							className="control-btn prev-btn"
							onClick={prevTrack}
						>
							<FastForwardIcon style={{ transform: "rotate(-180deg)" }} />
						</button>
						<button
							type="button"
							className={`control-btn play-btn ${isPlaying ? "playing" : ""}`}
							onClick={togglePlay}
						>
							{isPlaying ? <PauseIcon /> : <PlayIcon />}
						</button>
						<button
							type="button"
							className="control-btn next-btn"
							onClick={nextTrack}
						>
							<FastForwardIcon />
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
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
