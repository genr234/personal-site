import type { APIRoute } from "astro";
import { projectImageVariants } from "../lib/project-images";
import { stackIconSrc, workInTag, workItems } from "../lib/projects";

// Public feed of the Projects window, consumed by the GitHub profile README.
export const prerender = true;

export const GET: APIRoute = ({ site }) => {
	const abs = (path: string) => new URL(path, site).href;

	const projects = [
		...workInTag(workItems, "coding"),
		...workInTag(workItems, "hackathons"),
	].map((item) => ({
		...item,
		images: item.images.map(abs),
		thumbnail: abs(
			projectImageVariants(item.images[0])[0]?.src ?? item.images[0],
		),
		icon: item.icon && abs(item.icon),
		stack: item.stack?.map((entry) => ({
			name: entry,
			icon: abs(stackIconSrc(entry)),
		})),
	}));

	return new Response(JSON.stringify({ projects }, null, "\t"), {
		headers: { "Content-Type": "application/json" },
	});
};
