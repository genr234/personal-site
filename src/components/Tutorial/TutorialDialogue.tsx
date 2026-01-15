import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import styles from "./styles/tutorial.module.scss";

export interface TutorialStep {
    id: string;
    /** message */
    text: string;
    /** target element selector */
    target?: string;
    /** callback when step becomes active */
    onEnter?: () => void;
}

interface TutorialDialogueProps {
	steps?: TutorialStep[];
	forceShow?: boolean;
	onComplete?: () => void;
}

interface SpotlightRect {
	top: number;
	left: number;
	width: number;
	height: number;
}

type TailDirection = "left" | "right" | "up" | "down";

interface Position {
	x: number;
	y: number;
	tailDir: TailDirection;
	bongoOnRight: boolean;
}

const TYPEWRITER_SPEED = 26;
const BONGO_FRAME_INTERVAL = 130;

const BONGO_SIZE = 110;
const BONGO_SIZE_MOBILE = 90;
const BUBBLE_WIDTH = 360;
const BUBBLE_WIDTH_MOBILE = 260;
const BUBBLE_HEIGHT = 180;
const MARGIN = 24;

export function TutorialDialogue({
	steps = [],
	forceShow = false,
	onComplete,
}: TutorialDialogueProps) {
	const [isVisible, setIsVisible] = useState(false);
	const [isExiting, setIsExiting] = useState(false);
	const [currentStepIndex, setCurrentStepIndex] = useState(0);
	const [displayedText, setDisplayedText] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [bongoFrame, setBongoFrame] = useState(1);
	const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
	const [position, setPosition] = useState<Position>({
		x: 100,
		y: 100,
		tailDir: "right",
		bongoOnRight: true,
	});
	const lastStablePositionRef = useRef<Position | null>(null);
	const [isMobile, setIsMobile] = useState(false);

	const typewriterRef = useRef<number | null>(null);
	const bongoIntervalRef = useRef<number | null>(null);
	const currentStep = steps[currentStepIndex];

	// filthy mobile users
	useEffect(() => {
		const check = () => setIsMobile(window.innerWidth <= 767);
		check();
		window.addEventListener("resize", check);
		return () => window.removeEventListener("resize", check);
	}, []);

	const calculatePosition = useCallback(
		(spot: SpotlightRect | null) => {
			const viewportW = window.innerWidth;
			const viewportH = window.innerHeight;

			const bongoW = isMobile ? BONGO_SIZE_MOBILE : BONGO_SIZE;
			const bubbleW = isMobile ? BUBBLE_WIDTH_MOBILE : BUBBLE_WIDTH;
			const totalW = bongoW + bubbleW + 4;
			const totalH = Math.max(bongoW, BUBBLE_HEIGHT);

			const clamp = (v: number, min: number, max: number) =>
				Math.max(min, Math.min(v, max));

			const withinViewport = (x: number, y: number) =>
				x >= MARGIN &&
				y >= MARGIN &&
				x + totalW <= viewportW - MARGIN &&
				y + totalH <= viewportH - MARGIN;

			const fallback: Position = {
				x: clamp(
					viewportW - totalW - MARGIN,
					MARGIN,
					viewportW - totalW - MARGIN,
				),
				y: clamp(
					viewportH - totalH - MARGIN - 60,
					MARGIN,
					viewportH - totalH - MARGIN,
				),
				tailDir: "right",
				bongoOnRight: true,
			};

			if (!spot) {
				lastStablePositionRef.current = fallback;
				setPosition(fallback);
				return;
			}

			const left = spot.left;
			const right = spot.left + spot.width;
			const top = spot.top;
			const bottom = spot.top + spot.height;

			const highlightCenterX = left + spot.width / 2;
			const highlightCenterY = top + spot.height / 2;

			const overlapsHighlight = (x: number, y: number) => {
				return !(
					x + totalW <= left ||
					x >= right ||
					y + totalH <= top ||
					y >= bottom
				);
			};

			type Candidate = {
				x: number;
				y: number;
				tailDir: TailDirection;
				bongoOnRight: boolean;
			};

			const gap = 14;
			const candidates: Candidate[] = [];

			candidates.push({
				x: clamp(
					highlightCenterX - totalW / 2,
					MARGIN,
					viewportW - totalW - MARGIN,
				),
				y: bottom + gap,
				tailDir: "right",
				bongoOnRight: true,
			});
			candidates.push({
				x: clamp(
					highlightCenterX - totalW / 2,
					MARGIN,
					viewportW - totalW - MARGIN,
				),
				y: top - totalH - gap,
				tailDir: "right",
				bongoOnRight: true,
			});
			candidates.push({
				x: right + gap,
				y: clamp(
					highlightCenterY - totalH / 2,
					MARGIN,
					viewportH - totalH - MARGIN,
				),
				tailDir: "left",
				bongoOnRight: false,
			});
			candidates.push({
				x: left - totalW - gap,
				y: clamp(
					highlightCenterY - totalH / 2,
					MARGIN,
					viewportH - totalH - MARGIN,
				),
				tailDir: "right",
				bongoOnRight: true,
			});

			const validCandidates = candidates
				.map((c) => ({
					...c,
					x: clamp(c.x, MARGIN, viewportW - totalW - MARGIN),
					y: clamp(c.y, MARGIN, viewportH - totalH - MARGIN),
				}))
				.filter((c) => withinViewport(c.x, c.y))
				.filter((c) => !overlapsHighlight(c.x, c.y));

			if (validCandidates.length === 0) {
				lastStablePositionRef.current = fallback;
				setPosition(fallback);
				return;
			}

			let best = validCandidates[0];
			let bestDist = Number.POSITIVE_INFINITY;

			for (const c of validCandidates) {
				const candidateCenterX = c.x + totalW / 2;
				const candidateCenterY = c.y + totalH / 2;
				const dist = Math.hypot(
					candidateCenterX - highlightCenterX,
					candidateCenterY - highlightCenterY,
				);
				if (dist < bestDist) {
					bestDist = dist;
					best = c;
				}
			}

			const nextPosition: Position = {
				x: best.x,
				y: best.y,
				tailDir: best.tailDir,
				bongoOnRight: best.bongoOnRight,
			};

			const prev = lastStablePositionRef.current;
			if (prev) {
				const moved = Math.hypot(
					nextPosition.x - prev.x,
					nextPosition.y - prev.y,
				);
				const changedOrientation =
					nextPosition.tailDir !== prev.tailDir ||
					nextPosition.bongoOnRight !== prev.bongoOnRight;

				if (!changedOrientation && moved < 8) return;
			}

			lastStablePositionRef.current = nextPosition;
			setPosition(nextPosition);
		},
		[isMobile],
	);

	useEffect(() => {
		if (isVisible) {
			calculatePosition(spotlight);
		}
	}, [isVisible, spotlight, calculatePosition]);

	useEffect(() => {
		if (!isVisible) return;
		const onResize = () => calculatePosition(spotlight);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [isVisible, spotlight, calculatePosition]);

	useEffect(() => {
		if (forceShow) {
			setIsVisible(true);
			return;
		}
		const seen = localStorage.getItem("tutorial_completed");
		if (!seen) {
			const timer = setTimeout(() => setIsVisible(true), 700);
			return () => clearTimeout(timer);
		}
	}, [forceShow]);

	const markAsSeen = useCallback(() => {
		localStorage.setItem("tutorial_completed", "true");
	}, []);

	const closeTutorial = useCallback(() => {
		setIsExiting(true);
		markAsSeen();
		setTimeout(() => {
			setIsVisible(false);
			setIsExiting(false);
			onComplete?.();
		}, 200);
	}, [markAsSeen, onComplete]);

	useEffect(() => {
		if (!isVisible) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeTutorial();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isVisible, closeTutorial]);

	useEffect(() => {
		if (!isVisible || !currentStep) return;

		const fullText = currentStep.text;
		setDisplayedText("");
		setIsTyping(true);

		let i = 0;
		const tick = () => {
			if (i < fullText.length) {
				setDisplayedText(fullText.slice(0, i + 1));
				i++;
				typewriterRef.current = window.setTimeout(tick, TYPEWRITER_SPEED);
			} else {
				setIsTyping(false);
			}
		};

		typewriterRef.current = window.setTimeout(tick, 120);

		return () => {
			if (typewriterRef.current) clearTimeout(typewriterRef.current);
		};
	}, [isVisible, currentStepIndex, currentStep]);

	useEffect(() => {
		if (isTyping) {
			bongoIntervalRef.current = window.setInterval(() => {
				setBongoFrame((p) => (p === 1 ? 2 : 1));
			}, BONGO_FRAME_INTERVAL);
		} else {
			if (bongoIntervalRef.current) clearInterval(bongoIntervalRef.current);
			setBongoFrame(1);
		}
		return () => {
			if (bongoIntervalRef.current) clearInterval(bongoIntervalRef.current);
		};
	}, [isTyping]);

	useEffect(() => {
		if (!isVisible || !currentStep?.target) {
			setSpotlight(null);
			return;
		}

		let rafId: number | null = null;

		const measure = () => {
			rafId = null;
			const el = document.querySelector(
				`[data-tutorial="${currentStep.target}"]`,
			);
			if (!el) {
				setSpotlight(null);
				return;
			}

			const rect = el.getBoundingClientRect();
			const pad = 12;
			setSpotlight({
				top: rect.top - pad,
				left: rect.left - pad,
				width: rect.width + pad * 2,
				height: rect.height + pad * 2,
			});
		};

		const scheduleMeasure = () => {
			if (rafId != null) return;
			rafId = window.requestAnimationFrame(measure);
		};

		const timer = setTimeout(scheduleMeasure, 50);
		window.addEventListener("resize", scheduleMeasure);
		window.addEventListener("scroll", scheduleMeasure, true);

		return () => {
			clearTimeout(timer);
			if (rafId != null) window.cancelAnimationFrame(rafId);
			window.removeEventListener("resize", scheduleMeasure);
			window.removeEventListener("scroll", scheduleMeasure, true);
		};
	}, [isVisible, currentStep]);

	useEffect(() => {
		currentStep?.onEnter?.();
	}, [currentStep]);

	const handleNext = useCallback(() => {
		if (isTyping) {
			if (typewriterRef.current) clearTimeout(typewriterRef.current);
			setDisplayedText(currentStep.text);
			setIsTyping(false);
		} else if (currentStepIndex < steps.length - 1) {
			setCurrentStepIndex((p) => p + 1);
		} else {
			closeTutorial();
		}
	}, [isTyping, currentStepIndex, steps.length, currentStep, closeTutorial]);

	const handleBack = useCallback(() => {
		if (currentStepIndex > 0) setCurrentStepIndex((p) => p - 1);
	}, [currentStepIndex]);

	if (!isVisible) return null;

	const isLastStep = currentStepIndex === steps.length - 1;
	const isFirstStep = currentStepIndex === 0;

	const tailClass =
		position.tailDir === "left"
			? styles.tailLeft
			: position.tailDir === "right"
				? styles.tailRight
				: position.tailDir === "up"
					? styles.tailUp
					: styles.tailDown;

	return (
		<>
			{/* biome-ignore lint/a11y/useSemanticElements: full-viewport overlay */}
			<div
				class={styles.overlay}
				onClick={handleNext}
				onKeyDown={(e) => e.key === "Enter" && handleNext()}
				role="button"
				tabIndex={-1}
				aria-label="Continue"
			/>

			{spotlight && (
				<>
					<div class={styles.spotlightMask} />
					<div
						class={styles.spotlightHitbox}
						style={{
							top: `${spotlight.top}px`,
							left: `${spotlight.left}px`,
							width: `${spotlight.width}px`,
							height: `${spotlight.height}px`,
						}}
					/>
				</>
			)}

			<div
				class={`${styles.bongoContainer} ${isExiting ? styles.exiting : ""}`}
				style={{
					left: `${position.x}px`,
					top: `${position.y}px`,
					flexDirection: position.bongoOnRight ? "row" : "row-reverse",
				}}
				role="dialog"
				aria-modal="true"
				aria-label="Tutorial"
			>
				<div class={`${styles.speechBubble} ${tailClass}`}>
					<div class={styles.bubbleTail} />
					<p class={`${styles.messageText} ${isTyping ? styles.typing : ""}`}>
						{displayedText}
					</p>

					<div class={styles.controls}>
						<div class={styles.dots}>
							{steps.map((_, i) => (
								<span
									class={`${styles.dot} ${
										i === currentStepIndex
											? styles.active
											: i < currentStepIndex
												? styles.done
												: ""
									}`}
								/>
							))}
						</div>
						<div class={styles.btns}>
							{currentStepIndex > 0 && (
								<button
									type="button"
									class={`${styles.btn} ${styles.btnGhost}`}
									onClick={handleBack}
								>
									Back
								</button>
							)}
							<button
								type="button"
								class={`${styles.btn} ${styles.btnPrimary}`}
								onClick={handleNext}
							>
								{isTyping ? "Skip" : isLastStep ? "Bye Bye :)" : "Next"}
							</button>
						</div>
					</div>

					{isFirstStep && !isMobile && (
						<div class={styles.hint}>esc to skip</div>
					)}
				</div>

				<div
					class={`${styles.bongoCharacter} ${isTyping ? styles.bongoTyping : ""}`}
				>
					<img
						src={`/bongo${bongoFrame}.png`}
						alt="Bongo Cat"
						draggable={false}
					/>
				</div>
			</div>
		</>
	);
}
