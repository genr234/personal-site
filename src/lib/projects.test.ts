import { describe, expect, it } from "vitest";
import { formatProjectSrcSet } from "./project-images";
import { getWork, workInTag, workSlides, type WorkItem } from "./projects";

const items: WorkItem[] = [
	{ id: "c-old", tag: "coding", title: "c", description: "", images: [], year: "2023" },
	{ id: "h-new", tag: "hackathons", title: "h", description: "", images: [], year: "Summer 2025" },
	{ id: "c-new", tag: "coding", title: "c2", description: "", images: [], year: "2025" },
	{ id: "h-old", tag: "hackathons", title: "h2", description: "", images: [], year: "2024" },
];

describe("workInTag", () => {
	it("keeps only that tag, newest first", () => {
		expect(workInTag(items, "coding").map((item) => item.id)).toEqual(["c-new", "c-old"]);
		expect(workInTag(items, "hackathons").map((item) => item.id)).toEqual(["h-new", "h-old"]);
	});
});

describe("workSlides", () => {
	it("returns the images list", () => {
		expect(workSlides({ ...items[0], images: ["/a.png", "/b.png"] })).toEqual(["/a.png", "/b.png"]);
	});
});

describe("formatProjectSrcSet", () => {
	it("lists each resized file with its width", () => {
		expect(
			formatProjectSrcSet([
				{ src: "/projects/display/640/shot.png", width: 640 },
				{ src: "/projects/display/1280/shot.png", width: 1280 },
			]),
		).toBe("/projects/display/640/shot.png 640w, /projects/display/1280/shot.png 1280w");
	});
});

describe("getWork", () => {
	it("finds an item by id", () => {
		expect(getWork("c-new", items)?.title).toBe("c2");
		expect(getWork("missing", items)).toBeUndefined();
	});
});
