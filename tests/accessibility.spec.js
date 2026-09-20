import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { pages } from "./pages.js";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

function summarize(violations) {
	return violations
		.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`)
		.join("\n");
}

test.describe("axe: WCAG 2.2 AA", () => {
	for (const path of pages) {
		for (const colorScheme of ["light", "dark"]) {
			test(`${path} (${colorScheme})`, async ({ page }) => {
				await page.emulateMedia({ colorScheme });
				await page.goto(path);
				const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
				expect(violations.map((v) => v.id), summarize(violations)).toEqual([]);
			});
		}
	}
});

test.describe("keyboard", () => {
	test("skip link is first, visible on focus, and moves focus to main", async ({ page }) => {
		await page.goto("/");
		await page.keyboard.press("Tab");

		const skipLink = page.getByRole("link", { name: "Skip to content" });
		await expect(skipLink).toBeFocused();
		const box = await skipLink.boundingBox();
		expect(box?.width, "skip link should be visible when focused").toBeGreaterThan(1);

		await page.keyboard.press("Enter");
		await expect(page.locator("main")).toBeFocused();
	});

	test("focused links show a visible outline", async ({ page }) => {
		await page.goto("/");
		await page.keyboard.press("Tab"); // skip link
		await page.keyboard.press("Tab"); // site name
		const outline = await page.evaluate(() => {
			const style = getComputedStyle(document.activeElement);
			return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
		});
		expect(outline.style).not.toBe("none");
		expect(outline.width).toBeGreaterThanOrEqual(2);
	});
});

test.describe("navigation state", () => {
	test("the home page carries its navigation in the intro, with no site header", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator(".site-header")).toHaveCount(0);

		const nav = page.getByRole("navigation", { name: "Main" });
		await expect(nav).toBeVisible();
		for (const label of ["Work", "Contact"]) {
			await expect(nav.getByRole("link", { name: label })).toBeVisible();
		}
		// It sits below the heading and the line under it.
		const headingBottom = await page.locator("h1").evaluate((el) => el.getBoundingClientRect().bottom);
		const navTop = await nav.evaluate((el) => el.getBoundingClientRect().top);
		expect(navTop).toBeGreaterThan(headingBottom);
	});

	test("every other page keeps the site header", async ({ page }) => {
		for (const path of ["/work/", "/contact/", "/404.html"]) {
			await page.goto(path);
			await expect(page.locator(".site-header")).toBeVisible();
		}
	});

	test("Work is the current page on /work/", async ({ page }) => {
		await page.goto("/work/");
		const nav = page.getByRole("navigation", { name: "Main" });
		await expect(nav.getByRole("link", { name: "Work" })).toHaveAttribute("aria-current", "page");
		await expect(nav.getByRole("link", { name: "Contact" })).not.toHaveAttribute("aria-current");
	});

	test("Work is marked as the current section on project pages", async ({ page }) => {
		const project = pages.find((path) => /^\/work\/.+/.test(path));
		test.skip(!project, "no projects to test");
		await page.goto(project);
		const nav = page.getByRole("navigation", { name: "Main" });
		await expect(nav.getByRole("link", { name: "Work" })).toHaveAttribute("aria-current", "true");
	});
});
