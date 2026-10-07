export type WorkTag = "coding" | "hackathons";

export interface WorkItem {
	id: string;
	tag: WorkTag;
	title: string;
	description: string;
	images: string[];
	icon?: string;
	href?: string;
	github?: string;
	year: string;
	longDescription?: string;
	badge?: string;
	/** Hackatime project name, when it differs from the id. */
	hackatime?: string;
	stack?: string[];
}

export function stackIconSrc(entry: string): string {
	if (entry.startsWith("/") || entry.startsWith("http")) return entry;
	return `https://cdn.simpleicons.org/${entry}`;
}

export const workItems: WorkItem[] = [
	{
		id: "europa",
		tag: "hackathons",
		title: "Horizons Europa",
		description:
			"70+ Person hackathon in Europe's techno capital: Berlin!",
		images: ["/projects/europa.jpg"],
		icon: "/projects/europa_logo.png",
		href: "https://horizons.hackclub.com/",
		year: "July 2026",
	},
	{
		id: "stardew",
		tag: "coding",
		title: "Stardew.js",
		description:
			"Stardew Valley ported to the web using WebAssembly with multiplayer support.",
		images: ["/projects/stardewjs.png"],
		icon: "/projects/stardew_logo.png",
		href: "https://stardew.genr234.com/",
		stack: ["alpinedotjs", "webassembly", "dotnet"],
		hackatime: "stardew-web",
		year: "September 2026",
	},
	{
		id: "campfire",
		tag: "hackathons",
		title: "Campfire Acireale",
		description: "30 Teenagers hackathon in Sicily",
		images: ["/projects/campfire.jpg"],
		icon: "/projects/campfire_logo.svg",
		href: "https://campfire.hackclub.com/acireale",
		year: "Feb-Mar 2026",
	},
	{
		id: "milkyway",
		tag: "coding",
		title: "Milkyway",
		description: "Online platform for Milkyway, where over 3000 teenagers built their own little house logging over 17000 hours of gamedev and got prizes irl!",
		images: ["/projects/milkyway.png", "/projects/milkyway2.png", "/projects/milkyway3.png"],
		icon: "/projects/milkyway_icon.png",
		badge: "https://hackatime.hackclub.com/api/v1/badge/U07JEDAMFV3/genr234/milkyway",
		href: "https://milkyway.hackclub.com",
		github: "https://github.com/hackclub/milkyway",
		stack: ["svelte"],
		year: "2026",
	}
];

function yearSortKey(year: string): number {
	const match = year.match(/\d{4}/);
	return match ? Number(match[0]) : 0;
}

export function workInTag(items: WorkItem[], tag: WorkTag): WorkItem[] {
	return items
		.filter((item) => item.tag === tag)
		.sort((a, b) => yearSortKey(b.year) - yearSortKey(a.year));
}

export function getWork(id: string, items: WorkItem[] = workItems): WorkItem | undefined {
	return items.find((item) => item.id === id);
}

export function workSlides(item: WorkItem): string[] {
	return item.images;
}
