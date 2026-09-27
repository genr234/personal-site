import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { ArrowLeft, ArrowRight, Code2, FolderKanban, Github } from "lucide-preact";
import { projectImageSrcSet } from "../../lib/project-images.ts";
import {
	getWork,
	stackIconSrc,
	workInTag,
	workItems,
	workSlides,
	type WorkItem,
	type WorkTag,
} from "../../lib/projects.ts";
import "../WindowSystem/styles/windows/projects-window.scss";

const TAGS: { id: WorkTag; label: string }[] = [
	{ id: "coding", label: "Coding" },
	{ id: "hackathons", label: "Hackathons" },
];

const TAG_LABEL: Record<WorkTag, string> = {
	coding: "Coding",
	hackathons: "Hackathons",
};

function ProjectIcon({ item }: { item: WorkItem }) {
	if (item.icon) {
		return <img className="project-icon" src={item.icon} alt="" />;
	}
	if (item.tag === "hackathons") {
		return <FolderKanban className="project-icon-svg" size={16} aria-hidden="true" />;
	}
	return <Code2 className="project-icon-svg" size={16} aria-hidden="true" />;
}

function ProjectShotImg({
	src,
	variant,
	className,
}: {
	src: string;
	variant: "card" | "detail";
	className: string;
}) {
	const srcSet = projectImageSrcSet(src);
	return (
		<img
			className={className}
			src={src}
			alt=""
			{...(srcSet
				? { srcSet, sizes: variant === "detail" ? "720px" : "380px" }
				: {})}
		/>
	);
}

function ProjectCarousel({
	slides,
	variant,
	onActivate,
}: {
	slides: string[];
	variant: "card" | "detail";
	onActivate?: () => void;
}) {
	const [index, setIndex] = useState(0);
	const [paused, setPaused] = useState(false);
	const outgoing = useRef<string | null>(null);
	const count = slides.length;
	const current = slides[index] ?? slides[0];
	const multi = count > 1;

	function go(delta: number) {
		outgoing.current = current ?? null;
		setIndex((value) => (value + delta + count) % count);
	}

	function goTo(next: number) {
		if (next === index) return;
		outgoing.current = current ?? null;
		setIndex(next);
	}

	useEffect(() => {
		if (!multi || variant !== "card" || paused) return;
		const reduceMotion =
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reduceMotion) return;
		const id = window.setInterval(() => go(1), 3000);
		return () => window.clearInterval(id);
	}, [multi, variant, paused, count, index]);

	useEffect(() => {
		if (!multi || variant !== "detail") return;
		function onKey(event: KeyboardEvent) {
			if (event.key === "ArrowLeft") {
				event.preventDefault();
				go(-1);
			}
			if (event.key === "ArrowRight") {
				event.preventDefault();
				go(1);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [multi, variant, count]);

	return (
		<div
			className={`project-carousel is-${variant}`}
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
		>
			<div
				className={`project-shot${variant === "detail" ? " project-shot-lg" : ""}`}
				onClick={onActivate}
			>
				{variant === "card" && outgoing.current && outgoing.current !== current ? (
					<ProjectShotImg className="is-outgoing" src={outgoing.current} variant={variant} />
				) : null}
				{current ? (
					<ProjectShotImg key={current} className="is-incoming" src={current} variant={variant} />
				) : null}
				{multi && variant === "detail" ? (
					<>
						<button
							type="button"
							className="carousel-nav is-prev"
							aria-label="Previous image"
							onClick={() => go(-1)}
						>
							<ArrowLeft size={16} />
						</button>
						<button
							type="button"
							className="carousel-nav is-next"
							aria-label="Next image"
							onClick={() => go(1)}
						>
							<ArrowRight size={16} />
						</button>
					</>
				) : null}
				{multi ? (
					<div className="carousel-dots" role="tablist" aria-label="Project images">
						{slides.map((src, i) => (
							<button
								key={`${src}-${i}`}
								type="button"
								role="tab"
								aria-selected={i === index}
								className={`carousel-dot${i === index ? " is-active" : ""}`}
								onClick={(event) => {
									event.stopPropagation();
									goTo(i);
								}}
							/>
						))}
					</div>
				) : null}
			</div>
		</div>
	);
}

function ProjectCard({ item, onOpen }: { item: WorkItem; onOpen: (id: string) => void }) {
	return (
		<article className="project-card">
			<ProjectCarousel
				slides={workSlides(item)}
				variant="card"
				onActivate={() => onOpen(item.id)}
			/>
			<button type="button" className="project-card-copy" onClick={() => onOpen(item.id)}>
				<div className="project-name">
					<ProjectIcon item={item} />
					<span>{item.title}</span>
				</div>
				<p className="project-desc">{item.description}</p>
			</button>
		</article>
	);
}

function ProjectDetail({ item, onBack }: { item: WorkItem; onBack: () => void }) {
	const slides = workSlides(item);

	return (
		<div className="project-detail">
			<button type="button" className="project-back" onClick={onBack}>
				<ArrowLeft size={16} aria-hidden="true" />
				Projects
			</button>
			<div className="projects-scroll">
				<ProjectCarousel slides={slides} variant="detail" />
				<div className="project-name">
					<ProjectIcon item={item} />
					<span>{item.title}</span>
				</div>
				<div className="project-meta-row">
					<p className="project-meta">
						{TAG_LABEL[item.tag]} · {item.year}
					</p>
					{item.stack?.length ? (
						<ul className="project-stack">
							{item.stack.map((entry) => (
								<li key={entry}>
									<img src={stackIconSrc(entry)} alt={entry} title={entry} />
								</li>
							))}
						</ul>
					) : null}
					{item.badge ? (
						<img className="project-badge" src={item.badge} alt="" />
					) : null}
				</div>
				<p className="project-desc project-desc-full">{item.description}</p>
				{item.longDescription ? (
					<p className="project-long-desc">{item.longDescription}</p>
				) : null}
				{(item.href || item.github) && (
					<div className="project-actions">
						{item.href ? (
							<a href={item.href} target="_blank" rel="noopener noreferrer">
								Visit site
								<ArrowRight size={14} aria-hidden="true" />
							</a>
						) : null}
						{item.github ? (
							<a
								className="is-github"
								href={item.github}
								target="_blank"
								rel="noopener noreferrer"
							>
								<Github size={14} aria-hidden="true" />
								GitHub
							</a>
						) : null}
					</div>
				)}
			</div>
		</div>
	);
}

export default function ProjectsWindow() {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const savedScroll = useRef(0);

	const coding = useMemo(() => workInTag(workItems, "coding"), []);
	const hackathons = useMemo(() => workInTag(workItems, "hackathons"), []);
	const selected = selectedId ? getWork(selectedId) : undefined;

	function openProject(id: string) {
		savedScroll.current = scrollRef.current?.scrollTop ?? 0;
		setSelectedId(id);
	}

	function closeProject() {
		setSelectedId(null);
	}

	useEffect(() => {
		if (selectedId) return;
		const el = scrollRef.current;
		if (el) el.scrollTop = savedScroll.current;
	}, [selectedId]);

	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if (event.key === "Escape" && selectedId) {
				event.stopPropagation();
				closeProject();
			}
		}
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [selectedId]);

	function jumpTo(tag: WorkTag) {
		document.getElementById(`work-${tag}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	if (selected) {
		return (
			<div className="projects-wrapper">
				<ProjectDetail item={selected} onBack={closeProject} />
			</div>
		);
	}

	return (
		<div className="projects-wrapper">
			<header className="projects-top">
				<div className="projects-tags" role="navigation" aria-label="Work sections">
					{TAGS.map((tag) => (
						<button
							key={tag.id}
							type="button"
							className="projects-tag"
							onClick={() => jumpTo(tag.id)}
						>
							{tag.label}
						</button>
					))}
				</div>
			</header>

			<div className="projects-scroll" ref={scrollRef}>
				<section id="work-coding" className="projects-section">
					<h2 className="projects-section-title">Coding</h2>
					<ul className="projects-grid">
						{coding.map((item) => (
							<li key={item.id}>
								<ProjectCard item={item} onOpen={openProject} />
							</li>
						))}
					</ul>
				</section>

				<section id="work-hackathons" className="projects-section">
					<h2 className="projects-section-title">Hackathons</h2>
					<ul className="projects-grid">
						{hackathons.map((item) => (
							<li key={item.id}>
								<ProjectCard item={item} onOpen={openProject} />
							</li>
						))}
					</ul>
				</section>
			</div>
		</div>
	);
}
