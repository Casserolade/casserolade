/*
 * A cutscene page drawn live: its scenes sit in their hosts (data-composition-id, data-start, data-duration), each one
 * registered its paused GSAP timeline in window.__timelines. This builds the film from them, as HyperFrames does, and
 * draws any instant on demand: the game's player calls __film.seek(t) on every screen frame, at the time of the sound.
 * Every frame is a pure function of t; nothing here keeps a clock of its own.
 */
(function () {
  "use strict";
  const root = document.querySelector('[data-composition-id="main"]');
  const duration = Number(root.dataset.duration);
  const film = gsap.timeline({ paused: true });
  const hosts = [...root.querySelectorAll("[data-composition-id]")];

  for (const host of hosts) {
    const scene = window.__timelines[host.dataset.compositionId];
    if (scene) film.add(scene.paused(false), Number(host.dataset.start));
  }
  film.set({}, {}, duration);

  /** Each timed element is shown only during its window: a scene in the film, a line inside its scene. */
  const clips = [...root.querySelectorAll("[data-start]")].map((element) => {
    const host = element.parentElement.closest("[data-composition-id]");
    const offset = host && host !== root ? Number(host.dataset.start) : 0;
    const start = offset + Number(element.dataset.start);
    const length = element.dataset.duration === undefined ? Infinity : Number(element.dataset.duration);
    return { element, start, end: start + length, shown: null };
  });

  function seek(t) {
    for (const clip of clips) {
      const shown = t >= clip.start && t < clip.end;
      if (shown === clip.shown) continue;
      clip.shown = shown;
      clip.element.style.visibility = shown ? "" : "hidden";
    }
    // Callbacks on: the scenes draw from their onUpdate, in either direction.
    film.seek(Math.min(t, duration - 0.001), false);
  }

  const images = [...document.images, ...document.querySelectorAll("image")].map((image) => {
    const href = image.getAttribute("href") ?? image.getAttribute("src");
    if (!href) return Promise.resolve();
    const probe = new Image();
    probe.src = href;
    return probe.decode().catch(() => undefined);
  });
  seek(0);
  window.__film = { duration, seek, ready: Promise.all([document.fonts.ready, ...images]) };
})();
