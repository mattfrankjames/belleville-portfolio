// Performance budgets. These guard the site's core promises: minimal,
// framework-free JavaScript that never blocks rendering, one small stylesheet,
// and responsive, correctly prioritized images.
// If a budget needs to change, change it here deliberately.
import { statSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { pages } from "./pages.js";

const BUDGET = {
	cssBytes: 20 * 1024,
	htmlBytes: 50 * 1024,
	// Total JavaScript per page, uncompressed. Room for small progressive
	// enhancements; far too small for a framework runtime.
	jsBytes: 30 * 1024,
};

test("stylesheet is within budget", () => {
	const { size } = statSync(new URL("../_site/assets/css/main.css", import.meta.url));
	expect(size, `main.css is ${size} bytes`).toBeLessThanOrEqual(BUDGET.cssBytes);
});

for (const path of pages) {
	test.describe(path, () => {
		test("HTML is within budget and loads one stylesheet", async ({ page }) => {
			const response = await page.goto(path);
			const html = await response.text();
			expect(Buffer.byteLength(html), "HTML size").toBeLessThanOrEqual(BUDGET.htmlBytes);
			await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(1);
		});

		test("JavaScript is within budget and never blocks rendering", async ({ page }) => {
			const scriptResponses = [];
			page.on("response", (response) => {
				if (response.request().resourceType() === "script") scriptResponses.push(response);
			});
			await page.goto(path);
			await page.waitForLoadState("networkidle"); // include lazily imported modules

			const sizes = await Promise.all(
				scriptResponses.map(async (response) => ({ url: response.url(), bytes: (await response.body()).length })),
			);
			const total = sizes.reduce((sum, { bytes }) => sum + bytes, 0);
			expect(
				total,
				`JavaScript is ${total} bytes:\n${sizes.map((s) => `  ${s.bytes} ${s.url}`).join("\n")}`,
			).toBeLessThanOrEqual(BUDGET.jsBytes);

			const scripts = await page.locator("script").evaluateAll((els) =>
				els.map((el) => ({
					src: el.src,
					type: el.type,
					isInline: !el.hasAttribute("src"),
					isNonBlocking: el.type === "module" || el.defer || el.async,
				})),
			);

			// External scripts must not block parsing: use type="module", defer, or async.
			const blocking = scripts.filter((s) => !s.isInline && !s.isNonBlocking).map((s) => s.src);
			expect(blocking, "render-blocking scripts").toEqual([]);

			// The Content-Security-Policy in netlify.toml only allows same-origin
			// script files, so inline or third-party scripts would silently fail
			// in production. JSON-LD is data, not code, so it's allowed.
			const blockedByCsp = scripts
				.filter((s) =>
					s.isInline ? s.type !== "application/ld+json" : new URL(s.src).origin !== new URL(page.url()).origin,
				)
				.map((s) => s.src || `inline <script${s.type ? ` type="${s.type}"` : ""}>`);
			expect(
				blockedByCsp,
				"scripts the CSP will block — move code into a same-origin file, or update the CSP in netlify.toml",
			).toEqual([]);
		});

		test("images are optimized and prioritized", async ({ page }) => {
			await page.goto(path);
			const images = await page.locator("img").evaluateAll((els) =>
				els.map((img) => ({
					src: img.getAttribute("src"),
					inPicture: img.parentElement?.tagName === "PICTURE",
					hasAvif: Boolean(img.parentElement?.querySelector('source[type="image/avif"]')),
					// Animated covers skip the pipeline (it flattens animation) but
					// must offer a still frame to visitors who prefer reduced motion.
					isAnimated: /\.(gif|webp)$/.test(img.getAttribute("src") ?? "") &&
						Boolean(img.parentElement?.querySelector('source[media*="prefers-reduced-motion"]')),
					loading: img.getAttribute("loading"),
					fetchpriority: img.getAttribute("fetchpriority"),
				})),
			);

			for (const img of images) {
				expect(
					img.inPicture && (img.hasAvif || img.isAnimated),
					`not run through the image pipeline, and not an animation with a reduced-motion still: ${img.src}`,
				).toBe(true);

				// Only the hero may be eager/high priority; everything else lazy-loads.
				if (img.fetchpriority === "high") {
					expect(img.loading, `high-priority image must not lazy-load: ${img.src}`).not.toBe("lazy");
				} else {
					expect(img.loading, `should lazy-load: ${img.src}`).toBe("lazy");
				}
			}

			const highPriority = images.filter((img) => img.fetchpriority === "high");
			expect(highPriority.length, "at most one fetchpriority=high image").toBeLessThanOrEqual(1);
		});
	});
}
