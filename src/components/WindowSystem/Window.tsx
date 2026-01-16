import { useComputed } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import type { WindowState } from "../../lib/types";
import {
	closeWindow,
	focusWindow,
	hiddenWindowHeaders,
	minimizeWindow,
	updateWindowPosition,
} from "../../lib/windowManager";
import styles from "./styles/window.module.scss";
import WindowContent from "./WindowContent.tsx";
import { WindowHeader } from "./WindowHeader";

interface Props {
	windowState: WindowState;
}

function getWindowContent(id: string, color: string) {
	const contentStyles = {
		fontFamily: "Inter, sans-serif",
		color: "#1a1a1a",
		height: "100%",
	};

	const headingStyles = {
		fontSize: "24px",
		fontWeight: "600",
		marginBottom: "16px",
		color: color,
	};

	const paragraphStyles = {
		lineHeight: "1.6",
		marginBottom: "12px",
	};

	return <WindowContent windowId={id} />;
}

export function Window({ windowState }: Props) {
	const {
		id,
		title,
		color,
		icon,
		width,
		height,
		x,
		y,
		zIndex,
		focused,
		variant,
		headerBackground,
		headerTextColor,
	} = windowState;
	const windowRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const dragStartPos = useRef({ x: 0, y: 0, windowX: 0, windowY: 0 });

	const handleMouseDown = (e: MouseEvent) => {
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

	const isHeaderHidden = useComputed(() => hiddenWindowHeaders.value.has(id));

	return (
		<div
			ref={windowRef}
			class={[
				styles.window,
				focused && styles.windowFocused,
				variant === "seamless" && styles.windowSeamless,
				isHeaderHidden.value && styles.windowNoHeader,
			]
				.filter(Boolean)
				.join(" ")}
			style={{
				left: `${x}px`,
				top: `${y}px`,
				width: `${width}px`,
				height: `${height}px`,
				zIndex,
				"--window-color": color,
			}}
			onMouseDown={() => focusWindow(id)}
			role="dialog"
			aria-labelledby={`window-title-${id}`}
		>
			<WindowHeader
				id={id}
				icon={icon}
				color={color}
				onClose={() => closeWindow(id)}
				onMinimize={() => minimizeWindow(id)}
				onMouseDown={handleMouseDown}
				isDragging={isDragging}
				variant={variant}
				headerBackground={headerBackground}
				headerTextColor={headerTextColor}
			/>
			<div
				class={[
					styles.windowContent,
					variant === "seamless" && styles.windowContentSeamless,
				]
					.filter(Boolean)
					.join(" ")}
			>
				{getWindowContent(id, color)}
			</div>
		</div>
	);
}
