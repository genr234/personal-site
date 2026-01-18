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
		color: "#F9F8F6",
        variant: "seamless",
		icon: "User",
		initialSize: { width: 700, height: 500 },
		initialPosition: { x: 200, y: 160 },
		headerBackground: "#F9F8F6",
		headerTextColor: "#001666",
        shownByDefault: false
	},
	{
		id: "contact",
		title: "Contact",
		color: "#059669",
        variant: "seamless",
		icon: "Mail",
		initialSize: { width: 520, height: 500 },
		initialPosition: { x: 250, y: 200 },
		headerBackground: "#F9F8F6",
		headerTextColor: "#059669",
        shownByDefault: false,
	},
];
