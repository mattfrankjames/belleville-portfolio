// Minimal static server for the built site, used by Playwright.
// Tests run against _site/ exactly as it will be deployed — not the
// Eleventy dev server, which injects a live-reload script and builds
// images on request.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../_site/", import.meta.url));
const port = Number(process.argv[2]) || 4173;

const types = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".xml": "application/xml; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
	".svg": "image/svg+xml",
	".avif": "image/avif",
	".webp": "image/webp",
	".png": "image/png",
	".jpg": "image/jpeg",
	".woff2": "font/woff2",
};

createServer(async (req, res) => {
	const { pathname } = new URL(req.url, "http://localhost");
	let file = normalize(join(root, decodeURIComponent(pathname)));

	if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) {
		res.writeHead(403).end();
		return;
	}
	if (pathname.endsWith("/")) file = join(file, "index.html");

	try {
		const body = await readFile(file);
		res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
		res.end(body);
	} catch {
		// Mirror Netlify: unknown paths get 404.html with a 404 status.
		const body = await readFile(join(root, "404.html")).catch(() => "Not found");
		res.writeHead(404, { "Content-Type": types[".html"] });
		res.end(body);
	}
}).listen(port, () => console.log(`Serving _site at http://localhost:${port}`));
