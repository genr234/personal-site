import { useEffect, useRef, useState } from "preact/hooks";
import { playSfx } from "../../../lib/vinylSfx";

// Tonearm angles (deg, clockwise from hanging straight down off the pivot).
// Measured so the needle lands on the lead-in groove and ends at the label.
export const ARM_REST = 3;
export const ARM_OUTER = 14;
export const ARM_INNER = 32.5;

const RPM_DEG_PER_SEC = (100 / 3 / 60) * 360; // 33⅓ rpm = 200°/s
const SPIN_UP = 420; // °/s²: ~0.5s to full speed
const WIND_DOWN = 260; // °/s²: ~0.8s to stop, matched to the audio fade
const SECONDS_PER_TURN = 60 / (100 / 3); // one revolution of a real LP = 1.8s of audio

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const prefersReducedMotion = () =>
	typeof window !== "undefined" &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface TurntableProps {
	cover: string;
	/** Platter motor: spinning whenever playback is wanted. */
	motorOn: boolean;
	/** Needle is in the groove and audio is actually playing. */
	needleDown: boolean;
	/** Arm sits on its rest instead of over the record. */
	armParked: boolean;
	/** Playback position, 0..1. */
	progress: number;
	isChanging: boolean;
	isEntering: boolean;
	onArmLift: () => void;
	onArmDrop: (fraction: number) => void;
	onArmPark: () => void;
	onGrab: () => void;
	onScrub: (seconds: number) => void;
	onRelease: (seconds: number) => void;
}

export function Turntable({
	cover,
	motorOn,
	needleDown,
	armParked,
	progress,
	isChanging,
	isEntering,
	onArmLift,
	onArmDrop,
	onArmPark,
	onGrab,
	onScrub,
	onRelease,
}: TurntableProps) {
	const tableRef = useRef<HTMLDivElement>(null);
	const spinRef = useRef<HTMLDivElement>(null);
	const angle = useRef(0);
	const omega = useRef(0);
	const motorRef = useRef(motorOn);
	motorRef.current = motorOn;

	const [grabbed, setGrabbed] = useState(false);
	const grab = useRef({ active: false, lastAngle: 0, lastTime: 0, seconds: 0, lastScratch: 0, dir: 0 });

	const [armDrag, setArmDrag] = useState<number | null>(null);

	// Platter physics: accelerate toward 33⅓ rpm with the motor on, coast down when off
	useEffect(() => {
		let raf = 0;
		let last = performance.now();
		const tick = (now: number) => {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			if (!grab.current.active) {
				const target = motorRef.current && !prefersReducedMotion() ? RPM_DEG_PER_SEC : 0;
				const rate = target > omega.current ? SPIN_UP : WIND_DOWN;
				const step = rate * dt;
				omega.current =
					Math.abs(target - omega.current) <= step
						? target
						: omega.current + Math.sign(target - omega.current) * step;
				angle.current = (angle.current + omega.current * dt) % 360;
			}
			if (spinRef.current) spinRef.current.style.transform = `rotate(${angle.current}deg)`;
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, []);

	// Needle sounds follow the needle
	const wasDown = useRef(needleDown);
	useEffect(() => {
		if (needleDown && !wasDown.current) playSfx("needleDrop", { gain: 0.8 });
		if (!needleDown && wasDown.current && !armParked) playSfx("needleLift", { gain: 0.8 });
		wasDown.current = needleDown;
	}, [needleDown]);

	const center = () => {
		const r = tableRef.current!.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2, size: r.width };
	};

	// ── Hand on the record: stop it, scrub by turning it ──

	const pointerAngle = (e: PointerEvent) => {
		const c = center();
		return (Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180) / Math.PI;
	};

	const handleRecordDown = (e: PointerEvent) => {
		if (e.button !== 0) return;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		if (omega.current > 120) playSfx("recordStop", { gain: 0.5 });
		omega.current = 0;
		grab.current = {
			active: true,
			lastAngle: pointerAngle(e),
			lastTime: performance.now(),
			seconds: 0,
			lastScratch: 0,
			dir: 0,
		};
		setGrabbed(true);
		onGrab();
	};

	const handleRecordMove = (e: PointerEvent) => {
		const g = grab.current;
		if (!g.active) return;
		const a = pointerAngle(e);
		let delta = a - g.lastAngle;
		if (delta > 180) delta -= 360;
		if (delta < -180) delta += 360;
		const now = performance.now();
		const dt = Math.max(1, now - g.lastTime) / 1000;
		g.lastAngle = a;
		g.lastTime = now;

		angle.current = (angle.current + delta + 360) % 360;
		g.seconds += (delta / 360) * SECONDS_PER_TURN;
		onScrub(g.seconds);

		// Scratch bursts: pitch and loudness follow hand speed, re-triggered on direction changes
		const speed = Math.abs(delta / dt);
		const dir = Math.sign(delta);
		if (speed > 140 && (dir !== g.dir || now - g.lastScratch > 120)) {
			playSfx("scratchShort", {
				rate: clamp(speed / 520, 0.55, 1.9) * (dir < 0 ? 0.85 : 1),
				gain: clamp(speed / 900, 0.25, 1),
			});
			g.lastScratch = now;
			g.dir = dir;
		}
	};

	const handleRecordUp = () => {
		const g = grab.current;
		if (!g.active) return;
		g.active = false;
		setGrabbed(false);
		onRelease(g.seconds);
	};

	// ── Tonearm: lift, move, drop to seek; set it on the rest to stop ──

	const armAngleFromPointer = (e: PointerEvent) => {
		const r = tableRef.current!.getBoundingClientRect();
		// Pivot sits just right of the platter's top-right corner (see .tonearm in the styles)
		const px = r.left + r.width * 1.06;
		const py = r.top + r.height * 0.02;
		const deg = (Math.atan2(-(e.clientX - px), e.clientY - py) * 180) / Math.PI;
		return clamp(deg, 0, ARM_INNER + 2);
	};

	const handleArmDown = (e: PointerEvent) => {
		if (e.button !== 0) return;
		e.stopPropagation();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		setArmDrag(armAngleFromPointer(e));
		onArmLift();
	};

	const handleArmMove = (e: PointerEvent) => {
		if (armDrag === null) return;
		setArmDrag(armAngleFromPointer(e));
	};

	const handleArmUp = () => {
		if (armDrag === null) return;
		const a = armDrag;
		setArmDrag(null);
		if (a >= ARM_OUTER - 3) {
			onArmDrop(clamp((a - ARM_OUTER) / (ARM_INNER - ARM_OUTER), 0, 0.995));
		} else {
			onArmPark();
		}
	};

	const armAngle =
		armDrag ?? (armParked ? ARM_REST : ARM_OUTER + (ARM_INNER - ARM_OUTER) * clamp(progress, 0, 1));
	const armLifted = armDrag !== null || (!armParked && !needleDown);

	return (
		<div className="turntable" ref={tableRef}>
			<div
				className={`vinyl-record ${isChanging ? "changing" : ""} ${isEntering ? "entering" : ""} ${grabbed ? "grabbed" : ""}`}
				onPointerDown={handleRecordDown}
				onPointerMove={handleRecordMove}
				onPointerUp={handleRecordUp}
				onPointerCancel={handleRecordUp}
			>
				<div className="vinyl-spin" ref={spinRef}>
					<div className="vinyl-label" style={{ backgroundImage: `url(${cover})` }} />
				</div>
				<div className="vinyl-sheen" aria-hidden="true" />
			</div>

			<div
				className={`tonearm ${armLifted ? "lifted" : ""} ${armDrag !== null ? "dragging" : ""}`}
				style={{ transform: `rotate(${armAngle}deg)` }}
				onPointerDown={handleArmDown}
				onPointerMove={handleArmMove}
				onPointerUp={handleArmUp}
				onPointerCancel={handleArmUp}
			>
				<span className="tonearm-pivot" />
				<span className="tonearm-rod" />
				<span className="tonearm-head" />
			</div>
		</div>
	);
}
