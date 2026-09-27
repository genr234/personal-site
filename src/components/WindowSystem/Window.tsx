import { useComputed } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import type { WindowState } from "../../lib/types";
import {
	closeWindow,
	focusWindow,
	expandWindow,
	expandedWindowId,
	mobileMode,
	minimizeWindow,
	updateWindowPosition,
	windowHeaderOverrides,
} from "../../lib/windowManager";
import styles from "./styles/window.module.scss";
import WindowContent from "./WindowContent.tsx";
import { WindowHeader } from "./WindowHeader";

interface Props {
	windowState: WindowState;
}

function getWindowContent(id: string) {
	return <WindowContent windowId={id} />;
}

export function Window({ windowState }: Props) {
	const {
		id,
		title,
		color,
		width,
		height,
		x,
		y,
		zIndex,
		focused,
		variant,
		headerBackground: configHeaderBackground,
		headerTextColor: configHeaderTextColor,
	} = windowState;
	const windowRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const dragStartPos = useRef({ x: 0, y: 0, windowX: 0, windowY: 0 });

	const isMobile = useComputed(() => mobileMode.value);
	const isExpanded = useComputed(() => expandedWindowId.value === id);

	const handleMouseDown = (e: MouseEvent) => {
		if (isMobile.value) return;
		// Only drag from header, not from buttons
		const target = e.target as HTMLElement;
		if (target.closest("button")) return;

		setIsDragging(true);
		focusWindow(id);

		dragStartPos.current = {
			x: e.clientX,
			y: e.clientY,
			windowX: x,
			windowY: y,
		};

		// Add grabbing cursor class
		document.body.classList.add("window-dragging");
	};

	useEffect(() => {
		if (!isDragging) return;

		const handleMouseMove = (e: MouseEvent) => {
			const deltaX = e.clientX - dragStartPos.current.x;
			const deltaY = e.clientY - dragStartPos.current.y;

			let newX = dragStartPos.current.windowX + deltaX;
			let newY = dragStartPos.current.windowY + deltaY;

			// Constrain to viewport with padding
			const padding = 40;
			const maxX = window.innerWidth - width - padding;
			const maxY = window.innerHeight - height - padding;

			newX = Math.max(padding, Math.min(newX, maxX));
			newY = Math.max(padding, Math.min(newY, maxY));

			updateWindowPosition(id, newX, newY);
		};

		const handleMouseUp = () => {
			setIsDragging(false);
			document.body.classList.remove("window-dragging");
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDragging, id, x, y, width, height]);

	const headerOverride = useComputed(() => windowHeaderOverrides.value[id]);
	const isHeaderHidden = Boolean(headerOverride.value?.hidden);
	const headerBackground =
		headerOverride.value?.background ?? configHeaderBackground;
	const headerTextColor =
		headerOverride.value?.textColor ?? configHeaderTextColor;

	return (
		<div
			ref={windowRef}
			class={[
				styles.window,
				focused && styles.windowFocused,
				variant === "seamless" && styles.windowSeamless,
				isHeaderHidden && styles.windowNoHeader,
				isExpanded.value && styles.windowExpanded,
			]
				.filter(Boolean)
				.join(" ")}
			style={isMobile.value ? {} : {
				left: `${x}px`,
				top: `${y}px`,
				width: `${width}px`,
				height: `${height}px`,
				zIndex,
				"--window-color": color,
				"--header-bg": headerBackground || "transparent",
				"--header-text": headerTextColor || "#fff",
			} as any}
			onMouseDown={() => {
				// On mobile, clicking/tapping the window expands it
				if (isMobile.value && !isExpanded.value) {
					expandWindow(id);
					return;
				}
				focusWindow(id);
			}}
			role="dialog"
			aria-label={title}
		>
			{!isHeaderHidden && (
				<WindowHeader
					headerBackground={headerBackground}
					headerTextColor={headerTextColor}
					onClose={() => closeWindow(id)}
					onMinimize={() => minimizeWindow(id)}
					onMouseDown={handleMouseDown}
					isDragging={isDragging}
					variant={variant}
				/>
			)}
			<div
				class={[
					styles.windowContent,
					variant === "seamless" && styles.windowContentSeamless,
				]
					.filter(Boolean)
					.join(" ")}
			>
					{getWindowContent(id)}
			</div>
		</div>
	);
}
