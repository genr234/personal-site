// credits to: https://github.com/hackclub/penumbra/blob/main/src/scripts/shader.ts

import * as THREE from "three";

import shaderBufferA from "../assets/shaders/bufferA.glsl?raw";
import shaderBufferB from "../assets/shaders/bufferB.glsl?raw";
import shaderImage from "../assets/shaders/image.glsl?raw";

const TARGET_FPS = 30;
const FPS_SAMPLE_SIZE = 40;
const RESOLUTION_SCALE_MIN = 0.3;
const RESOLUTION_SCALE_MAX = 1.0;

// Palette configuration
const PALETTE_NAMES = ["Ocean", "Sunset", "Forest", "Aurora", "Neon"] as const;

const PALETTE_COUNT = PALETTE_NAMES.length;

const canvas = document.querySelector<HTMLCanvasElement>("#shader")!;
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
const gl = renderer.getContext();
renderer.autoClear = false;

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
const quad = new THREE.PlaneGeometry(2, 2);

const sceneA = new THREE.Scene();
const sceneB = new THREE.Scene();
const sceneImage = new THREE.Scene();

/**
 * Wraps a ShaderToy `mainImage` into a complete fragment shader, declaring exactly
 * the uniforms the pass needs.
 */
function buildFrag(opts: {
	needsMouse?: boolean;
	needsChannel0?: boolean;
	needsTime?: boolean;
	needsPalette?: boolean;
	needsMorph?: boolean;
	source: string;
}) {
	const lines = ["#include <common>", "precision highp float;"];

	lines.push("uniform vec3 iResolution;");
	if (opts.needsMouse) lines.push("uniform vec4 iMouse;");
	if (opts.needsChannel0) lines.push("uniform sampler2D iChannel0;");
	if (opts.needsTime) lines.push("uniform float iTime;");
	if (opts.needsPalette) lines.push("uniform int iPalette;");
	if (opts.needsMorph) lines.push("uniform float iMorphProgress;");

	lines.push(opts.source.trim());
	lines.push("void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }");

	return lines.join("\n");
}

const uniformsA = {
	iResolution: { value: new THREE.Vector3() },
	iMouse: { value: new THREE.Vector4() },
	iTime: { value: 0 },
	iScrollProgress: { value: 0 },
	iPalette: { value: 0 },
	iMorphProgress: { value: 0 },
};

const uniformsB = {
	iResolution: { value: new THREE.Vector3() },
	iChannel0: { value: null as unknown as THREE.Texture },
	iTime: { value: 0 },
	iScrollProgress: { value: 0 },
};

const uniformsImage = {
	iResolution: { value: new THREE.Vector3() },
	iChannel0: { value: null as unknown as THREE.Texture },
	iScrollProgress: { value: 0 },
};

const fpsHistory = new Array(FPS_SAMPLE_SIZE).fill(0);
let fpsHistoryIndex = 0;
let fpsHistoryCount = 0;
let lastFrameTime = 0;
let currentResolutionScale = 1.0;

let usingMobileGpu = false;
const dbgRenderInfo = gl.getExtension("WEBGL_debug_renderer_info");
if (dbgRenderInfo) {
	const model = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL);
	const vendor = gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL);

	const mobileVendors = ["ARM", "QUALCOMM"];

	const mobileModels = [
		"MALI-",
		"LLVMPIPE",
		"SWIFTSHADER",
		"ADRENO",
		"XCLIPSE",
		"HD GRAPHICS",
		"UHD GRAPHICS",
	];

	if (
		(typeof vendor === "string" &&
			mobileVendors.includes(vendor.trim().toUpperCase())) ||
		(typeof model === "string" &&
			mobileModels.includes(model.trim().toUpperCase()))
	) {
		console.log("Mobile GPU detected. Using low detail mode.");
		usingMobileGpu = true;
	}
}

if (usingMobileGpu) {
	currentResolutionScale = 0.5;
}

const shaderBufferAProlog = !usingMobileGpu
	? /*glsl*/ `
        const float RAYMARCH_MIN_DIST = 0.3;
        const float RAYMARCH_MAX_DIST = 50.0;
        const float RAYMARCH_HIT_CUTOFF = 0.001;
        const int RAYMARCH_MAX_ITERS = 32;
    `
	: /*glsl*/ `
        const float RAYMARCH_MIN_DIST = 0.3;
        const float RAYMARCH_MAX_DIST = 10.0;
        const float RAYMARCH_HIT_CUTOFF = 0.01;
        const int RAYMARCH_MAX_ITERS = 16;
    `;

const shaderImageProlog = !usingMobileGpu
	? /*glsl*/ `
        const float BLOOM_SAMPLES = 16.0;
    `
	: /*glsl*/ `
        const float BLOOM_SAMPLES = 32.0;
    `;

const matA = new THREE.ShaderMaterial({
	fragmentShader: buildFrag({
		needsMouse: true,
		needsTime: true,
		needsPalette: true,
		needsMorph: true,
		source: shaderBufferAProlog + shaderBufferA,
	}),
	uniforms: uniformsA,
});

const matB = new THREE.ShaderMaterial({
	fragmentShader: buildFrag({
		needsChannel0: true,
		needsTime: true,
		source: shaderBufferB,
	}),
	uniforms: uniformsB,
});

const matImage = new THREE.ShaderMaterial({
	fragmentShader: buildFrag({
		needsChannel0: true,
		source: shaderImageProlog + shaderImage,
	}),
	uniforms: uniformsImage,
});

sceneA.add(new THREE.Mesh(quad, matA));
sceneB.add(new THREE.Mesh(quad, matB));
sceneImage.add(new THREE.Mesh(quad, matImage));

let rtA = makeRenderTarget();
let rtB = makeRenderTarget();

uniformsB.iChannel0.value = rtA.texture;
uniformsImage.iChannel0.value = rtB.texture;

let actualMouseX = 0,
	actualMouseY = 0;

let lastTime = 0,
	timeBasis = 0;

window.addEventListener("pointermove", (e) => {
	const rect = canvas.getBoundingClientRect();
	actualMouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
	actualMouseY = (rect.bottom - e.clientY) * (canvas.height / rect.height);
});

window.addEventListener("blur", () => {
	// The shader goes kinda crazy with large values of t, reset them when the user switches tabs
	if (lastTime > timeBasis + 30) {
		console.log(`Time basis fast-forwarded to ${lastTime}`);
		timeBasis = lastTime;
	}
});

function resizeRendererToDisplaySize(r: THREE.WebGLRenderer) {
	const c = r.domElement;
	const width = Math.floor(
		c.clientWidth * devicePixelRatio * currentResolutionScale,
	);
	const height = Math.floor(
		c.clientHeight * devicePixelRatio * currentResolutionScale,
	);
	const needResize = c.width !== width || c.height !== height;

	if (needResize) {
		r.setSize(width, height, false);
	}

	return needResize;
}

function makeRenderTarget() {
	const { width, height } = renderer.domElement;
	const rt = new THREE.WebGLRenderTarget(width, height, {
		depthBuffer: false,
		stencilBuffer: false,
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		type: THREE.UnsignedByteType,
	});

	rt.texture.generateMipmaps = false;
	return rt;
}

function updateResUniforms() {
	const { width, height } = renderer.domElement;
	const res = new THREE.Vector3(width, height, 1);
	uniformsA.iResolution.value.copy(res);
	uniformsB.iResolution.value.copy(res);
	uniformsImage.iResolution.value.copy(res);
}

function onResize() {
	if (resizeRendererToDisplaySize(renderer)) {
		rtA.dispose();
		rtB.dispose();
		rtA = makeRenderTarget();
		rtB = makeRenderTarget();
		uniformsB.iChannel0.value = rtA.texture;
		uniformsImage.iChannel0.value = rtB.texture;
		updateResUniforms();
	}
}

function measureFPS(currentTime: number) {
	if (lastFrameTime > 0) {
		const frameDelta = currentTime - lastFrameTime;

		fpsHistory[fpsHistoryIndex] = 1000 / frameDelta;
		fpsHistoryIndex = (fpsHistoryIndex + 1) % FPS_SAMPLE_SIZE;
		if (fpsHistoryCount < FPS_SAMPLE_SIZE) {
			fpsHistoryCount++;
		}

		if (fpsHistoryCount >= 10) {
			let sum = 0;
			for (let i = 0; i < fpsHistoryCount; i++) {
				sum += fpsHistory[i];
			}

			const averageFPS = sum / fpsHistoryCount;
			adjustResolution(averageFPS);
		}
	}

	lastFrameTime = currentTime;
}

function adjustResolution(averageFPS: number) {
	let targetScale = currentResolutionScale;

	if (averageFPS < TARGET_FPS * 0.9) {
		targetScale = Math.max(currentResolutionScale * 0.95, RESOLUTION_SCALE_MIN);
	} else if (
		averageFPS > TARGET_FPS * 1.1 &&
		currentResolutionScale < RESOLUTION_SCALE_MAX
	) {
		targetScale = Math.min(currentResolutionScale * 1.02, RESOLUTION_SCALE_MAX);
	}

	if (Math.abs(targetScale - currentResolutionScale) > 0.02) {
		currentResolutionScale = targetScale;
		console.log(
			`Resolution scale adjusted to ${currentResolutionScale.toFixed(2)} (FPS: ${averageFPS.toFixed(1)})`,
		);

		onResize();
		fpsHistoryCount = 0;
		fpsHistoryIndex = 0;
	}
}

let scrollProgress = 0;

// Transition state
const TRANSITION_DURATION = 1.5; // seconds
let currentPalette = 0;
let targetPalette = 0;
let transitionStartTime = -1;
let isTransitioning = false;

function updateTransition(timeSeconds: number) {
	if (!isTransitioning) {
		uniformsA.iPalette.value = currentPalette * 10 + currentPalette;
		uniformsA.iMorphProgress.value = 0;
		return;
	}

	const elapsed = timeSeconds - transitionStartTime;
	const progress = Math.min(elapsed / TRANSITION_DURATION, 1.0);

	uniformsA.iPalette.value = currentPalette * 10 + targetPalette;
	uniformsA.iMorphProgress.value = progress;

	if (progress >= 1.0) {
		currentPalette = targetPalette;
		isTransitioning = false;
		uniformsA.iPalette.value = currentPalette * 10 + currentPalette;
		uniformsA.iMorphProgress.value = 0;
	}
}

function render(timeMs: number) {
	measureFPS(timeMs);

	lastTime = timeMs;
	const timeSeconds = (timeMs - timeBasis) * 0.001;

	onResize();
	updateResUniforms();
	updateTransition(timeSeconds);

	uniformsA.iTime.value = timeSeconds;
	uniformsB.iTime.value = timeSeconds;

	// Slow movement based on time
	scrollProgress = (timeSeconds * 0.2) % 2.0;
	const slowMovementX = Math.sin(timeSeconds * 0.3) * 200;
	const slowMovementY = Math.cos(timeSeconds * 0.25) * 200;

	uniformsA.iMouse.value.set(slowMovementX, slowMovementY, 0, 0);

	// Pass A -> rtA
	renderer.setRenderTarget(rtA);
	renderer.render(sceneA, camera);

	// Pass B (reads A) -> rtB
	renderer.setRenderTarget(rtB);
	renderer.render(sceneB, camera);

	// Final Image (reads B) -> screen
	renderer.setRenderTarget(null);
	renderer.render(sceneImage, camera);

	requestAnimationFrame(render);
}

requestAnimationFrame(render);

export function setPalette(index: number): void {
	const clampedIndex = Math.max(0, Math.min(index, PALETTE_COUNT - 1));

	// If we're already there (or already heading there), do nothing.
	if (clampedIndex === targetPalette) {
		return;
	}

	if (!isTransitioning) {
		// Start a new transition from the current palette.
		targetPalette = clampedIndex;
		transitionStartTime = uniformsA.iTime.value;
		isTransitioning = true;
		return;
	}

	// Mid-transition retargeting:
	// 1) Bake the current intermediate state as the new "from" palette,
	// 2) Restart the transition clock.
	const timeSeconds = uniformsA.iTime.value;
	const elapsed = timeSeconds - transitionStartTime;
	const progress = Math.min(elapsed / TRANSITION_DURATION, 1.0);

	// iPalette encodes "from" and "to" palettes as from*10 + to.
	// We collapse the current blend to its closest palette to avoid a hard reset.
	currentPalette = progress >= 0.5 ? targetPalette : currentPalette;
	uniformsA.iPalette.value = currentPalette * 10 + currentPalette;
	uniformsA.iMorphProgress.value = 0;

	targetPalette = clampedIndex;
	transitionStartTime = timeSeconds;
	isTransitioning = true;
}

export function setPaletteImmediate(index: number): void {
	const clampedIndex = Math.max(0, Math.min(index, PALETTE_COUNT - 1));
	currentPalette = clampedIndex;
	targetPalette = clampedIndex;
	isTransitioning = false;
	uniformsA.iPalette.value = clampedIndex * 10 + clampedIndex;
	uniformsA.iMorphProgress.value = 0;
}

export function randomPalette(immediate?: boolean): void {
	let randomIndex = Math.floor(Math.random() * PALETTE_COUNT);
	if (randomIndex === targetPalette) {
		randomIndex = (randomIndex + 1) % PALETTE_COUNT;
	}
	if (immediate) {
		setPaletteImmediate(randomIndex);
	} else setPalette(randomIndex);
}
