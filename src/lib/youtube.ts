declare global {
	interface Window {
		YT?: typeof YT;
		onYouTubeIframeAPIReady?: () => void;
	}
}

export function getYoutubeIdFromUrl(url?: string): string | null {
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
		if (embedIdx >= 0 && pathParts[embedIdx + 1]) return pathParts[embedIdx + 1];
		const shortsIdx = pathParts.indexOf("shorts");
		if (shortsIdx >= 0 && pathParts[shortsIdx + 1])
			return pathParts[shortsIdx + 1];
		return null;
	} catch {
		return null;
	}
}

export function youtubeThumbnailUrl(videoId: string): string {
	return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

let apiPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi(): Promise<void> {
	if (typeof window === "undefined") {
		return Promise.reject(new Error("YouTube API is browser-only"));
	}
	if (window.YT?.Player) return Promise.resolve();
	if (apiPromise) return apiPromise;

	apiPromise = new Promise((resolve, reject) => {
		const previous = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = () => {
			previous?.();
			resolve();
		};

		const existing = document.querySelector<HTMLScriptElement>(
			'script[src="https://www.youtube.com/iframe_api"]',
		);
		if (!existing) {
			const script = document.createElement("script");
			script.src = "https://www.youtube.com/iframe_api";
			script.onerror = () => {
				apiPromise = null;
				reject(new Error("Failed to load YouTube IFrame API"));
			};
			document.head.appendChild(script);
		}

		if (window.YT?.Player) resolve();
	});

	return apiPromise;
}
