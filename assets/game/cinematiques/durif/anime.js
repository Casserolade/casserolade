/* Shōnen anime toolkit for the Durif episodes: seeded randomness, speed lines, auras, his drawn hair, the rig.
 * Everything is a pure function of its arguments (and of the frame time it is given): renders are identical. */
(function () {
  const A = (window.Anime = {});
  A.INK = "#141018";
  A.RED = "#C0262D";
  A.ORANGE = "#F5A200";
  A.GOLD = "#FFD23F";
  A.SKIN = "#F2C29B";

  A.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  /** Hand-drawn life: a new drawing twelve times a second. */
  A.boil = (t) => Math.floor(t * 12);
  const f = (v) => v.toFixed(1);

  /** Radial speed lines: thin wedges from the frame edge towards the centre. */
  A.speedLines = function ({ cx = 960, cy = 540, count = 110, inner = 360, seed = 1, width = [1.5, 7], R = 2300 }) {
    const r = A.rng(seed);
    let d = "";
    for (let i = 0; i < count; i++) {
      const a = ((i + r() * 0.9) / count) * Math.PI * 2;
      const start = inner * (0.75 + r() * 0.9);
      const half = (width[0] + r() * (width[1] - width[0])) / R;
      d += `M${f(cx + Math.cos(a) * start)} ${f(cy + Math.sin(a) * start)}`;
      d += `L${f(cx + Math.cos(a - half) * R)} ${f(cy + Math.sin(a - half) * R)}`;
      d += `L${f(cx + Math.cos(a + half) * R)} ${f(cy + Math.sin(a + half) * R)}Z`;
    }
    return d;
  };

  /** Alternating wedges around a point, turned by `turn` radians. */
  A.sunburst = function ({ cx = 960, cy = 540, count = 24, turn = 0, R = 2400 }) {
    let d = "";
    for (let i = 0; i < count; i += 2) {
      const a0 = (i / count) * Math.PI * 2 + turn;
      const a1 = ((i + 1) / count) * Math.PI * 2 + turn;
      d += `M${cx} ${cy}L${f(cx + Math.cos(a0) * R)} ${f(cy + Math.sin(a0) * R)}L${f(cx + Math.cos(a1) * R)} ${f(cy + Math.sin(a1) * R)}Z`;
    }
    return d;
  };

  /** A hard-edged aura: flame tongues around an ellipse, longer upwards. */
  A.flame = function ({ cx, cy, rx, ry, n = 16, seed = 1, amp = 0.35, up = 0.9, dir = -1 }) {
    const r = A.rng(seed);
    const points = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      const upness = Math.max(0, dir * Math.sin(a));
      const peak = i % 2 === 0;
      const k = peak ? 1 + amp * (0.5 + r() * 0.9) + up * upness * (0.4 + r() * 0.9) : 1 - amp * 0.2 * r();
      let x = cx + Math.cos(a) * rx * k;
      let y = cy + Math.sin(a) * ry * k;
      if (peak) {
        y += dir * upness * ry * 0.2;
        x += (r() - 0.5) * rx * 0.2;
      }
      points.push([x, y]);
    }
    let d = `M${f(points[1][0])} ${f(points[1][1])}`;
    for (let i = 1; i < points.length; i += 2) {
      const peak = points[(i + 1) % points.length];
      const next = points[(i + 2) % points.length];
      const from = points[i];
      d += `Q${f((from[0] + peak[0]) / 2 + (peak[0] - cx) * 0.06)} ${f((from[1] + peak[1]) / 2)} ${f(peak[0])} ${f(peak[1])}`;
      d += `Q${f((peak[0] + next[0]) / 2)} ${f((peak[1] + next[1]) / 2 + 6)} ${f(next[0])} ${f(next[1])}`;
    }
    return d + "Z";
  };

  /** His frizzy hair, on the sides and the back only: the top of the skull stays bald, whatever happens. */
  A.hair = function ({ cx, cy, rx, ry, len = 0.35, up = 0, seed = 1, lift = 0, sharp = false }) {
    const r = A.rng(seed);
    const deg = Math.PI / 180;
    const sides = [
      [-22 - lift, 78],
      [102, 202 + lift],
    ];
    let d = "";
    for (const [a0, a1] of sides) {
      const n = 11;
      const outer = [];
      for (let k = 0; k <= n * 2; k++) {
        const a = (a0 + ((a1 - a0) * k) / (n * 2)) * deg;
        const peak = k % 2 === 1;
        const side = Math.cos(a) >= 0 ? 1 : -1;
        let bend = a - up * side * 0.5 * Math.max(0, Math.cos(a) * side);
        const k2 = peak ? 1 + len * (0.55 + r() * 0.75) : 1 + len * (0.12 + r() * 0.2);
        outer.push([cx + Math.cos(bend) * rx * k2, cy + Math.sin(bend) * ry * k2]);
      }
      d += `M${f(cx + Math.cos(a0 * deg) * rx * 0.86)} ${f(cy + Math.sin(a0 * deg) * ry * 0.86)}`;
      d += `L${f(outer[0][0])} ${f(outer[0][1])}`;
      for (let k = 1; k < outer.length - 1; k += 2) {
        const p = outer[k];
        const q = outer[k + 1];
        d += sharp ? `L${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}` : `Q${f(p[0])} ${f(p[1])} ${f(q[0])} ${f(q[1])}`;
      }
      d += `L${f(cx + Math.cos(a1 * deg) * rx * 0.86)} ${f(cy + Math.sin(a1 * deg) * ry * 0.86)}Z`;
    }
    return d;
  };

  /** The heads, cut out of real photos: size, chin, and the ellipse of the skull, chin at the origin. */
  A.HEADS = {
    neutre: { w: 398, h: 598, chin: [212.7, 566.7] },
    cri: { w: 373, h: 574, chin: [166.6, 534.0] },
    serieux: { w: 414, h: 584, chin: [222.1, 532.7] },
    rire: { w: 473, h: 604, chin: [197.1, 568.7] },
    perplexe: { w: 429, h: 514, chin: [195.4, 484.6] },
    lalanne: { w: 460, h: 576, chin: [321.6, 536.5] },
  };
  A.skull = function (name) {
    const h = A.HEADS[name];
    return { cx: h.w / 2 - h.chin[0], cy: -h.chin[1] / 2 - 10, rx: h.w / 2 - 14, ry: h.chin[1] / 2 };
  };

  /** One head image, chin at the origin. */
  A.headImage = function (id, name, file, visible) {
    const h = A.HEADS[name];
    return `<image id="${id}" href="img/${file || name + ".photo"}.webp" x="${-h.chin[0]}" y="${-h.chin[1]}" width="${h.w}" height="${h.h}" opacity="${visible ? 1 : 0}"/>`;
  };

  /** Stripes in his colours, for the pyjamas and the hoodie. */
  A.stripes = function (id, size = 46, angle = 0) {
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}" patternTransform="rotate(${angle})">
      <rect width="${size}" height="${size}" fill="${A.RED}"/><rect y="${size * 0.55}" width="${size}" height="${size * 0.3}" fill="${A.ORANGE}"/></pattern>`;
  };

  /** Screentone dots. */
  A.tone = function (id, pitch = 10, r = 2.2, color = A.INK) {
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${pitch}" height="${pitch}"><circle cx="${pitch / 2}" cy="${pitch / 2}" r="${r}" fill="${color}"/></pattern>`;
  };

  /**
   * A small super-deformed body, neck at the origin, in the units of the heads (a face is 420 high).
   * `fill` is a paint (a stripes pattern url); `child` makes it smaller and rounder.
   */
  A.body = function (id, fill, child) {
    const s = child ? 0.78 : 1;
    const k = (v) => f(v * s);
    const ink = `stroke="${A.INK}" stroke-width="12" stroke-linejoin="round"`;
    return `<g id="${id}">
      <g id="${id}-legs">
        <path d="M${k(-95)} ${k(300)} L${k(-110)} ${k(470)} Q${k(-112)} ${k(505)} ${k(-70)} ${k(505)} L${k(-20)} ${k(505)} L${k(-12)} ${k(310)}Z" fill="${fill}" ${ink}/>
        <path d="M${k(95)} ${k(300)} L${k(110)} ${k(470)} Q${k(112)} ${k(505)} ${k(70)} ${k(505)} L${k(20)} ${k(505)} L${k(12)} ${k(310)}Z" fill="${fill}" ${ink}/>
        <ellipse cx="${k(-78)}" cy="${k(512)}" rx="${k(62)}" ry="${k(30)}" fill="${A.SKIN}" ${ink}/>
        <ellipse cx="${k(78)}" cy="${k(512)}" rx="${k(62)}" ry="${k(30)}" fill="${A.SKIN}" ${ink}/>
      </g>
      <g id="${id}-arm-l"><path d="M${k(-120)} ${k(40)} Q${k(-215)} ${k(140)} ${k(-205)} ${k(265)} L${k(-150)} ${k(270)} Q${k(-150)} ${k(160)} ${k(-95)} ${k(105)}Z" fill="${fill}" ${ink}/>
        <circle cx="${k(-178)}" cy="${k(292)}" r="${k(38)}" fill="${A.SKIN}" ${ink}/></g>
      <g id="${id}-arm-r"><path d="M${k(120)} ${k(40)} Q${k(215)} ${k(140)} ${k(205)} ${k(265)} L${k(150)} ${k(270)} Q${k(150)} ${k(160)} ${k(95)} ${k(105)}Z" fill="${fill}" ${ink}/>
        <circle cx="${k(178)}" cy="${k(292)}" r="${k(38)}" fill="${A.SKIN}" ${ink}/></g>
      <path d="M${k(-60)} ${k(-8)} Q${k(-150)} ${k(10)} ${k(-150)} ${k(120)} L${k(-140)} ${k(330)} Q${k(0)} ${k(350)} ${k(140)} ${k(330)} L${k(150)} ${k(120)} Q${k(150)} ${k(10)} ${k(60)} ${k(-8)}Z" fill="${fill}" ${ink}/>
      <path d="M${k(-58)} ${k(-6)} Q${k(0)} ${k(60)} ${k(58)} ${k(-6)}" fill="${A.SKIN}" ${ink}/>
    </g>`;
  };

  /** Seeded shake of a wrapper after impacts: [{ at, amp }], decaying in about 8 frames. */
  A.shake = function (t, hits, seed = 7) {
    let x = 0;
    let y = 0;
    for (const h of hits) {
      const dt = t - h.at;
      if (dt < 0 || dt > 0.6) continue;
      const r = A.rng(seed + Math.floor(t * 30));
      const k = h.amp * Math.exp(-dt * 9);
      x += (r() * 2 - 1) * k;
      y += (r() * 2 - 1) * k;
    }
    return { x, y };
  };

  /** A field of stars, drawn once: dots and four-point sparkles. */
  A.stars = function ({ w = 1920, h = 1080, count = 160, seed = 3, color = "#FFF6D8" }) {
    const r = A.rng(seed);
    let d = "";
    for (let i = 0; i < count; i++) {
      const x = r() * w;
      const y = r() * h;
      const s = r() < 0.12 ? 9 + r() * 10 : 1.5 + r() * 2.5;
      if (s > 6) d += `M${f(x)} ${f(y - s)}Q${f(x)} ${f(y)} ${f(x + s)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y + s)}Q${f(x)} ${f(y)} ${f(x - s)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y - s)}Z`;
      else d += `M${f(x - s)} ${f(y)}a${f(s)} ${f(s)} 0 1 0 ${f(s * 2)} 0a${f(s)} ${f(s)} 0 1 0 ${f(-s * 2)} 0Z`;
    }
    return `<path d="${d}" fill="${color}"/>`;
  };

  /** Drive a draw function from a scene timeline: called with the scene time on every seek. */
  A.drive = function (tl, duration, draw) {
    const clock = { t: 0 };
    tl.fromTo(clock, { t: 0 }, { t: duration, duration, ease: "none", onUpdate: () => draw(clock.t) }, 0);
    draw(0);
  };
})();

/* The game's paper puppet: a cardboard body cut into pieces (the game's own cuts), a head cut out of a photo with
 * its jaw that talks. Feet at (x, y); k = 1 stands about 590 px tall. Faces come from window.PUPPET_ART. */
(function () {
  const A = window.Anime;
  const CUTS = { legfar: [0.22, 0.72, 0.5, 1], armfar: [0.05, 0.27, 0.24, 0.6], torso: [0.235, 0, 0.765, 0.74], legnear: [0.5, 0.72, 0.78, 1], armnear: [0.76, 0.27, 0.95, 0.6] };
  A.puppet = function (id, { x, y, k = 1, faces = ["durif"], body = "img/corps-pull.webp" }) {
    const W = 272 * k, H = 255 * k, left = x - W / 2, top = y - H;
    const neckY = y - 255 * k + 83 * k;
    const hs = 1.36 * k;
    let defs = "";
    const piece = (name) => {
      const [a, b, c, d] = CUTS[name];
      defs += `<clipPath id="${id}-c-${name}"><rect x="${left + a * W}" y="${top + b * H}" width="${(c - a) * W}" height="${(d - b) * H}"/></clipPath>`;
      return `<g id="${id}-${name}"><image href="${body}" x="${left}" y="${top}" width="${W}" height="${H}" clip-path="url(#${id}-c-${name})"/></g>`;
    };
    const jawPivots = {};
    const heads = faces.map((face, i) => {
      const art = window.PUPPET_ART[face];
      const hx = x - art.chin[0] * hs, hy = neckY - art.chin[1] * hs;
      const jx = hx + art.pose[0] * hs, jy = hy + art.pose[1] * hs;
      jawPivots[face] = [jx + art.pivot[0] * hs, jy + art.pivot[1] * hs];
      const key = face.replace(".", "-");
      return `<g id="${id}-face-${key}" opacity="${i === 0 ? 1 : 0}">
        <svg x="${hx}" y="${hy}" width="${art.head[2] * hs}" height="${art.head[3] * hs}" viewBox="${art.head.join(" ")}"><image href="${art.atlas}" width="${art.w}" height="${art.h}"/></svg>
        <g id="${id}-jaw-${key}"><svg x="${jx}" y="${jy}" width="${art.jaw[2] * hs}" height="${art.jaw[3] * hs}" viewBox="${art.jaw.join(" ")}"><image href="${art.atlas}" width="${art.w}" height="${art.h}"/></svg></g></g>`;
    }).join("");
    const parts = piece("legfar") + piece("armfar") + piece("torso") + piece("legnear") + heads + piece("armnear");
    return {
      markup: `<g id="${id}"><defs>${defs}</defs>${parts}</g>`,
      pivots: { armfar: [left + 0.24 * W, top + 0.33 * H], armnear: [left + 0.76 * W, top + 0.33 * H], legfar: [left + 0.36 * W, top + 0.74 * H], legnear: [left + 0.64 * W, top + 0.74 * H], feet: [x, y], jaw: jawPivots },
      faces,
      k,
    };
  };
  /** Pose a puppet built by A.puppet: arm angles in degrees (positive raises the arm outwards), jaw 0..1, the face. */
  A.pose = function (id, p, { armFar = 0, armNear = 0, legFar = 0, legNear = 0, open = 0, face = p.faces[0], sway = 0, dx = 0, dy = 0 } = {}) {
    const $ = (s) => document.getElementById(`${id}-${s}`);
    $("legfar").setAttribute("transform", `rotate(${legFar} ${p.pivots.legfar[0]} ${p.pivots.legfar[1]})`);
    $("legnear").setAttribute("transform", `rotate(${legNear} ${p.pivots.legnear[0]} ${p.pivots.legnear[1]})`);
    $("armfar").setAttribute("transform", `rotate(${armFar} ${p.pivots.armfar[0]} ${p.pivots.armfar[1]})`);
    $("armnear").setAttribute("transform", `rotate(${-armNear} ${p.pivots.armnear[0]} ${p.pivots.armnear[1]})`);
    for (const f of p.faces) {
      const key = f.replace(".", "-");
      $(`face-${key}`).setAttribute("opacity", f === face ? 1 : 0);
      const [px, py] = p.pivots.jaw[f];
      $(`jaw-${key}`).setAttribute("transform", `translate(0 ${(open * 22 * p.k).toFixed(1)}) rotate(${(open * 3).toFixed(1)} ${px} ${py})`);
    }
    document.getElementById(id).setAttribute("transform", `translate(${dx.toFixed(1)} ${dy.toFixed(1)}) rotate(${sway.toFixed(2)} ${p.pivots.feet[0]} ${p.pivots.feet[1]})`);
  };
  /** A jaw envelope (30 values a second) read at t seconds after the line starts. */
  A.jawAt = (env, t) => { const i = Math.floor(t * 30); return i >= 0 && i < env.length ? env[i] : 0; };
})();

/* The anime Durif: drawn body and hair, real face. Chin at (0, 0) inside a group the scene places and scales. */
(function () {
  const A = window.Anime;
  A.rig = function (id, { heads = ["serieux"], child = false, fill = "url(#stripes)", hairColor = "#B08A55" } = {}) {
    const images = heads.map((h, i) => A.headImage(`${id}-head-${h.replace(".", "-")}`, h.split(".")[0] === "vert" ? "serieux" : h.split(".")[0], h === "vert" ? "serieux.vert" : null, i === 0)).join("");
    return `<g id="${id}-body">${A.body(`${id}-b`, fill, child)}</g>
      <path id="${id}-hair" fill="${hairColor}" stroke="${A.INK}" stroke-width="13" stroke-linejoin="round"/>
      <g id="${id}-heads">${images}</g><g id="${id}-front"></g>`;
  };
  /** Show one head of a rig built by A.rig. */
  A.face = function (id, heads, which) {
    for (const h of heads) document.getElementById(`${id}-head-${h.replace(".", "-")}`).setAttribute("opacity", h === which ? 1 : 0);
  };
})();


/* His crappy car, in paper: faded gold, a primer door, rust, a cracked windscreen, a hanging bumper, a bare rim.
 * In the street's coordinates (about x 970-1790, y 430-950); wrap it in a transform to move it. */
window.Anime.paperCar = function () {
  return `<path d="M1130 690 L1220 560 Q1240 540 1270 540 L1540 540 Q1570 540 1590 565 L1660 690Z" fill="#CDB77E" stroke="#FFFFFF" stroke-width="6" stroke-linejoin="round" /> <path d="M1240 680 L1300 575 L1400 575 L1400 680Z M1420 680 L1420 575 L1540 575 L1600 680Z" fill="#9FB3C2" stroke="#FFFFFF" stroke-width="5" /> <path d="M1330 600 l25 30 l-12 18 l30 22 M1355 630 l28 -8" stroke="#FFFFFF" stroke-width="4" fill="none" /> <path d="M990 700 Q1000 680 1040 680 L1760 690 Q1790 700 1790 760 L1790 840 Q1790 870 1760 870 L1010 870 Q985 870 985 840Z" fill="#CDB77E" stroke="#FFFFFF" stroke-width="6" stroke-linejoin="round" /> <path d="M1300 690 L1430 692 L1430 866 L1300 866Z" fill="#8E9196" stroke="#FFFFFF" stroke-width="4" /> <path d="M1440 760 h40" stroke="#5E5A55" stroke-width="7" stroke-linecap="round" /> <path d="M1170 805 q40 -30 90 -6 q-10 30 -50 34 q-40 2 -40 -28Z" fill="#B49A62" /> <circle cx="1060" cy="790" r="16" fill="#8B4A2B" /><circle cx="1090" cy="815" r="9" fill="#8B4A2B" /><circle cx="1700" cy="830" r="13" fill="#8B4A2B" /><circle cx="1500" cy="845" r="8" fill="#8B4A2B" /> <path d="M990 738 h34 v40 h-34Z" fill="#E8E2B8" stroke="#FFFFFF" stroke-width="4" /> <path d="M1768 726 h22 v34 h-22Z" fill="#C0262D" stroke="#FFFFFF" stroke-width="4" /> <path d="M970 860 L1040 852 L1036 880 L968 892Z" fill="#7E838A" stroke="#FFFFFF" stroke-width="4" /> <path d="M1560 540 l70 -110" stroke="#5E5A55" stroke-width="5" /> <path d="M1630 430 l30 -12" stroke="#5E5A55" stroke-width="5" /> <g><ellipse cx="1140" cy="878" rx="72" ry="58" fill="#2B2B30" stroke="#FFFFFF" stroke-width="5" /><ellipse cx="1140" cy="878" rx="34" ry="28" fill="#4A4D52" /><circle cx="1140" cy="878" r="6" fill="#2B2B30" /></g> <g><circle cx="1640" cy="870" r="72" fill="#2B2B30" stroke="#FFFFFF" stroke-width="5" /><circle cx="1640" cy="870" r="42" fill="#C3CAD8" stroke="#8E9196" stroke-width="5" /><circle cx="1640" cy="870" r="10" fill="#8E9196" /></g>`;
};
