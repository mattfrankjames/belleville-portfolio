import path from "node:path";
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
	// Brand fonts from npm (Fontsource): Latin + Latin Extended subsets only.
	eleventyConfig.addPassthroughCopy({
		"node_modules/@fontsource/boldonse/files/boldonse-latin{,-ext}-400-normal.woff2": "assets/fonts",
		"node_modules/@fontsource-variable/inter/files/inter-latin{,-ext}-opsz-{normal,italic}.woff2": "assets/fonts",
	});
	eleventyConfig.addPassthroughCopy("src/favicon.svg");

	/* ---------------------------------------------------------------
	 * Collections & filters
	 * ------------------------------------------------------------- */
	// Projects are sorted by `order` (lowest first), then newest first.
	eleventyConfig.addCollection("projects", (collectionApi) =>
		collectionApi
			.getFilteredByGlob("src/work/*.md")
			.sort(
				(a, b) =>
					(a.data.order ?? Infinity) - (b.data.order ?? Infinity) ||
					b.date - a.date,
			),
	);

	eleventyConfig.addFilter("featured", (items = []) =>
		items.filter((item) => item.data.featured),
	);

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
