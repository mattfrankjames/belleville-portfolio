import path from "node:path";
import { readFileSync } from "node:fs";
import browserslist from "browserslist";
import { bundle, browserslistToTargets } from "lightningcss";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

const cssTargets = browserslistToTargets(browserslist());

export default function (eleventyConfig) {
	/* ---------------------------------------------------------------
	 * CSS
	 * Each non-underscored .css file in src/ is an entry point.
	 * Lightning CSS inlines its @imports (keeping cascade layers),
	 * lowers modern syntax for our browserslist targets, and minifies.
	 * Files starting with "_" are partials and are not output.
	 * ------------------------------------------------------------- */
	eleventyConfig.setTemplateFormats(["md", "njk", "css"]);
	eleventyConfig.addExtension("css", {
		outputFileExtension: "css",
		compile(_inputContent, inputPath) {
			if (path.basename(inputPath).startsWith("_")) return;

			return () => {
				const { code } = bundle({
					filename: inputPath,
					minify: true,
					targets: cssTargets,
				});
				return code.toString();
			};
		},
	});

	/* ---------------------------------------------------------------
	 * Images
	 * Every <img> in the built HTML is converted to a responsive
	 * <picture> with AVIF + WebP at several widths. Width/height are
	 * added automatically — don't hard-code a `width` attribute in
	 * templates, because the plugin treats it as the only output width.
	 * Per-image attributes (loading, fetchpriority, sizes) override
	 * these defaults.
	 * ------------------------------------------------------------- */
	eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
		formats: ["avif", "webp"],
		widths: [480, 800, 1200, 1600],
		htmlOptions: {
			imgAttributes: {
				loading: "lazy",
				decoding: "async",
				sizes: "(min-width: 76rem) 72rem, calc(100vw - 2rem)",
			},
		},
	});

	/* ---------------------------------------------------------------
	 * Static files
	 * ------------------------------------------------------------- */
	// Animated media is served as-is; the image pipeline is for stills.
	eleventyConfig.addPassthroughCopy("src/assets/media");
	eleventyConfig.addPassthroughCopy("src/assets/js");

	// Brand fonts from npm (Fontsource): Latin + Latin Extended subsets only.
	eleventyConfig.addPassthroughCopy({
		"node_modules/@fontsource/boldonse/files/boldonse-latin{,-ext}-400-normal.woff2": "assets/fonts",
		"node_modules/@fontsource-variable/inter/files/inter-latin{,-ext}-opsz-{normal,italic}.woff2": "assets/fonts",
	});
	eleventyConfig.addPassthroughCopy("src/favicon.svg");

	/* ---------------------------------------------------------------
	 * Collections & filters
	 * ------------------------------------------------------------- */
	// Projects are ordered by their section (see src/_data/sections.json),
	// then by `order` within the section. This drives the work page, the
	// previous/next links and the sitemap.
	const sectionOrder = JSON.parse(
		readFileSync(new URL("./src/_data/sections.json", import.meta.url), "utf8"),
	).map((section) => section.id);

	eleventyConfig.addCollection("projects", (collectionApi) =>
		collectionApi.getFilteredByGlob("src/work/*.md").sort(
			(a, b) =>
				sectionOrder.indexOf(a.data.section) - sectionOrder.indexOf(b.data.section) ||
				(a.data.order ?? Infinity) - (b.data.order ?? Infinity) ||
				b.date - a.date,
		),
	);

	eleventyConfig.addFilter("bySection", (items = [], section) =>
		items.filter((item) => item.data.section === section),
	);

	// One project per section for the home page.
	eleventyConfig.addFilter("onePerSection", (items = []) => {
		const seen = new Set();
		return items.filter((item) => {
			if (seen.has(item.data.section)) return false;
			seen.add(item.data.section);
			return true;
		});
	});

	eleventyConfig.addFilter("absoluteUrl", (url, base) =>
		new URL(url, base).href,
	);

	/* ---------------------------------------------------------------
	 * Layout aliases — keeps front matter short (`layout: project`),
	 * which also keeps a future CMS config simple.
	 * ------------------------------------------------------------- */
	for (const name of ["base", "page", "home", "work", "project", "contact"]) {
		eleventyConfig.addLayoutAlias(name, `layouts/${name}.njk`);
	}

	return {
		dir: {
			input: "src",
			includes: "_includes",
			data: "_data",
			output: "_site",
		},
		markdownTemplateEngine: "njk",
		htmlTemplateEngine: "njk",
	};
}
