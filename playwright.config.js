import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const isCI = Boolean(process.env.CI);

export default defineConfig({
	testDir: "tests",
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 1 : 0,
	reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: `http://localhost:${PORT}`,
	},
	// Serves the already-built _site/ folder. Run `npm run build` first
	// (`npm test` does this for you).
	webServer: {
		command: `node tests/serve.js ${PORT}`,
		url: `http://localhost:${PORT}/`,
		reuseExistingServer: !isCI,
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
