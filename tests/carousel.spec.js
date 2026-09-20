import { test, expect } from "@playwright/test";

const firstCarousel = (page) => page.locator("[data-carousel]").first();

test.describe("carousel: works without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("every project is present and linked", async ({ page }) => {
		await page.goto("/work/");
		const slides = page.locator(".carousel-slide");
		expect(await slides.count()).toBeGreaterThan(1);
		// Each slide's card links to its project page.
		for (const href of await page.locator(".carousel-slide .card-title a").evaluateAll((els) => els.map((a) => a.getAttribute("href")))) {
			expect(href).toMatch(/^\/work\/.+\/$/);
		}
		// Controls stay hidden: they do nothing without the script.
		await expect(page.locator("[data-carousel-controls]").first()).toBeHidden();

		// Nothing moves without the script, so no pause control is needed.
		const animated = page.locator("[data-animation] img");
		expect(await animated.getAttribute("src")).toContain("tgwdlm-still.webp");
		await expect(page.locator(".animation-toggle")).toHaveCount(0);
	});
});

test.describe("carousel: enhanced", () => {
	test("controls appear and are labelled", async ({ page }) => {
		await page.goto("/work/");
		const carousel = firstCarousel(page);
		await expect(carousel).toHaveAttribute("aria-roledescription", "carousel");
		await expect(carousel).toHaveAttribute("aria-labelledby", /section-/);
		await expect(carousel.locator("[data-carousel-controls]")).toBeVisible();

		// Slides are labelled "n of m" for screen readers.
		const slideLabels = await carousel.locator(".carousel-slide").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
		expect(slideLabels[0]).toBe(`1 of ${slideLabels.length}`);

		for (const name of [/previous project/i, /next project/i]) {
			await expect(carousel.getByRole("button", { name })).toBeVisible();
		}
	});

	test("next and previous move through the slides", async ({ page }) => {
		await page.goto("/work/");
		const carousel = firstCarousel(page);
		const status = carousel.locator("[data-carousel-status]");
		const next = carousel.getByRole("button", { name: /next project/i });
		const previous = carousel.getByRole("button", { name: /previous project/i });

		const total = await carousel.locator(".carousel-slide").count();
		await expect(previous).toHaveAttribute("aria-disabled", "true");
		await next.click();
		await expect(status).toHaveText(`2 of ${total}`);
		await previous.click();
		await expect(status).toHaveText(`1 of ${total}`);

		// Stepping to the end disables Next.
		for (let i = 1; i < total; i++) await next.click();
		await expect(status).toHaveText(`${total} of ${total}`);
		await expect(next).toHaveAttribute("aria-disabled", "true");
	});

	test("auto-play runs once, offers pause, and then stops", async ({ page }) => {
		await page.goto("/work/");
		// The section with the most projects; keep the pointer away so hover
		// doesn't pause it.
		const carousel = page.locator("[data-carousel]").last();
		const track = carousel.locator("[data-carousel-track]");
		const status = carousel.locator("[data-carousel-status]");
		await page.mouse.move(0, 0);

		// While rotating: pause button offered (WCAG 2.2.2), live region off.
		await expect(carousel.getByRole("button", { name: /pause automatic slideshow/i })).toBeVisible();
		await expect(track).toHaveAttribute("aria-live", "off");

		// It advances on its own...
		const total = await carousel.locator(".carousel-slide").count();
		await expect(status).not.toHaveText(`1 of ${total}`, { timeout: 15000 });
		// ...through to the last slide, then stops and announces politely.
		await expect(status).toHaveText(`${total} of ${total}`, { timeout: 30000 });
		await expect(track).toHaveAttribute("aria-live", "polite");
		await expect(carousel.getByRole("button", { name: /pause automatic slideshow/i })).toBeHidden();
	});

	test("pause button stops auto-play", async ({ page }) => {
		await page.goto("/work/");
		const carousel = page.locator("[data-carousel]").last();
		await page.mouse.move(0, 0);
		const pause = carousel.getByRole("button", { name: /pause automatic slideshow/i });
		await pause.click();

		await expect(carousel.locator("[data-carousel-track]")).toHaveAttribute("aria-live", "polite");
		await expect(carousel.getByRole("button", { name: /play automatic slideshow/i })).toBeVisible();
		const status = await carousel.locator("[data-carousel-status]").textContent();
		await page.waitForTimeout(6000);
		expect(await carousel.locator("[data-carousel-status]").textContent()).toBe(status);
	});

	test("no auto-play when reduced motion is preferred", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/work/");
		const carousel = page.locator("[data-carousel]").last();
		await page.mouse.move(0, 0);

		await expect(carousel.locator("[data-carousel-track]")).toHaveAttribute("aria-live", "polite");
		await expect(carousel.getByRole("button", { name: /pause automatic slideshow/i })).toBeHidden();
		const status = await carousel.locator("[data-carousel-status]").textContent();
		await page.waitForTimeout(6000);
		expect(await carousel.locator("[data-carousel-status]").textContent()).toBe(status);
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
		const links = await page.locator(".carousel-slide .card-title a").count();
		let reached = 0;
		for (let i = 0; i < 60 && reached < links; i++) {
			await page.keyboard.press("Tab");
			if (await page.evaluate(() => Boolean(document.activeElement?.closest(".carousel-slide")))) reached++;
		}
		expect(reached).toBe(links);
	});

	test("sections appear in the configured order", async ({ page }) => {
		await page.goto("/work/");
		const headings = await page.locator(".work-section > h2").allTextContents();
		expect(headings).toEqual(["Branding", "Infographics", "Typography", "Promotion"]);
	});
});
