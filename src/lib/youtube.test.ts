import { describe, expect, it } from "vitest";
import { getYoutubeIdFromUrl, youtubeThumbnailUrl } from "./youtube";

describe("youtube helpers", () => {
	it("parses watch, short, embed, and shorts urls", () => {
		expect(
			getYoutubeIdFromUrl("https://www.youtube.com/watch?v=2b1IexhKPz4"),
		).toBe("2b1IexhKPz4");
		expect(getYoutubeIdFromUrl("https://youtu.be/2b1IexhKPz4")).toBe(
			"2b1IexhKPz4",
		);
		expect(
			getYoutubeIdFromUrl("https://www.youtube.com/embed/2b1IexhKPz4"),
		).toBe("2b1IexhKPz4");
		expect(
			getYoutubeIdFromUrl("https://www.youtube.com/shorts/2b1IexhKPz4"),
		).toBe("2b1IexhKPz4");
	});

	it("returns null for missing or invalid urls", () => {
		expect(getYoutubeIdFromUrl()).toBeNull();
		expect(getYoutubeIdFromUrl("not-a-url")).toBeNull();
	});

	it("builds a thumbnail url", () => {
		expect(youtubeThumbnailUrl("abc")).toBe(
			"https://i.ytimg.com/vi/abc/hqdefault.jpg",
		);
	});
});
