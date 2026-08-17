type BackgroundRenderer = typeof import("./background");

let rendererPromise: Promise<BackgroundRenderer> | undefined;

function renderer(): Promise<BackgroundRenderer> {
	return (rendererPromise ??= import("./background"));
}

export function startShaderBackground(): void {
	void renderer();
}

export function toggleShaderBackground(): void {
	void renderer().then((module) => module.toggleShaderBackground());
}

export function setPalette(index: number): void {
	void renderer().then((module) => module.setPalette(index));
}

export function setPaletteImmediate(index: number): void {
	void renderer().then((module) => module.setPaletteImmediate(index));
}

export function randomPalette(immediate?: boolean): void {
	void renderer().then((module) => module.randomPalette(immediate));
}
