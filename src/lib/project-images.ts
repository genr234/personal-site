import manifest from "./project-image-srcset.json";

export type ProjectImageVariant = {
	src: string;
	width: number;
};

const srcsets = manifest as Record<string, ProjectImageVariant[]>;

export function formatProjectSrcSet(variants: ProjectImageVariant[]): string {
	return variants.map((variant) => `${variant.src} ${variant.width}w`).join(", ");
}

export function projectImageSrcSet(src: string): string | undefined {
	const variants = srcsets[src];
	if (!variants?.length) return undefined;
	return formatProjectSrcSet(variants);
}

export function projectImageVariants(src: string): ProjectImageVariant[] {
	return srcsets[src] ?? [];
}
