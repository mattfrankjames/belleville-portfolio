import { test, expect } from "@playwright/test";
import { pages } from "./pages.js";

test.describe("page structure & metadata", () => {
	for (const path of pages) {
		test(path, async ({ page }) => {
			await page.goto(path);

			await expect(page.locator("html")).toHaveAttribute("lang", /\S/);
			await expect(page).toHaveTitle(/\S/);
			await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S/);
			await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\//);
			await expect(page.locator("h1")).toHaveCount(1);

			// Heading levels never skip (e.g. h2 → h4).
			const levels = await page.locator("h1, h2, h3, h4, h5, h6").evaluateAll((els) =>
				els.map((el) => Number(el.tagName[1])),
			);
			levels.forEach((level, i) => {
				if (i > 0) expect(level - levels[i - 1], `heading order: ${levels.join(" → ")}`).toBeLessThanOrEqual(1);
			});

			// Every image has an alt attribute (empty is fine for decorative)
			// and explicit dimensions to prevent layout shift.
			const images = await page.locator("img").evaluateAll((els) =>
				els.map((img) => ({
					src: img.getAttribute("src"),
					hasAlt: img.hasAttribute("alt"),
					hasSize: img.hasAttribute("width") && img.hasAttribute("height"),
				})),
			);
			for (const img of images) {
				expect(img.hasAlt, `missing alt: ${img.src}`).toBe(true);
				expect(img.hasSize, `missing width/height: ${img.src}`).toBe(true);
			}
		});
	}

	test("page titles are unique", async ({ page }) => {
		const titles = [];
		for (const path of pages) {
			await page.goto(path);
			titles.push(await page.title());
		}
		const duplicates = titles.filter((title, i) => titles.indexOf(title) !== i);
		expect(duplicates).toEqual([]);
	});

	test("404 page is not indexed", async ({ page }) => {
		await page.goto("/404.html");
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
	});
});

test.describe("responsive layout", () => {
	for (const path of pages) {
		test(`${path} has no horizontal scroll at 320px`, async ({ page }) => {
			await page.setViewportSize({ width: 320, height: 640 });
			await page.goto(path);
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
			);
			expect(overflow).toBeLessThanOrEqual(0);
		});
	}
});

test("internal links and assets resolve", async ({ page, request }) => {
	const urls = new Set();
	for (const path of pages) {
		await page.goto(path);
		const found = await page.evaluate(() =>
			[
				...[...document.querySelectorAll("a[href]")].map((a) => a.href),
				...[...document.querySelectorAll("link[href]")].map((l) => l.href),
				...[...document.querySelectorAll("img[src], source[srcset]")].flatMap((el) =>
					el.srcset
						? el.srcset.split(",").map((c) => new URL(c.trim().split(/\s+/)[0], location.href).href)
						: [el.src],
				),
				// Canonical URLs use the production origin, so they're skipped here.
			].filter((url) => url.startsWith(location.origin)),
		);
		found.forEach((url) => urls.add(url.split("#")[0]));
	}

	const broken = [];
	for (const url of urls) {
		const response = await request.get(url);
		if (response.status() >= 400) broken.push(`${response.status()} ${url}`);
	}
	expect(broken).toEqual([]);
});
