import type { WindowConfig } from "./types";
import {Disc3} from "lucide-preact";

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
];
