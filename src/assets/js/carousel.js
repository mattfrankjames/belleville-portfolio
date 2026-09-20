/*
 * Progressive enhancement for the work page carousels.
 *
 * Without this file each carousel is still a scroll-snapping row: every slide
 * is present and every card link is in the tab order. This adds previous/next
 * controls, a position readout, and one automatic pass through the slides.
 *
 * Accessibility:
 * - No auto-play under prefers-reduced-motion.
 * - While auto-play runs, a Pause button is shown (WCAG 2.2.2) and the track
 *   is aria-live="off". Paused or finished, it is aria-live="polite" so moves
 *   are announced.
 * - Hovering the slides pauses; leaving resumes (unless the visitor paused).
 * - Interacting with the slides — pointer, wheel, keyboard, focus — cancels
 *   the automatic pass for good. It never restarts on its own.
 */

const AUTOPLAY_DELAY = 4500;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

class Carousel {
	constructor(root) {
		this.root = root;
		this.track = root.querySelector("[data-carousel-track]");
		this.slides = [...root.querySelectorAll(".carousel-slide")];
		this.controls = root.querySelector("[data-carousel-controls]");
		if (!this.track || this.slides.length < 2 || !this.controls) return;

		this.previousButton = root.querySelector("[data-carousel-prev]");
		this.nextButton = root.querySelector("[data-carousel-next]");
		this.toggleButton = root.querySelector("[data-carousel-toggle]");
		this.toggleLabel = root.querySelector("[data-carousel-toggle-label]");
		this.status = root.querySelector("[data-carousel-status]");

		this.index = 0;
		this.timer = null;
		this.autoFinished = false; // cancelled or played all the way through
		this.pausedByUser = false;

		this.controls.hidden = false;
		this.previousButton.addEventListener("click", () => this.step(-1));
		this.nextButton.addEventListener("click", () => this.step(1));
		this.toggleButton.addEventListener("click", () => this.toggle());

		this.track.addEventListener("scrollend", () => this.sync(), { passive: true });
		this.track.addEventListener("scroll", () => this.scheduleSync(), { passive: true });
		for (const event of ["pointerdown", "wheel", "touchstart", "keydown", "focusin"]) {
			this.track.addEventListener(event, () => this.cancelAuto(), { passive: true });
		}
		this.track.addEventListener("mouseenter", () => this.pause(false));
		this.track.addEventListener("mouseleave", () => this.resume(false));
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) this.pause(false);
			else this.resume(false);
		});

		this.sync();
		if (reducedMotion.matches) this.finishAuto();
		else this.start();
	}

	/** Index of the slide nearest the start of the scroll port. */
	currentIndex() {
		const maxScroll = this.track.scrollWidth - this.track.clientWidth;
		// At the end of the track the last slide can't reach the start edge,
		// so treat "scrolled as far as possible" as the last slide.
		if (maxScroll > 0 && this.track.scrollLeft >= maxScroll - 1) {
			return this.slides.length - 1;
		}
		let closest = 0;
		let distance = Infinity;
		for (const [i, slide] of this.slides.entries()) {
			const offset = Math.abs(slide.offsetLeft - this.track.offsetLeft - this.track.scrollLeft);
			if (offset < distance) {
				distance = offset;
				closest = i;
			}
		}
		return closest;
	}

	scheduleSync() {
		clearTimeout(this.syncTimer);
		this.syncTimer = setTimeout(() => this.sync(), 120);
	}

	sync() {
		this.index = this.currentIndex();
		this.status.textContent = `${this.index + 1} of ${this.slides.length}`;
		this.previousButton.setAttribute("aria-disabled", String(this.index === 0));
		this.nextButton.setAttribute("aria-disabled", String(this.index === this.slides.length - 1));
	}

	goTo(index) {
		const slide = this.slides[Math.max(0, Math.min(index, this.slides.length - 1))];
		this.track.scrollTo({
			left: slide.offsetLeft - this.track.offsetLeft,
			behavior: reducedMotion.matches ? "auto" : "smooth",
		});
	}

	/** Manual move. Never wraps, and takes the carousel off auto-play. */
	step(direction) {
		this.cancelAuto();
		const next = this.index + direction;
		if (next < 0 || next > this.slides.length - 1) return;
		this.index = next;
		this.goTo(next);
		// Status updates from the scroll listeners once the move lands;
		// reading scrollLeft now would still report the old slide.
	}

	start() {
		if (this.autoFinished || this.timer) return;
		this.toggleButton.hidden = false;
		this.toggleLabel.textContent = "Pause";
		this.track.setAttribute("aria-live", "off");
		this.timer = setInterval(() => {
			const next = this.index + 1;
			if (next > this.slides.length - 1) {
				this.finishAuto();
				return;
			}
			this.index = next;
			this.goTo(next);
		}, AUTOPLAY_DELAY);
	}

	/** Temporary stop: hover, hidden tab, or the visitor pressing Pause. */
	pause(byUser) {
		if (byUser) this.pausedByUser = true;
		if (!this.timer) return;
		clearInterval(this.timer);
		this.timer = null;
		this.toggleLabel.textContent = "Play";
		this.track.setAttribute("aria-live", "polite");
	}

	resume(byUser) {
		if (this.autoFinished) return;
		if (byUser) this.pausedByUser = false;
		else if (this.pausedByUser || document.hidden) return;
		this.start();
	}

	/** The automatic pass is over: it played out, or the visitor took over. */
	finishAuto() {
		clearInterval(this.timer);
		this.timer = null;
		this.autoFinished = true;
		this.toggleButton.hidden = true;
		this.track.setAttribute("aria-live", "polite");
	}

	cancelAuto() {
		if (!this.autoFinished) this.finishAuto();
	}

	toggle() {
		if (this.timer) this.pause(true);
		else this.resume(true);
	}
}

for (const root of document.querySelectorAll("[data-carousel]")) {
	new Carousel(root);
}
