import type { WindowConfig } from "./types";

export const defaultWindowConfigs: WindowConfig[] = [
	{
		id: "music",
		title: "Music",
		color: "#ff0045",
		icon: "Disc3",
		initialSize: { width: 480, height: 600 },
		initialPosition: { x: 100, y: 80 },
		variant: "seamless",
		headerBackground: "#5626a1",
		headerTextColor: "#ffffff",
	},
	{
		id: "blog",
		title: "Blog",
		color: "#0066cc",
		icon: "FileText",
		initialSize: { width: 600, height: 500 },
		initialPosition: { x: 150, y: 120 },
		headerBackground: "#0066cc",
		headerTextColor: "#ffffff",
        shownByDefault: false
	},
	{
		id: "about",
		title: "About",
		color: "#6b21a8",
		icon: "User",
		initialSize: { width: 500, height: 450 },
		initialPosition: { x: 200, y: 160 },
		headerBackground: "#6b21a8",
		headerTextColor: "#ffffff",
        shownByDefault: false
	},
	{
		id: "contact",
		title: "Contact",
		color: "#059669",
		icon: "Mail",
		initialSize: { width: 520, height: 480 },
		initialPosition: { x: 250, y: 200 },
		headerBackground: "#059669",
		headerTextColor: "#ffffff",
        shownByDefault: false,
	},
];
