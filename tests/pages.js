// The list of pages to test comes from the built sitemap, so new projects
// and pages are covered automatically. 404.html is added because it is
// intentionally left out of the sitemap.
import { readFileSync } from "node:fs";

let sitemap;
try {
	sitemap = readFileSync(new URL("../_site/sitemap.xml", import.meta.url), "utf8");
} catch {
	throw new Error("_site/sitemap.xml not found — run `npm run build` before the tests.");
}

export const pages = [
	...[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, loc]) => new URL(loc).pathname),
	"/404.html",
];
