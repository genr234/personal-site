const formatTime = (s: number) => {
	if (!Number.isFinite(s) || s < 0) s = 0;
	const m = Math.floor(s / 60);
	const sec = Math.floor(s % 60);
	return `${m}:${sec.toString().padStart(2, "0")}`;
};

interface NyanSeekBarProps {
	currentTime: number;
	duration: number;
	onSeek: (fraction: number) => void;
}

export function NyanSeekBar({ currentTime, duration, onSeek }: NyanSeekBarProps) {
	const fraction = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

	return (
		<div className="nyan-seek">
			<div
				className="nyan-track"
				style={{ "--p": fraction } as unknown as Record<string, string>}
			>
				<div className="nyan-rainbow" />
				<input
					type="range"
					className="seek-slider"
					min="0"
					max="1000"
					step="1"
					value={Math.round(fraction * 1000)}
					onInput={(e) => onSeek(Number((e.target as HTMLInputElement).value) / 1000)}
					aria-label="Seek"
					aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
				/>
			</div>
			<div className="nyan-times" aria-hidden="true">
				<span>{formatTime(currentTime)}</span>
				<span>{duration > 0 ? `-${formatTime(duration - currentTime)}` : "--:--"}</span>
			</div>
		</div>
	);
}
