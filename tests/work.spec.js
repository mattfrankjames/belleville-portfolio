import { test, expect } from "@playwright/test";

test.describe("work page: without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("every project is present and linked", async ({ page }) => {
		await page.goto("/work/");
		const cards = page.locator(".work-grid .card");
		expect(await cards.count()).toBeGreaterThan(1);
		for (const href of await page.locator(".work-grid .card-title a").evaluateAll((els) => els.map((a) => a.getAttribute("href")))) {
			expect(href).toMatch(/^\/work\/.+\/$/);
		}
		// Every card is on screen without any interaction: nothing is hidden
		// off to the side.
		for (const card of await cards.all()) {
			await card.scrollIntoViewIfNeeded();
			await expect(card).toBeInViewport();
		}

		// Nothing moves without the script, so no pause control is needed.
		const animated = page.locator("[data-animation] img");
		expect(await animated.getAttribute("src")).toContain("tgwdlm-still.webp");
		await expect(page.locator(".animation-toggle")).toHaveCount(0);
	});
});

test.describe("work page", () => {
	test("section links jump to each section", async ({ page }) => {
		await page.goto("/work/");
		const nav = page.getByRole("navigation", { name: "Sections" });
		const links = nav.getByRole("link");
		const headings = await page.locator(".work-section > h2").allTextContents();
		expect(await links.allTextContents()).toEqual(headings);

		const last = links.last();
		const target = await last.getAttribute("href");
		await last.click();
		await expect(page).toHaveURL(new RegExp(`${target}$`));
		await expect(page.locator(target)).toBeInViewport();
	});

	test("scrolling is smooth unless reduced motion is preferred", async ({ page }) => {
		await page.goto("/work/");
		expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("smooth");
		await page.emulateMedia({ reducedMotion: "reduce" });
		expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
	});

	test("artwork keeps its natural proportions", async ({ page }) => {
		await page.goto("/work/");
		const ratios = await page.locator(".work-grid .card-image").evaluateAll((imgs) =>
			imgs.map((img) => ({
				src: img.currentSrc || img.src,
				rendered: img.getBoundingClientRect().height / img.getBoundingClientRect().width,
				natural: Number(img.getAttribute("height")) / Number(img.getAttribute("width")),
			})),
		);
		expect(ratios.length).toBeGreaterThan(0);
		for (const { src, rendered, natural } of ratios) {
			expect(rendered, `cropped: ${src}`).toBeCloseTo(natural, 1);
		}
	});

	test("animation plays, can be paused, and needs no JavaScript to be safe", async ({ page }) => {
		await page.goto("/work/");
		const figure = page.locator("[data-animation]").first();
		const image = figure.locator("img");
		await image.scrollIntoViewIfNeeded(); // it lazy-loads

		// The script swaps the still for the animation and adds the control.
		await expect(image).toHaveAttribute("src", /tgwdlm-animation\.webp/);
		await expect(image).toHaveJSProperty("complete", true);

		// Motion runs longer than 5s, so a pause control is required (WCAG 2.2.2).
		const pause = figure.getByRole("button", { name: /pause animation/i });
		await expect(pause).toBeVisible();
		await pause.click();
		await expect(image).toHaveAttribute("src", /tgwdlm-still\.webp/);
		await expect(figure.getByRole("button", { name: /play animation/i })).toBeVisible();
	});

	test("animation does not start under reduced motion", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/work/");
		const figure = page.locator("[data-animation]").first();
		const image = figure.locator("img");
		await image.scrollIntoViewIfNeeded();

		await expect(image).toHaveAttribute("src", /tgwdlm-still\.webp/);
		await expect(image).toHaveJSProperty("complete", true);
		await expect(figure.getByRole("button", { name: /play animation/i })).toBeVisible();
	});

	test("keyboard reaches every project link", async ({ page }) => {
		await page.goto("/work/");
		const links = await page.locator(".work-grid .card-title a").count();
		let reached = 0;
		for (let i = 0; i < 60 && reached < links; i++) {
			await page.keyboard.press("Tab");
			if (await page.evaluate(() => Boolean(document.activeElement?.closest(".work-grid")))) reached++;
		}
		expect(reached).toBe(links);
	});

	test("sections appear in the configured order", async ({ page }) => {
		await page.goto("/work/");
		const headings = await page.locator(".work-section > h2").allTextContents();
		expect(headings).toEqual(["Branding", "Infographics", "Typography", "Promotion"]);
	});
});
