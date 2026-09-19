// Build-time values that shouldn't live in editable content.
// Netlify sets URL to the site's primary URL during builds.
export default {
	url: process.env.URL || "http://localhost:8080",
	year: new Date().getFullYear(),
	isProduction: process.env.CONTEXT === "production",
};
