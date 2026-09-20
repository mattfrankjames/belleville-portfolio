/*
 * Animated artwork with a pause control.
 *
 * The page ships the still frame, so without JavaScript nothing moves. This
 * swaps in the animation and adds a Pause/Play button, which WCAG 2.2.2
 * requires for motion that runs longer than five seconds (this one loops).
 *
 * Under prefers-reduced-motion the still stays put and the button offers
 * Play, so the animation is available but never starts on its own.
 */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function setUpAnimation(figure) {
	const image = figure.querySelector("img");
	const { animationSrc, animationStill } = figure.dataset;
	if (!image || !animationSrc || !animationStill) return;

	const button = document.createElement("button");
	button.type = "button";
	button.className = "animation-toggle";
	figure.append(button);

	let playing = false;
	const setPlaying = (next) => {
		playing = next;
		// Re-assigning src restarts the animation from its first frame.
		image.src = playing ? animationSrc : animationStill;
		button.textContent = playing ? "Pause animation" : "Play animation";
	};

	button.addEventListener("click", () => setPlaying(!playing));
	setPlaying(!reducedMotion.matches);
}

for (const figure of document.querySelectorAll("[data-animation]")) {
	setUpAnimation(figure);
}
