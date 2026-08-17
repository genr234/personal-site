import { beforeEach, describe, expect, it } from "vitest";
import type { WindowConfig } from "./types";
import {
	closeWindow,
	createWindow,
	focusWindow,
	minimizeWindow,
	restoreWindow,
	setMobileMode,
	windowsSignal,
} from "./windowManager";

const config: WindowConfig = {
	id: "about",
	title: "About",
	color: "#fff",
	icon: "User",
	initialSize: { width: 700, height: 500 },
	initialPosition: { x: 200, y: 160 },
};

beforeEach(() => {
	windowsSignal.value = [];
	setMobileMode(false);
});

describe("window manager", () => {
	it("does not create duplicate windows", () => {
		createWindow(config);
		createWindow(config);
		expect(windowsSignal.value).toHaveLength(1);
	});

	it("minimizes and restores a window", () => {
		createWindow(config);
		minimizeWindow(config.id);
		expect(windowsSignal.value[0].minimized).toBe(true);
		restoreWindow(config.id);
		expect(windowsSignal.value[0].minimized).toBe(false);
		expect(windowsSignal.value[0].focused).toBe(true);
	});

	it("focuses one window at a time and closes it", () => {
		createWindow(config);
		createWindow({ ...config, id: "contact", title: "Contact", icon: "Mail" });
		focusWindow(config.id);
		expect(windowsSignal.value.find((window) => window.id === config.id)?.focused).toBe(true);
		expect(windowsSignal.value.find((window) => window.id === "contact")?.focused).toBe(false);
		closeWindow(config.id);
		expect(windowsSignal.value.map((window) => window.id)).toEqual(["contact"]);
	});
});
