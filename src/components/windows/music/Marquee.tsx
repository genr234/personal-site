import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

/** Single line that drifts back and forth when its text doesn't fit. */
export function Marquee({ children, className }: { children: ComponentChildren; className?: string }) {
	const boxRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLSpanElement>(null);
	const [overflow, setOverflow] = useState(0);

	useEffect(() => {
		const box = boxRef.current;
		const text = textRef.current;
		if (!box || !text) return;
		const measure = () => setOverflow(Math.max(0, text.scrollWidth - box.clientWidth));
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(box);
		return () => ro.disconnect();
	}, [children]);

	return (
		<div
			ref={boxRef}
			className={`marquee ${overflow > 0 ? "scrolling" : ""} ${className ?? ""}`}
			style={
				{
					"--shift": `${-overflow}px`,
					// ~40px/s, plus time to rest at each end
					"--dur": `${overflow / 40 + 3}s`,
				} as unknown as Record<string, string>
			}
		>
			<span ref={textRef} className="marquee-text">
				{children}
			</span>
		</div>
	);
}
