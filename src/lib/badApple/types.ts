export interface BadAppleMetadata {
	version: 1;
	fps: number;
	duration: number;
	gridWidth: number;
	gridHeight: number;
	frameCount: number;
	peakWindows: number;
}

export type EncodedKeyframe = [
	frameDelta: number,
	xDelta: number,
	yDelta: number,
	widthDelta: number,
	heightDelta: number,
];

export interface EncodedTrack {
	id: number;
	startFrame: number;
	endFrame: number;
	initial: [x: number, y: number, width: number, height: number];
	keyframes: EncodedKeyframe[];
}

export interface BadAppleSchedule {
	meta: BadAppleMetadata;
	tracks: EncodedTrack[];
}

export interface Rectangle {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface TrackKeyframe extends Rectangle {
	frame: number;
}

export interface DecodedTrack {
	id: number;
	startFrame: number;
	endFrame: number;
	keyframes: TrackKeyframe[];
}
