import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { workItems } from "../src/lib/projects.ts";

const WIDTHS = [640, 1280];
const root = path.resolve(import.meta.dirname, "..");

const sources = [...new Set(workItems.flatMap((item) => item.images))];
const manifest: Record<string, { src: string; width: number }[]> = {};

for (const src of sources) {
	const input = path.join(root, "public", src.replace(/^\//, ""));
	const filename = path.basename(input);
	const metadata = await sharp(input).metadata();
	const variants: { src: string; width: number }[] = [];

	for (const width of WIDTHS) {
		if (!metadata.width || metadata.width <= width) continue;

		const rel = `/projects/display/${width}/${filename}`;
		const output = path.join(root, "public", rel.slice(1));
		await mkdir(path.dirname(output), { recursive: true });

		const resized = sharp(input).resize({
			width,
			withoutEnlargement: true,
			kernel: "lanczos3",
		});

		if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
			await resized.jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" }).toFile(output);
		} else {
			await resized.png({ compressionLevel: 9 }).toFile(output);
		}

		variants.push({ src: rel, width });
	}

	if (variants.length > 0) manifest[src] = variants;
}

await writeFile(
	path.join(root, "src/lib/project-image-srcset.json"),
	`${JSON.stringify(manifest, null, "\t")}\n`,
);

console.log(`resized ${Object.keys(manifest).length} project images`);
