declare namespace YT {
	enum PlayerState {
		UNSTARTED = -1,
		ENDED = 0,
		PLAYING = 1,
		PAUSED = 2,
		BUFFERING = 3,
		CUED = 5,
	}

	interface PlayerEvent {
		target: Player;
		data: number;
	}

	interface PlayerOptions {
		videoId?: string;
		playerVars?: Record<string, string | number>;
		events?: {
			onReady?: (event: PlayerEvent) => void;
			onStateChange?: (event: PlayerEvent) => void;
			onError?: (event: PlayerEvent) => void;
		};
	}

	class Player {
		constructor(element: string | HTMLElement, options?: PlayerOptions);
		playVideo(): void;
		pauseVideo(): void;
		stopVideo(): void;
		seekTo(seconds: number, allowSeekAhead: boolean): void;
		setVolume(volume: number): void;
		getVolume(): number;
		getCurrentTime(): number;
		getDuration(): number;
		getPlayerState(): PlayerState;
		loadVideoById(videoId: string, startSeconds?: number): void;
		cueVideoById(videoId: string, startSeconds?: number): void;
		destroy(): void;
	}
}
