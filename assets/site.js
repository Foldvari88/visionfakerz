function spotifySearchUrl(query) {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

const SPOTIFY = {
  artistUrl: spotifySearchUrl("artist:VisionFakerz"),
  playlistUrl: spotifySearchUrl("This Is VisionFakerz"),
  playlistEmbedUrl: "",
  tracks: [
    {
      title: "Whoremonger",
      year: "2020",
      mood: "dirty neon proof that the signal lies",
      palette: ["#ff0808", "#f5007a", "#ffffff"],
      pattern: "teeth",
      url: spotifySearchUrl("track:Whoremonger artist:VisionFakerz"),
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/d2/2b/9b/d22b9b2f-3186-27cc-729f-6b5feb529131/mzaf_4824860360785189707.plus.aac.p.m4a",
      embedUrl: ""
    },
    {
      title: "Blackjack",
      year: "2020",
      mood: "rigged odds inside the fake vision",
      palette: ["#ff0808", "#ffd24a", "#ffffff"],
      pattern: "cards",
      url: spotifySearchUrl("track:Blackjack artist:VisionFakerz"),
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/7b/03/a9/7b03a98d-8f82-2018-de4e-baf5319666e3/mzaf_13953828956317181482.plus.aac.p.m4a",
      embedUrl: ""
    },
    {
      title: "Rigour",
      year: "2020",
      mood: "strict geometry forcing reality to fold",
      palette: ["#ff0808", "#9b9b9b", "#ffffff"],
      pattern: "grid",
      url: spotifySearchUrl("track:Rigour artist:VisionFakerz"),
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/cd/8f/fc/cd8ffc05-e1f5-71be-d3d5-b17207e4ec92/mzaf_1979328081992674981.plus.aac.p.m4a",
      embedUrl: ""
    },
    {
      title: "Rabbitrunner",
      year: "2021",
      mood: "escape vector through a bent dimension",
      palette: ["#ff0808", "#1ed760", "#ffffff"],
      pattern: "tunnel",
      url: spotifySearchUrl("track:Rabbitrunner artist:VisionFakerz"),
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview114/v4/ec/39/6a/ec396ae8-973c-c83a-e1ca-65e55842d660/mzaf_7952540601561979781.plus.aac.p.m4a",
      embedUrl: ""
    },
    {
      title: "Memories",
      year: "2021",
      mood: "false memories looping through static",
      palette: ["#ff0808", "#2bdcff", "#ffffff"],
      pattern: "echo",
      url: spotifySearchUrl("track:Memories artist:VisionFakerz"),
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview124/v4/0c/6d/27/0c6d27e0-c439-a37f-446d-90bcce9d0c0f/mzaf_2043841500661007579.plus.aac.p.m4a",
      embedUrl: ""
    },
    {
      title: "Lady of Sorrow",
      year: "2022",
      mood: "a sorrow signal bending the room",
      palette: ["#ff0808", "#ffffff", "#4b0000"],
      pattern: "rain",
      url: spotifySearchUrl("track:Lady of Sorrow artist:VisionFakerz"),
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/ff/a4/51/ffa451ba-f374-be2a-1010-5e033c7a04b8/mzaf_18076749602677263529.plus.aac.p.m4a",
      embedUrl: ""
    }
  ]
};

const FALLBACK_TRACKS = SPOTIFY.tracks.map((track) => ({ ...track }));
const AUTO_TRACK_PATTERNS = ["teeth", "cards", "grid", "tunnel", "echo", "rain"];
const AUTO_TRACK_PALETTES = [
  ["#ff0808", "#f5007a", "#ffffff"],
  ["#ff0808", "#ffd24a", "#ffffff"],
  ["#ff0808", "#9b9b9b", "#ffffff"],
  ["#ff0808", "#1ed760", "#ffffff"],
  ["#ff0808", "#2bdcff", "#ffffff"],
  ["#ff0808", "#ffffff", "#4b0000"]
];

const GA_MEASUREMENT_ID = "";

const DEFAULT_TRACK_TITLE = "Whoremonger";

const EVENT_NAMES = {
  follow: "spotify_follow_click",
  playlist_save: "playlist_save",
  track_save: "track_save",
  preview_play: "preview_play",
  visualizer_play: "preview_play",
  email_signup: "email_signup_submit"
};

function getDefaultTrackIndex() {
  return Math.max(0, SPOTIFY.tracks.findIndex((track) => track.title === DEFAULT_TRACK_TITLE));
}

let activeTrackIndex = getDefaultTrackIndex();
let visualizerRuntime;
let previewAudio;
let playingPreviewIndex = null;
let audioContext;
let audioSource;
let analyserNode;
let frequencyData;

const VFZ_LOGO_VIEWBOX = { width: 640, height: 420 };
const VFZ_LOGO_OUTLINE_SEGMENTS = [
  [[58, 30], [212, 30], [296, 193], [386, 30], [583, 30], [535, 102],
    [391, 102], [356, 164], [290, 164], [195, 333], [58, 30]],
  [[379, 136], [531, 136], [476, 241], [324, 241], [352, 190],
    [418, 190], [442, 145], [379, 145], [379, 136]],
  [[278, 225], [376, 161], [398, 173]],
  [[281, 255], [334, 255], [330, 274], [292, 286], [281, 255]],
  [[371, 260], [425, 264], [378, 297], [371, 260]]
];

function setupAnalytics() {
  if (!GA_MEASUREMENT_ID) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.append(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
}

function spotifyEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "open.spotify.com") return url;
    if (parsed.pathname.startsWith("/search")) return "";
    if (parsed.pathname.startsWith("/embed/")) return url;
    parsed.pathname = `/embed${parsed.pathname}`;
    return parsed.toString();
  } catch {
    return url;
  }
}

function isPlayableSpotifyEmbed(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "open.spotify.com" &&
      /^\/embed\/(track|playlist|album|artist)\//.test(parsed.pathname);
  } catch {
    return false;
  }
}

function normalizeTrackKey(title = "") {
  return String(title).trim().toLowerCase();
}

function hashString(value = "") {
  return [...String(value)].reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function decorateSpotifyCatalogTrack(track, index) {
  const title = String(track.title || "").trim();
  const fallback = FALLBACK_TRACKS.find((item) => normalizeTrackKey(item.title) === normalizeTrackKey(title));
  const seed = Math.abs(hashString(title || String(index)));
  const releaseDate = String(track.releaseDate || fallback?.releaseDate || "");
  const year = String(track.year || releaseDate.slice(0, 4) || fallback?.year || "");
  const url = track.url || fallback?.url || spotifySearchUrl(`track:${title} artist:VisionFakerz`);

  return {
    title,
    year,
    mood: fallback?.mood || "new signal bending into the fake dimension",
    palette: fallback?.palette || AUTO_TRACK_PALETTES[seed % AUTO_TRACK_PALETTES.length],
    pattern: fallback?.pattern || AUTO_TRACK_PATTERNS[seed % AUTO_TRACK_PATTERNS.length],
    url,
    previewUrl: track.previewUrl || fallback?.previewUrl || "",
    embedUrl: track.embedUrl || spotifyEmbedUrl(url),
    releaseDate,
    album: track.album || "",
    albumImage: track.albumImage || ""
  };
}

async function loadSpotifyCatalog() {
  try {
    const response = await fetch("/api/spotify-tracks", { cache: "no-store" });
    if (!response.ok) return;
    const body = await response.json();
    if (!Array.isArray(body.tracks) || body.tracks.length === 0) return;
    SPOTIFY.tracks = body.tracks
      .map(decorateSpotifyCatalogTrack)
      .filter((track) => track.title && track.url);
    activeTrackIndex = getDefaultTrackIndex();
  } catch {
    // Keep the curated fallback list when Spotify API credentials are not configured.
  }
}

function renderSpotifyFallback({ title, subtitle, url, action, label }) {
  const fallback = document.createElement("div");
  fallback.className = "spotify-fallback";
  fallback.innerHTML = `
    <button class="vinyl-player" type="button" aria-label="Start ${title} visualizer">
      <span class="vinyl-disc" aria-hidden="true">
        <span class="vinyl-disc__shine"></span>
      </span>
      <span class="vinyl-arm" aria-hidden="true"></span>
      <span class="vinyl-lens-chip" aria-hidden="true"></span>
      <span class="spotify-fallback__slashes" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </span>
    </button>
    <div class="spotify-fallback__copy">
      <p class="spotify-fallback__label">${subtitle}</p>
      <p class="spotify-fallback__title">${title}</p>
      <p class="spotify-fallback__tagline">vision bent / dimension faked</p>
      <div class="spotify-fallback__meter" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
    </div>
  `;

  const link = document.createElement("a");
  link.className = "button button--primary button--spotify-save tracked-link";
  link.href = redirectUrl(url, action, label);
  link.dataset.action = action;
  link.dataset.label = label;
  link.dataset.target = url;
  link.textContent = action === "playlist_save" ? "Save the fake dimension" : "Save the distortion";
  if (action === "playlist_save") {
    const queue = document.createElement("div");
    queue.className = "playlist-queue";
    SPOTIFY.tracks.forEach((track, index) => {
      const item = document.createElement("button");
      item.className = "playlist-queue__track";
      item.type = "button";
      item.dataset.trackIndex = String(index);
      item.setAttribute("aria-pressed", "false");
      item.innerHTML = `
        <span class="playlist-queue__number">${String(index + 1).padStart(2, "0")}</span>
        <span class="playlist-queue__title">${track.title}</span>
        <span class="playlist-queue__year">${track.year}</span>
        <span class="playlist-queue__pulse" aria-hidden="true"></span>
      `;
      item.addEventListener("click", () => {
        playTrackPreview(track, index);
      });
      queue.append(item);
    });
    fallback.append(queue);
    fallback.append(link);
  }
  return fallback;
}

function redirectUrl(target, action, label) {
  const url = new URL("out.html", window.location.href);
  url.searchParams.set("target", target);
  url.searchParams.set("action", action);
  url.searchParams.set("label", label);
  return url.toString();
}

function safeSpotifyTarget(target) {
  try {
    const parsed = new URL(target);
    return parsed.protocol === "https:" && parsed.hostname === "open.spotify.com"
      ? parsed.toString()
      : SPOTIFY.artistUrl;
  } catch {
    return SPOTIFY.artistUrl;
  }
}

function getDeviceType() {
  const width = window.innerWidth || 0;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;
  if (width < 760 || coarsePointer) return "mobile";
  if (width < 1100) return "tablet";
  return "desktop";
}

function isMobileViewport() {
  return getDeviceType() === "mobile";
}

function inferTrackTitle(label = "") {
  const normalized = String(label).replace(/\+/g, " ");
  const match = SPOTIFY.tracks.find((track) => normalized.toLowerCase().includes(track.title.toLowerCase()));
  return match?.title || "";
}

function sendServerConversionEvent(payload) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      if (sent) return;
    }
  } catch {
    // Fall through to fetch keepalive.
  }

  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => {});
}

function sendConversionEvent(action, label, target, metadata = {}) {
  const eventName = EVENT_NAMES[action] || "spotify_click";
  const trackTitle = metadata.track_title || inferTrackTitle(label);
  const payload = {
    event: eventName,
    spotify_action: action,
    spotify_label: label,
    spotify_target: target,
    track_title: trackTitle,
    page_path: window.location.pathname,
    referrer: document.referrer || "",
    device: getDeviceType(),
    timestamp: new Date().toISOString()
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, {
      event_category: "spotify",
      event_label: label,
      spotify_action: action,
      transport_type: "beacon"
    });
  }

  sendServerConversionEvent(payload);

  try {
    const stored = JSON.parse(window.localStorage.getItem("vfz_spotify_clicks") || "[]");
    stored.push(payload);
    window.localStorage.setItem("vfz_spotify_clicks", JSON.stringify(stored.slice(-50)));
  } catch {
    // Analytics still fires through dataLayer/gtag when local storage is blocked.
  }

}

function syncTrackStates() {
  document.querySelectorAll(".track-card").forEach((card, cardIndex) => {
    const isActive = cardIndex === activeTrackIndex;
    const isPlaying = cardIndex === playingPreviewIndex;
    card.classList.toggle("is-active", isActive);
    card.classList.toggle("is-playing", isPlaying);
    card.querySelector(".spotify-fallback")?.classList.toggle("is-playing", isPlaying);
  });

  document.querySelectorAll(".spotify-frame--hero .spotify-fallback").forEach((fallback) => {
    fallback.classList.toggle("is-playing", playingPreviewIndex === activeTrackIndex);
  });

  document.querySelectorAll(".preview-toggle").forEach((button) => {
    const card = button.closest(".track-card");
    const index = card ? Number(card.dataset.trackIndex || 0) : activeTrackIndex;
    const isPlaying = index === playingPreviewIndex;
    button.classList.toggle("is-preview-playing", isPlaying);
    button.textContent = isPlaying ? "Pause preview" : "Play preview";
    button.setAttribute("aria-pressed", String(isPlaying));
  });

  document.querySelectorAll(".playlist-queue__track").forEach((button, index) => {
    const trackIndex = Number(button.dataset.trackIndex || index);
    const isActive = trackIndex === activeTrackIndex;
    const isPlaying = trackIndex === playingPreviewIndex;
    button.classList.toggle("is-active", isActive);
    button.classList.toggle("is-preview-playing", isPlaying);
    button.setAttribute("aria-pressed", String(isPlaying));
  });
}

function setVisualizerTrack(track, index) {
  activeTrackIndex = index;
  document.querySelector("[data-visualizer-title]").textContent = track.title;
  syncTrackStates();

  if (visualizerRuntime) {
    visualizerRuntime.track = track;
    visualizerRuntime.pulse = 1.6;
  }
}

function getPreviewAudio() {
  if (previewAudio) return previewAudio;

  previewAudio = new Audio();
  previewAudio.crossOrigin = "anonymous";
  previewAudio.preload = "none";
  previewAudio.addEventListener("ended", () => {
    playingPreviewIndex = null;
    syncTrackStates();
  });
  previewAudio.addEventListener("pause", () => {
    if (!previewAudio.ended) return;
    playingPreviewIndex = null;
    syncTrackStates();
  });
  previewAudio.addEventListener("error", () => {
    playingPreviewIndex = null;
    syncTrackStates();
  });
  return previewAudio;
}

function setupAudioSync(audio) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === "suspended") audioContext.resume();
    if (!audioSource) {
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 128;
      analyserNode.smoothingTimeConstant = 0.58;
      frequencyData = new Uint8Array(analyserNode.frequencyBinCount);
      audioSource = audioContext.createMediaElementSource(audio);
      audioSource.connect(analyserNode);
      analyserNode.connect(audioContext.destination);
    }
  } catch {
    analyserNode = null;
    frequencyData = null;
  }
}

function patternBeat(pattern, time) {
  const settings = {
    teeth: { bpm: 148, offset: 0.04, snap: 18 },
    cards: { bpm: 116, offset: 0.18, snap: 20 },
    grid: { bpm: 126, offset: 0.08, snap: 26 },
    tunnel: { bpm: 156, offset: 0.02, snap: 16 },
    echo: { bpm: 104, offset: 0.26, snap: 14 },
    rain: { bpm: 92, offset: 0.34, snap: 12 }
  }[pattern] || { bpm: 120, offset: 0, snap: 16 };
  const phase = ((time + settings.offset) * settings.bpm / 60) % 1;
  const downbeat = Math.pow(1 - Math.min(phase, 1 - phase) * 2, settings.snap);
  const offbeat = Math.pow(Math.max(0, Math.sin((time + settings.offset) * settings.bpm / 30 * Math.PI)), settings.snap * 0.55);
  return Math.min(1, downbeat + offbeat * 0.45);
}

function readAudioSync(fallbackTime) {
  const audio = previewAudio;
  const isPlaying = Boolean(audio && !audio.paused && playingPreviewIndex !== null);
  const time = isPlaying ? audio.currentTime : fallbackTime * 0.32;
  const track = SPOTIFY.tracks[activeTrackIndex] || SPOTIFY.tracks[0];
  const beat = patternBeat(track.pattern, time);

  if (isPlaying && analyserNode && frequencyData) {
    analyserNode.getByteFrequencyData(frequencyData);
    const sliceAverage = (start, end) => {
      let total = 0;
      for (let index = start; index < end; index += 1) total += frequencyData[index] || 0;
      return total / Math.max(1, end - start) / 255;
    };
    const bass = sliceAverage(0, 7);
    const mid = sliceAverage(7, 22);
    const treble = sliceAverage(22, frequencyData.length);
    return {
      isPlaying,
      time,
      beat,
      bass,
      mid,
      treble,
      level: Math.min(1, bass * 0.55 + mid * 0.32 + treble * 0.24 + beat * 0.32)
    };
  }

  const fallbackLevel = isPlaying ? 0.28 + beat * 0.72 : 0.035;
  return {
    isPlaying,
    time,
    beat: isPlaying ? beat : 0,
    bass: isPlaying ? beat * 0.82 : 0,
    mid: isPlaying ? 0.24 + beat * 0.42 : 0,
    treble: isPlaying ? 0.16 + Math.abs(Math.sin(time * 9.5)) * 0.28 : 0,
    level: fallbackLevel
  };
}

function playTrackPreview(track, index) {
  if (!track.previewUrl) {
    window.location.href = redirectUrl(track.url, "track_save", `track_${index + 1}_${track.title}`);
    return;
  }

  const audio = getPreviewAudio();
  setupAudioSync(audio);
  if (playingPreviewIndex === index && !audio.paused) {
    audio.pause();
    playingPreviewIndex = null;
    syncTrackStates();
    return;
  }

  setVisualizerTrack(track, index);
  if (audio.src !== track.previewUrl) {
    audio.src = track.previewUrl;
  }

  playingPreviewIndex = index;
  syncTrackStates();
  if (visualizerRuntime) visualizerRuntime.pulse = 1.9;
  sendConversionEvent("preview_play", `preview_${index + 1}_${track.title}`, track.url, {
    track_title: track.title
  });

  audio.play().catch(() => {
    playingPreviewIndex = null;
    syncTrackStates();
  });
}

function startVisualizer() {
  const canvas = document.querySelector("[data-visualizer-canvas]");
  if (!canvas) return;

  const context = canvas.getContext("2d", { alpha: false, desynchronized: true }) || canvas.getContext("2d");
  const runtime = {
    canvas,
    context,
    track: SPOTIFY.tracks[activeTrackIndex],
    particles: [],
    audio: readAudioSync(0),
    pulse: 1,
    kick: 0,
    bassMemory: 0,
    last: 0,
    width: 1,
    height: 1,
    isMobile: isMobileViewport(),
    isScrolling: false,
    isVisible: true
  };
  visualizerRuntime = runtime;

  const particleCount = runtime.isMobile ? 34 : 80;
  for (let index = 0; index < particleCount; index += 1) {
    runtime.particles.push({
      x: Math.random(),
      y: Math.random(),
      speed: 0.25 + Math.random() * 0.9,
      size: 1 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2
    });
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    runtime.isMobile = isMobileViewport();
    runtime.width = Math.max(1, rect.width);
    runtime.height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, runtime.isMobile ? 1.15 : 1.75);
    canvas.width = Math.max(1, Math.floor(runtime.width * ratio));
    canvas.height = Math.max(1, Math.floor(runtime.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function scheduleDraw(callback, delay = 0) {
    if (delay > 0) {
      window.setTimeout(() => requestAnimationFrame(callback), delay);
      return;
    }
    requestAnimationFrame(callback);
  }

  function draw(timestamp) {
    if (document.hidden || !runtime.isVisible) {
      scheduleDraw(draw, 260);
      return;
    }

    const isPlaying = playingPreviewIndex !== null;
    const frameInterval = runtime.isScrolling
      ? 140
      : runtime.isMobile
        ? (isPlaying ? 34 : 72)
        : 16;
    const wait = frameInterval - (timestamp - runtime.last);
    if (wait > 0) {
      scheduleDraw(draw, Math.min(wait, 120));
      return;
    }
    runtime.last = timestamp;

    if (!runtime.width || !runtime.height) {
      resize();
    }

    const width = runtime.width;
    const height = runtime.height;
    const fallbackTime = timestamp * 0.001;
    const audioSync = readAudioSync(fallbackTime);
    runtime.audio = audioSync;
    const time = audioSync.time;
    const [primary, secondary, tertiary] = runtime.track.palette;
    runtime.pulse = Math.max(0.12, runtime.pulse * 0.94);

    context.clearRect(0, 0, width, height);
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(255, 8, 8, 0.34)");
    gradient.addColorStop(0.48, "rgba(0, 0, 0, 0.9)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.12)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    drawPattern(context, runtime, width, height, time, primary, secondary, tertiary);
    scheduleDraw(draw);
  }

  resize();
  canvas.closest(".visualizer")?.addEventListener("pointermove", () => {
    runtime.pulse = Math.max(runtime.pulse, 1.12);
  });

  let scrollTimer;
  window.addEventListener("scroll", () => {
    if (!runtime.isMobile) return;
    runtime.isScrolling = true;
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      runtime.isScrolling = false;
    }, 180);
  }, { passive: true });

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("orientationchange", () => window.setTimeout(resize, 120), { passive: true });

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(canvas);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      runtime.isVisible = entries.some((entry) => entry.isIntersecting);
    }, { rootMargin: "160px" }).observe(canvas);
  }

  requestAnimationFrame(draw);
}

function drawPattern(context, runtime, width, height, time, primary, secondary, tertiary) {
  const sync = runtime.audio || readAudioSync(time);
  const bassJump = Math.max(0, sync.bass - runtime.bassMemory);
  const detectedKick = sync.isPlaying
    ? Math.max(sync.beat * 0.86, bassJump * 4.2, sync.bass > 0.58 ? sync.bass : 0)
    : 0;
  runtime.kick = Math.max(runtime.kick * 0.8, Math.min(1, detectedKick));
  runtime.bassMemory = runtime.bassMemory * 0.74 + sync.bass * 0.26;

  const kick = runtime.kick;
  const silence = !sync.isPlaying;
  const energy = silence
    ? 0.055 + Math.sin(time * 1.25) * 0.018
    : Math.min(1, 0.16 + sync.bass * 0.28 + sync.mid * 0.14 + sync.treble * 0.1 + kick * 0.74 + runtime.pulse * 0.12);
  const glow = silence ? 0.16 : 0.28 + kick * 0.72;

  context.lineCap = "round";
  context.lineJoin = "round";
  context.fillStyle = "#020000";
  context.fillRect(0, 0, width, height);

  const bg = context.createRadialGradient(width * 0.5, height * 0.46, 0, width * 0.5, height * 0.46, width * 0.68);
  bg.addColorStop(0, `rgba(255,8,8,${0.08 + glow * 0.13})`);
  bg.addColorStop(0.32, `rgba(120,0,0,${0.08 + glow * 0.12})`);
  bg.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);

  drawBackgroundAudioBand(context, width, height, time, sync, kick, primary);
  drawWrappedSignalRibbon(context, width, height, time, energy, kick, silence, primary, "back");
  drawWrappedSignalRibbon(context, width, height, time, energy, kick, silence, primary, "front");
  drawLogoContourVisualizer(context, width, height, time, energy, kick, silence, primary, secondary, tertiary);

  if (!silence && kick > 0.16) {
    const hit = context.createRadialGradient(width * 0.5, height * 0.42, 0, width * 0.5, height * 0.42, width * (0.2 + kick * 0.24));
    hit.addColorStop(0, `rgba(255,255,255,${0.08 + kick * 0.16})`);
    hit.addColorStop(0.22, `rgba(255,8,8,${0.12 + kick * 0.34})`);
    hit.addColorStop(1, "rgba(255,8,8,0)");
    context.fillStyle = hit;
    context.fillRect(0, 0, width, height);
  }

  context.save();
  context.globalCompositeOperation = "screen";
  context.fillStyle = `rgba(255,8,8,${0.035 + kick * 0.13})`;
  const barCount = runtime.isMobile ? 18 : 32;
  for (let bar = 0; bar < barCount; bar += 1) {
    const progress = bar / Math.max(1, barCount - 1);
    const beatShape = Math.pow(Math.max(0, Math.sin(progress * Math.PI * 5 - time * 5.4)), 18);
    const barHeight = height * (0.025 + beatShape * (0.12 + kick * 0.46));
    context.fillRect(progress * width, height * 0.55 - barHeight * 0.5, width * 0.01, barHeight);
  }
  context.restore();

  context.globalAlpha = 1;
  context.shadowBlur = 0;
  context.setLineDash([]);
}

function getVFZLogoBox(width, height) {
  const scale = Math.min(width * 0.82 / VFZ_LOGO_VIEWBOX.width, height * 0.72 / VFZ_LOGO_VIEWBOX.height);
  return {
    scale,
    x: (width - VFZ_LOGO_VIEWBOX.width * scale) * 0.5,
    y: height * 0.06 + (height * 0.72 - VFZ_LOGO_VIEWBOX.height * scale) * 0.5
  };
}

function drawBackgroundAudioBand(context, width, height, time, sync, kick, primary) {
  if (!sync.isPlaying) return;

  const centerY = height * 0.49;
  const bandHeight = height * (0.13 + sync.level * 0.1 + kick * 0.08);
  const barCount = Math.min(54, Math.max(28, Math.floor(width / 10)));
  const bandGradient = context.createLinearGradient(0, centerY - bandHeight, 0, centerY + bandHeight);
  bandGradient.addColorStop(0, "rgba(255,8,8,0)");
  bandGradient.addColorStop(0.36, `rgba(255,8,8,${0.08 + sync.level * 0.08})`);
  bandGradient.addColorStop(0.5, `rgba(255,255,255,${0.025 + kick * 0.035})`);
  bandGradient.addColorStop(0.64, `rgba(255,8,8,${0.08 + sync.level * 0.08})`);
  bandGradient.addColorStop(1, "rgba(255,8,8,0)");

  context.save();
  context.globalCompositeOperation = "screen";
  context.fillStyle = bandGradient;
  context.fillRect(0, centerY - bandHeight, width, bandHeight * 2);

  context.strokeStyle = `rgba(255,8,8,${0.16 + sync.level * 0.16})`;
  context.lineWidth = 1;
  context.shadowColor = primary || "rgba(255,8,8,0.62)";
  context.shadowBlur = 10 + kick * 18;
  for (let row = -2; row <= 2; row += 1) {
    const offset = row * bandHeight * 0.2;
    context.beginPath();
    for (let point = 0; point <= 110; point += 1) {
      const progress = point / 110;
      const envelope = Math.pow(Math.sin(progress * Math.PI), 0.72);
      const bassWave = Math.sin(progress * Math.PI * (2.3 + sync.bass * 4) - time * (2.8 + sync.bass * 3.6));
      const trebleWave = Math.sin(progress * Math.PI * (10 + sync.treble * 7) + time * (5.2 + sync.treble * 4));
      const y = centerY + offset + (bassWave * bandHeight * 0.18 + trebleWave * bandHeight * 0.045) * envelope;
      const x = progress * width;
      if (point === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }

  context.fillStyle = `rgba(255,8,8,${0.035 + sync.level * 0.055})`;
  for (let bar = 0; bar < barCount; bar += 1) {
    const progress = bar / Math.max(1, barCount - 1);
    const kickShape = Math.pow(Math.max(0, Math.sin(progress * Math.PI * 6 - time * 5.6)), 12);
    const levelShape = 0.28 + sync.mid * 0.55 + sync.treble * 0.24 + kickShape * (0.45 + kick * 1.2);
    const barHeight = bandHeight * Math.min(1.4, levelShape);
    const x = progress * width;
    context.fillRect(x, centerY - barHeight * 0.5, Math.max(1, width * 0.006), barHeight);
  }
  context.restore();
}

function drawWrappedSignalRibbon(context, width, height, time, energy, kick, silence, primary, layer) {
  const box = getVFZLogoBox(width, height);
  const logoWidth = VFZ_LOGO_VIEWBOX.width * box.scale;
  const logoHeight = VFZ_LOGO_VIEWBOX.height * box.scale;
  const centerY = box.y + logoHeight * 0.56;
  const startX = box.x - logoWidth * 0.1;
  const endX = box.x + logoWidth * 1.08;
  const turns = 2.15;
  const travel = silence ? 0.42 : 1.6 + kick * 1.35;
  const coilAmplitude = logoHeight * (silence ? 0.12 : 0.14 + energy * 0.08 + kick * 0.1);
  const points = 220;
  const ribbonPoints = [];

  for (let point = 0; point <= points; point += 1) {
    const progress = point / points;
    const phase = progress * Math.PI * 2 * turns - time * travel;
    const depth = Math.cos(phase);
    const lift = Math.sin(phase);
    const breath = Math.sin(progress * Math.PI * 3.2 + time * 1.3) * logoHeight * 0.018 * (0.3 + energy);
    const kickSpike = Math.pow(Math.max(0, Math.sin(progress * Math.PI * 9 - time * 5.4)), 16) * kick * logoHeight * 0.12;
    ribbonPoints.push({
      x: startX + (endX - startX) * progress + depth * logoWidth * 0.035,
      y: centerY + lift * coilAmplitude + breath - kickSpike,
      depth,
      progress
    });
  }

  const isFrontLayer = layer === "front";
  const visibleTest = isFrontLayer
    ? (point) => point.depth > -0.18
    : (point) => point.depth <= 0.28;
  const baseAlpha = isFrontLayer
    ? (silence ? 0.58 : 0.72 + kick * 0.22)
    : (silence ? 0.18 : 0.24 + kick * 0.12);
  const baseWidth = isFrontLayer
    ? 3.1 + energy * 2.2 + kick * 5.4
    : 5 + kick * 4;

  context.save();
  context.globalCompositeOperation = "screen";
  drawRibbonStroke(context, ribbonPoints, visibleTest, {
    color: `rgba(255,8,8,${baseAlpha * 0.32})`,
    width: baseWidth * 4.4,
    blur: 24 + kick * 42,
    alpha: 1,
    dash: null
  });
  drawRibbonStroke(context, ribbonPoints, visibleTest, {
    color: primary || "rgba(255,8,8,0.92)",
    width: baseWidth,
    blur: 14 + kick * 28,
    alpha: baseAlpha,
    dash: [58 - Math.min(28, kick * 22), 34 + kick * 16],
    dashOffset: -time * (silence ? 18 : 72 + kick * 90)
  });
  drawRibbonStroke(context, ribbonPoints, visibleTest, {
    color: `rgba(255,255,255,${isFrontLayer ? 0.76 : 0.18})`,
    width: Math.max(1, baseWidth * 0.3),
    blur: 10 + kick * 22,
    alpha: isFrontLayer ? 0.72 : 0.24,
    dash: [16 + kick * 18, 70],
    dashOffset: -time * (silence ? 30 : 130 + kick * 130)
  });

  if (isFrontLayer) {
    drawRibbonPulseNodes(context, ribbonPoints, time, kick, silence);
  }
  context.restore();
}

function drawRibbonStroke(context, points, visibleTest, options) {
  context.save();
  context.globalAlpha = options.alpha;
  context.strokeStyle = options.color;
  context.lineWidth = options.width;
  context.shadowColor = options.color;
  context.shadowBlur = options.blur;
  context.lineCap = "round";
  context.lineJoin = "round";
  if (options.dash) {
    context.setLineDash(options.dash);
    context.lineDashOffset = options.dashOffset || 0;
  } else {
    context.setLineDash([]);
  }

  let drawing = false;
  context.beginPath();
  points.forEach((point) => {
    if (!visibleTest(point)) {
      if (drawing) {
        context.stroke();
        context.beginPath();
        drawing = false;
      }
      return;
    }
    if (!drawing) {
      context.moveTo(point.x, point.y);
      drawing = true;
      return;
    }
    context.lineTo(point.x, point.y);
  });
  if (drawing) context.stroke();
  context.restore();
}

function drawRibbonPulseNodes(context, points, time, kick, silence) {
  const nodeCount = silence ? 1 : 3;
  for (let node = 0; node < nodeCount; node += 1) {
    const target = ((time * (silence ? 0.08 : 0.34 + kick * 0.24)) + node / nodeCount) % 1;
    const point = points[Math.min(points.length - 1, Math.max(0, Math.round(target * (points.length - 1))))];
    if (!point || point.depth < -0.18) continue;
    const radius = silence ? 3.4 : 4.8 + kick * 12;
    const glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius * 6);
    glow.addColorStop(0, `rgba(255,255,255,${0.62 + kick * 0.28})`);
    glow.addColorStop(0.2, `rgba(255,8,8,${0.58 + kick * 0.32})`);
    glow.addColorStop(1, "rgba(255,8,8,0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(point.x, point.y, radius * 6, 0, Math.PI * 2);
    context.fill();
  }
}

function drawLogoContourVisualizer(context, width, height, time, energy, kick, silence, primary, secondary, tertiary) {
  const box = getVFZLogoBox(width, height);
  const speed = silence ? 0.12 : 0.38 + kick * 0.45;
  const amplitude = silence ? 1.2 : 3.4 + energy * 9 + kick * 18;

  context.save();
  context.globalCompositeOperation = "screen";
  VFZ_LOGO_OUTLINE_SEGMENTS.forEach((segment, index) => {
    drawLogoContourPass(context, segment, box, time, energy, kick, amplitude, {
      color: index < 2 ? primary : "rgba(255,255,255,0.9)",
      width: index < 2 ? 2.4 + kick * 4.6 : 1.5 + kick * 3.2,
      blur: index < 2 ? 16 + kick * 32 : 10 + kick * 22,
      alpha: index < 2 ? 0.74 : 0.58,
      phase: index * 0.38,
      speed
    });
  });

  context.strokeStyle = `rgba(35,210,255,${silence ? 0.12 : 0.16 + kick * 0.28})`;
  context.lineWidth = 1.2 + kick * 2;
  context.shadowColor = secondary || "rgba(35,210,255,0.62)";
  context.shadowBlur = 12 + kick * 24;
  VFZ_LOGO_OUTLINE_SEGMENTS.slice(0, 2).forEach((segment, index) => {
    drawLogoContourPass(context, segment, box, time + 0.22, energy * 0.62, kick, amplitude * 0.46, {
      color: "rgba(35,210,255,0.56)",
      width: 1.1 + kick * 1.8,
      blur: 12,
      alpha: 0.42,
      phase: index + 1.2,
      speed: speed * 0.72
    });
  });

  const nodes = silence ? 1 : 3;
  for (let node = 0; node < nodes; node += 1) {
    const sampled = sampleLogoOutlinePoint((time * speed + node / nodes) % 1, box);
    const radius = (silence ? 2.2 : 3.2 + kick * 7) * (node === 0 ? 1.2 : 0.82);
    const nodeGlow = context.createRadialGradient(sampled.x, sampled.y, 0, sampled.x, sampled.y, radius * 5.4);
    nodeGlow.addColorStop(0, `rgba(255,255,255,${0.54 + kick * 0.3})`);
    nodeGlow.addColorStop(0.18, `rgba(255,8,8,${0.58 + kick * 0.28})`);
    nodeGlow.addColorStop(1, "rgba(255,8,8,0)");
    context.fillStyle = nodeGlow;
    context.beginPath();
    context.arc(sampled.x, sampled.y, radius * 5.4, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = Math.min(0.48, 0.08 + kick * 0.34);
  context.strokeStyle = tertiary || "rgba(255,255,255,0.64)";
  context.lineWidth = 1;
  for (let ray = 0; ray < 9; ray += 1) {
    const sampled = sampleLogoOutlinePoint((time * 0.24 + ray * 0.113) % 1, box);
    context.beginPath();
    context.moveTo(sampled.x, sampled.y);
    context.lineTo(width * 0.5 + (sampled.x - width * 0.5) * (1.18 + kick * 0.12), height * 0.5 + (sampled.y - height * 0.5) * (1.18 + kick * 0.12));
    context.stroke();
  }
  context.restore();
}

function drawLogoContourPass(context, segment, box, time, energy, kick, amplitude, options) {
  context.save();
  context.globalAlpha = options.alpha;
  context.strokeStyle = options.color;
  context.lineWidth = options.width;
  context.shadowColor = options.color;
  context.shadowBlur = options.blur;
  context.setLineDash([14 + kick * 18, 18 - Math.min(12, kick * 10)]);
  context.lineDashOffset = -time * (42 + options.speed * 160);
  context.beginPath();

  let drawn = false;
  segment.forEach((point, pointIndex) => {
    if (pointIndex === segment.length - 1) return;
    const next = segment[pointIndex + 1];
    const dx = next[0] - point[0];
    const dy = next[1] - point[1];
    const length = Math.hypot(dx, dy) || 1;
    const normalX = -dy / length;
    const normalY = dx / length;
    const steps = Math.max(2, Math.ceil(length / 10));
    for (let step = 0; step <= steps; step += 1) {
      const local = step / steps;
      const progress = (pointIndex + local) / Math.max(1, segment.length - 1);
      const x = point[0] + dx * local;
      const y = point[1] + dy * local;
      const kickSpike = Math.pow(Math.max(0, Math.sin(progress * Math.PI * 9 - time * (7 + options.speed * 5) + options.phase)), 20);
      const wave = Math.sin(progress * Math.PI * 12 + time * (silenceSafeSpeed(options.speed) * 3.8) + options.phase) * amplitude * (0.12 + energy * 0.28);
      const displacement = wave + kickSpike * amplitude * (0.5 + kick * 1.4);
      const sx = box.x + (x + normalX * displacement) * box.scale;
      const sy = box.y + (y + normalY * displacement) * box.scale;
      if (!drawn) {
        context.moveTo(sx, sy);
        drawn = true;
      } else {
        context.lineTo(sx, sy);
      }
    }
  });

  context.stroke();
  context.restore();
}

function silenceSafeSpeed(speed) {
  return Math.max(0.1, speed);
}

function sampleLogoOutlinePoint(progress, box) {
  const segment = VFZ_LOGO_OUTLINE_SEGMENTS[0];
  const lengths = [];
  let total = 0;
  for (let index = 0; index < segment.length - 1; index += 1) {
    const current = segment[index];
    const next = segment[index + 1];
    const length = Math.hypot(next[0] - current[0], next[1] - current[1]);
    lengths.push(length);
    total += length;
  }

  let target = ((progress % 1) + 1) % 1 * total;
  for (let index = 0; index < lengths.length; index += 1) {
    if (target > lengths[index]) {
      target -= lengths[index];
      continue;
    }
    const current = segment[index];
    const next = segment[index + 1];
    const ratio = target / Math.max(1, lengths[index]);
    return {
      x: box.x + (current[0] + (next[0] - current[0]) * ratio) * box.scale,
      y: box.y + (current[1] + (next[1] - current[1]) * ratio) * box.scale
    };
  }

  return {
    x: box.x + segment[0][0] * box.scale,
    y: box.y + segment[0][1] * box.scale
  };
}

function drawKickWave(context, width, height, time, baseline, swing, kick, silence, color, offsetY, alpha) {
  const amplitude = height * swing;
  const frequency = silence ? 1.15 : 2.25 + kick * 1.55;
  const phase = time * (silence ? 1.25 : 5.2 + kick * 4.4);
  const points = 180;

  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = silence ? 2 : 2.4 + kick * 5.8;
  context.shadowColor = color;
  context.shadowBlur = silence ? 10 : 16 + kick * 30;
  context.beginPath();

  for (let point = 0; point <= points; point += 1) {
    const progress = point / points;
    const envelope = Math.pow(Math.sin(progress * Math.PI), 0.55);
    const kickSpikeA = Math.pow(Math.max(0, Math.sin(progress * Math.PI * 6 - phase * 0.92)), 18);
    const kickSpikeB = Math.pow(Math.max(0, Math.sin(progress * Math.PI * 10 + phase * 0.58)), 24);
    const breath = Math.sin(progress * Math.PI * frequency + phase) * amplitude * envelope;
    const sub = Math.sin(progress * Math.PI * (frequency * 0.48) - phase * 0.42) * amplitude * 0.32 * envelope;
    const kickLift = (kickSpikeA - kickSpikeB * 0.68) * amplitude * (1.2 + kick * 2.8) * kick;
    const micro = silence ? 0 : Math.sin(progress * 120 + time * 18) * height * 0.006 * kick;
    const x = progress * width;
    const y = baseline + offsetY + breath + sub - kickLift + micro;
    if (point === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }

  context.stroke();
  context.restore();
}

function tracePolygon(context, points) {
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
}

function drawDimensionalVoid(context, width, height, time, energy, primary) {
  const glow = context.createRadialGradient(width * 0.62, height * 0.44, 0, width * 0.62, height * 0.44, width * 0.78);
  glow.addColorStop(0, `rgba(255,255,255,${0.08 + energy * 0.12})`);
  glow.addColorStop(0.18, `rgba(255,8,8,${0.16 + energy * 0.24})`);
  glow.addColorStop(0.55, "rgba(45,0,0,0.62)");
  glow.addColorStop(1, "#020000");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(width * 0.5, height * 0.56);
  context.rotate(Math.sin(time * 0.55) * 0.07);
  context.strokeStyle = `rgba(255,8,8,${0.16 + energy * 0.22})`;
  context.lineWidth = 1;
  for (let line = -18; line <= 18; line += 1) {
    const y = line * height * 0.045 + Math.sin(time + line) * energy * 4;
    context.beginPath();
    context.moveTo(-width, y);
    context.lineTo(width, y * 0.32);
    context.stroke();
  }
  for (let line = -15; line <= 15; line += 1) {
    const x = line * width * 0.055;
    context.beginPath();
    context.moveTo(x, -height);
    context.lineTo(x * 0.18, height);
    context.stroke();
  }
  context.restore();
}

function drawLensShadow(context, lens, energy) {
  context.save();
  context.shadowColor = `rgba(255,8,8,${0.38 + energy * 0.2})`;
  context.shadowBlur = 26 + energy * 42;
  context.fillStyle = "rgba(10,0,0,0.88)";
  tracePolygon(context, lens);
  context.fill();
  context.restore();
}

function drawLensInterior(context, width, height, time, energy, primary, secondary) {
  const refracted = context.createLinearGradient(0, 0, width, height);
  refracted.addColorStop(0, "rgba(255,255,255,0.06)");
  refracted.addColorStop(0.22, `rgba(255,8,8,${0.24 + energy * 0.24})`);
  refracted.addColorStop(0.52, "rgba(0,0,0,0.82)");
  refracted.addColorStop(0.78, `rgba(45,220,255,${0.08 + energy * 0.16})`);
  refracted.addColorStop(1, "rgba(255,255,255,0.08)");
  context.fillStyle = refracted;
  context.fillRect(0, 0, width, height);

  const horizon = height * (0.64 - energy * 0.06);
  context.strokeStyle = `rgba(255,8,8,${0.3 + energy * 0.42})`;
  context.lineWidth = 1.2;
  for (let row = 0; row < 16; row += 1) {
    const depth = row / 15;
    const y = horizon + Math.pow(depth, 1.85) * height * 0.54;
    context.beginPath();
    context.moveTo(width * -0.08, y + Math.sin(time * 2 + row) * energy * 3);
    context.bezierCurveTo(width * 0.32, y - energy * 16, width * 0.72, y + energy * 10, width * 1.06, y - depth * 36);
    context.stroke();
  }
  for (let col = -9; col <= 11; col += 1) {
    const x = width * 0.5 + col * width * 0.085;
    context.beginPath();
    context.moveTo(width * 0.5, horizon - height * 0.22);
    context.lineTo(x + Math.sin(time + col) * energy * 14, height * 1.12);
    context.stroke();
  }

  context.globalAlpha = 0.3 + energy * 0.34;
  context.fillStyle = primary;
  for (let bar = 0; bar < 12; bar += 1) {
    const h = height * (0.08 + Math.abs(Math.sin(time * 4 + bar)) * energy * 0.3);
    context.fillRect(width * (0.08 + bar * 0.076), height - h, width * 0.026, h);
  }
  context.globalAlpha = 1;
}

function drawTrackSignature(context, track, width, height, time, energy, primary, secondary, tertiary, sync) {
  context.save();
  context.globalCompositeOperation = "screen";
  const beat = sync.beat || 0;

  if (track.pattern === "teeth") {
    context.strokeStyle = `rgba(245,0,122,${0.32 + energy * 0.22})`;
    context.fillStyle = `rgba(255,255,255,${0.18 + beat * 0.42})`;
    context.lineWidth = 1.2 + beat * 2.6;
    for (let tooth = 0; tooth < 13; tooth += 1) {
      const x = width * (0.08 + tooth * 0.072);
      const top = height * (0.28 + Math.sin(time * 8 + tooth) * 0.025);
      const bite = height * (0.18 + beat * 0.16 + (tooth % 2) * 0.035);
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x + width * 0.038, top + bite);
      context.lineTo(x + width * 0.076, top);
      context.stroke();
      if (tooth % 3 === 0) context.fill();
    }
  } else if (track.pattern === "cards") {
    for (let card = 0; card < 4; card += 1) {
      const x = width * (0.18 + card * 0.14) + Math.sin(time * 2 + card) * beat * 10;
      const y = height * (0.2 + card * 0.055) - beat * 8;
      context.save();
      context.translate(x, y);
      context.rotate((-0.24 + card * 0.13) + Math.sin(time + card) * 0.04);
      context.strokeStyle = card % 2 ? "rgba(255,8,8,0.86)" : "rgba(255,255,255,0.78)";
      context.lineWidth = 1.4 + beat * 1.2;
      context.strokeRect(-width * 0.045, -height * 0.07, width * 0.09, height * 0.14);
      context.fillStyle = card % 2 ? "rgba(255,8,8,0.22)" : "rgba(255,255,255,0.14)";
      context.fillRect(-width * 0.045, -height * 0.07, width * 0.09, height * 0.14);
      context.restore();
    }
    drawTextGlyph(context, "21", width * 0.72, height * 0.32, 30 + beat * 22, `rgba(255,255,255,${0.18 + beat * 0.34})`);
  } else if (track.pattern === "grid") {
    context.strokeStyle = `rgba(255,255,255,${0.15 + energy * 0.18})`;
    context.lineWidth = 1 + beat * 1.1;
    for (let line = 0; line < 8; line += 1) {
      const offset = line * width * 0.065 + beat * 8;
      context.beginPath();
      context.moveTo(width * 0.12 + offset, height * 0.18);
      context.lineTo(width * 0.28 + offset, height * 0.86);
      context.stroke();
    }
    context.strokeStyle = `rgba(255,8,8,${0.32 + beat * 0.42})`;
    context.strokeRect(width * 0.18, height * 0.24, width * (0.54 + beat * 0.06), height * (0.48 + beat * 0.03));
    context.beginPath();
    context.moveTo(width * 0.18, height * 0.48);
    context.lineTo(width * 0.78, height * 0.48);
    context.moveTo(width * 0.48, height * 0.24);
    context.lineTo(width * 0.48, height * 0.75);
    context.stroke();
  } else if (track.pattern === "tunnel") {
    context.strokeStyle = `rgba(30,215,96,${0.18 + energy * 0.28})`;
    context.lineWidth = 1.2 + beat * 2;
    for (let ring = 1; ring <= 9; ring += 1) {
      const scale = ring / 9;
      const radiusX = width * scale * (0.08 + beat * 0.025);
      const radiusY = height * scale * (0.045 + beat * 0.018);
      context.beginPath();
      context.ellipse(width * 0.52, height * 0.46, radiusX, radiusY, time * 0.22, 0, Math.PI * 2);
      context.stroke();
    }
    for (let ray = 0; ray < 14; ray += 1) {
      const angle = ray / 14 * Math.PI * 2 + time * 0.2;
      context.beginPath();
      context.moveTo(width * 0.52, height * 0.46);
      context.lineTo(width * 0.52 + Math.cos(angle) * width * 0.52, height * 0.46 + Math.sin(angle) * height * 0.32);
      context.stroke();
    }
  } else if (track.pattern === "echo") {
    for (let echo = 0; echo < 5; echo += 1) {
      const alpha = 0.18 - echo * 0.024 + beat * 0.08;
      context.strokeStyle = `rgba(43,220,255,${alpha})`;
      context.lineWidth = 2 + echo * 0.8;
      context.strokeRect(
        width * (0.16 + echo * 0.045 + Math.sin(time * 1.4) * 0.01),
        height * (0.18 + echo * 0.038),
        width * (0.6 - echo * 0.07),
        height * (0.46 - echo * 0.04)
      );
    }
    context.strokeStyle = `rgba(255,255,255,${0.18 + beat * 0.26})`;
    for (let ghost = 0; ghost < 4; ghost += 1) {
      context.beginPath();
      context.arc(width * (0.42 + ghost * 0.07), height * 0.48, height * (0.12 + beat * 0.02), 0, Math.PI * 2);
      context.stroke();
    }
  } else if (track.pattern === "rain") {
    context.strokeStyle = `rgba(255,255,255,${0.22 + sync.treble * 0.38})`;
    context.lineWidth = 1.1 + sync.treble * 2.4;
    for (let drop = 0; drop < 34; drop += 1) {
      const x = width * ((drop * 0.137 + time * 0.18) % 1);
      const y = height * ((drop * 0.071 + time * (0.28 + beat * 0.12)) % 1);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x - width * 0.035, y + height * (0.08 + beat * 0.04));
      context.stroke();
    }
    context.strokeStyle = `rgba(255,8,8,${0.2 + beat * 0.28})`;
    context.beginPath();
    context.arc(width * 0.5, height * 0.52, height * (0.2 + beat * 0.08), 0.15 * Math.PI, 0.9 * Math.PI);
    context.stroke();
  }

  context.restore();
}

function drawTextGlyph(context, text, x, y, size, color) {
  context.save();
  context.fillStyle = color;
  context.font = `${size}px Impact, Haettenschweiler, Arial Narrow Bold, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = color;
  context.shadowBlur = 18;
  context.fillText(text, x, y);
  context.restore();
}

function drawFrequencyLine(context, width, height, time, energy, silence, color) {
  const baseline = height * 0.52;
  const sync = visualizerRuntime?.audio || { bass: 0, mid: 0, treble: 0, beat: 0 };
  const amplitude = silence ? height * 0.004 : height * (0.025 + energy * 0.11 + sync.bass * 0.11);
  const frequency = silence ? 0.65 : 3.6 + energy * 3.2 + sync.mid * 4.4;
  const phase = time * (silence ? 0.8 : 5.2 + sync.treble * 7 + sync.beat * 5);
  const passes = [
    { dx: -energy * 3, color: "rgba(255,8,8,0.7)", blur: 12 },
    { dx: energy * 3, color: "rgba(35,210,255,0.5)", blur: 10 },
    { dx: 0, color, blur: 18 }
  ];

  passes.forEach((pass) => {
    context.save();
    context.strokeStyle = pass.color;
    context.lineWidth = pass.dx === 0 ? 3.2 : 2;
    context.shadowColor = pass.color;
    context.shadowBlur = pass.blur;
    context.beginPath();
    for (let point = 0; point <= 150; point += 1) {
      const progress = point / 150;
      const x = progress * width + pass.dx;
      const envelope = Math.sin(Math.PI * progress);
      const glitch = silence ? 0 : Math.sin(progress * 95 + time * 15) * (sync.treble + sync.beat * 0.5) * height * 0.018;
      const wave = Math.sin(progress * Math.PI * frequency + phase) * amplitude * envelope;
      const spike = silence ? 0 : Math.pow(Math.max(0, Math.sin(progress * 21 - time * 6)), 18) * amplitude * (1.2 + sync.beat * 1.8);
      const y = baseline + wave - spike + glitch;
      if (point === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
    context.restore();
  });
}

function drawDimensionalFlash(context, width, height, energy, primary, secondary) {
  context.save();
  context.globalCompositeOperation = "screen";
  const flash = context.createRadialGradient(width * 0.58, height * 0.42, 0, width * 0.58, height * 0.42, width * 0.46);
  flash.addColorStop(0, `rgba(255,255,255,${Math.min(0.38, energy * 0.22)})`);
  flash.addColorStop(0.22, `rgba(255,8,8,${Math.min(0.46, energy * 0.26)})`);
  flash.addColorStop(0.58, `rgba(35,210,255,${Math.min(0.22, energy * 0.12)})`);
  flash.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = flash;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function drawLensGlass(context, lens, width, height, energy) {
  context.save();
  const glass = context.createLinearGradient(0, height * 0.1, width, height * 0.9);
  glass.addColorStop(0, "rgba(255,255,255,0.48)");
  glass.addColorStop(0.12, "rgba(255,255,255,0.05)");
  glass.addColorStop(0.44, "rgba(255,8,8,0.05)");
  glass.addColorStop(0.72, "rgba(255,255,255,0.22)");
  glass.addColorStop(1, "rgba(0,0,0,0.1)");
  tracePolygon(context, lens);
  context.fillStyle = glass;
  context.fill();
  context.strokeStyle = `rgba(255,255,255,${0.58 + energy * 0.2})`;
  context.lineWidth = 2.2 + energy * 1.6;
  context.shadowColor = "rgba(255,255,255,0.8)";
  context.shadowBlur = 16;
  context.stroke();
  context.restore();
}

function drawLensCracks(context, width, height, energy, primary) {
  const impactX = width * 0.62;
  const impactY = height * 0.45;
  context.save();
  context.strokeStyle = `rgba(255,255,255,${0.38 + energy * 0.34})`;
  context.lineWidth = 1 + energy * 0.9;
  context.shadowColor = primary;
  context.shadowBlur = 8 + energy * 14;
  const cracks = [
    [0.1, -0.32, 0.34],
    [0.28, -0.16, 0.42],
    [0.36, 0.12, 0.36],
    [-0.24, 0.22, 0.44],
    [-0.34, -0.1, 0.3],
    [0.02, 0.4, 0.34]
  ];
  cracks.forEach(([dx, dy, len]) => {
    context.beginPath();
    context.moveTo(impactX, impactY);
    context.lineTo(impactX + width * dx * len * (1 + energy * 0.35), impactY + height * dy * (1 + energy * 0.4));
    context.stroke();
  });
  context.restore();
}

function drawFloatingShards(context, runtime, width, height, time, energy, primary, tertiary) {
  if (energy < 0.52) return;
  context.save();
  context.globalCompositeOperation = "screen";
  runtime.particles.slice(0, 28).forEach((particle, index) => {
    const orbit = time * particle.speed + particle.phase;
    const x = width * (0.18 + particle.x * 0.74) + Math.cos(orbit) * energy * 24;
    const y = height * (0.16 + particle.y * 0.68) + Math.sin(orbit * 1.3) * energy * 18;
    const size = particle.size * (1.3 + energy);
    context.fillStyle = index % 3 === 0 ? "rgba(255,255,255,0.72)" : "rgba(255,8,8,0.48)";
    context.beginPath();
    context.moveTo(x, y - size);
    context.lineTo(x + size * 1.6, y + size * 0.4);
    context.lineTo(x - size * 0.8, y + size);
    context.closePath();
    context.fill();
  });
  context.restore();
}

function buildTrackCard(track, index) {
  const card = document.createElement("article");
  card.className = "track-card";
  card.dataset.trackIndex = String(index);

  const meta = document.createElement("div");
  meta.className = "track-card__top";
  meta.innerHTML = `
    <div class="track-art">
      <img src="assets/visionfakerz-logo-transparent.png" alt="" aria-hidden="true">
    </div>
    <div class="track-meta">
      <h3 class="track-title">${track.title}</h3>
      <p class="track-subtitle">VisionFakerZ - ${track.year}</p>
    </div>
  `;

  const frameWrap = document.createElement("div");
  frameWrap.className = "spotify-frame";
  const embedUrl = track.embedUrl || spotifyEmbedUrl(track.url);
  if (isPlayableSpotifyEmbed(embedUrl)) {
    const frame = document.createElement("iframe");
    frame.title = `${track.title} on Spotify`;
    frame.loading = "lazy";
    frame.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    frame.src = embedUrl;
    frame.addEventListener("focus", () => setVisualizerTrack(track, index));
    frame.addEventListener("pointerenter", () => setVisualizerTrack(track, index));
    frameWrap.append(frame);
  } else {
    frameWrap.append(renderSpotifyFallback({
      title: track.title,
      subtitle: "Distortion fragment",
      url: track.url,
      action: "track_save",
      label: `track_${index + 1}_${track.title}`
    }));
  }

  const link = document.createElement("a");
  link.className = "button button--primary button--spotify-save tracked-link";
  link.href = redirectUrl(track.url, "track_save", `track_${index + 1}_${track.title}`);
  link.dataset.action = "track_save";
  link.dataset.label = `track_${index + 1}_${track.title}`;
  link.dataset.target = track.url;
  link.textContent = "Save on Spotify";

  const visualizerButton = document.createElement("button");
  visualizerButton.className = "button button--ghost button--mini preview-toggle";
  visualizerButton.type = "button";
  visualizerButton.textContent = "Play preview";
  visualizerButton.setAttribute("aria-pressed", "false");
  visualizerButton.addEventListener("click", () => {
    playTrackPreview(track, index);
    document.querySelector("[data-visualizer]")?.scrollIntoView({
      behavior: isMobileViewport() ? "auto" : "smooth",
      block: "center"
    });
  });

  const actions = document.createElement("div");
  actions.className = "track-actions";
  actions.append(visualizerButton, link);

  card.append(meta, frameWrap, actions);
  return card;
}

function initButtonEffects() {
  document.addEventListener("click", (event) => {
    const player = event.target.closest(".vinyl-player");
    if (!player) return;

    const fallback = player.closest(".spotify-fallback");
    const card = player.closest(".track-card");
    if (card) {
      const index = Number(card.dataset.trackIndex || 0);
      playTrackPreview(SPOTIFY.tracks[index], index);
    } else {
      const index = activeTrackIndex;
      fallback?.classList.add("is-playing");
      playTrackPreview(SPOTIFY.tracks[index], index);
    }
  });

  document.addEventListener("pointerover", (event) => {
    const button = event.target.closest(".button");
    if (button) button.classList.add("is-dimension-open");
  });

  document.addEventListener("pointerout", (event) => {
    const button = event.target.closest(".button");
    if (button && !button.contains(event.relatedTarget)) {
      button.classList.remove("is-dimension-open");
    }
  });

  document.addEventListener("focusin", (event) => {
    const button = event.target.closest(".button");
    if (button) button.classList.add("is-dimension-open");
  });

  document.addEventListener("focusout", (event) => {
    const button = event.target.closest(".button");
    if (button) button.classList.remove("is-dimension-open");
  });

  document.addEventListener("pointerdown", (event) => {
    const button = event.target.closest(".button");
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const burst = document.createElement("span");
    burst.className = "button-burst";
    burst.style.setProperty("--x", `${event.clientX - rect.left}px`);
    burst.style.setProperty("--y", `${event.clientY - rect.top}px`);
    button.append(burst);
    for (let shardIndex = 0; shardIndex < 7; shardIndex += 1) {
      const shard = document.createElement("span");
      const angle = (Math.PI * 2 * shardIndex) / 7;
      shard.className = "button-shard";
      shard.style.setProperty("--x", `${event.clientX - rect.left}px`);
      shard.style.setProperty("--y", `${event.clientY - rect.top}px`);
      shard.style.setProperty("--dx", `${Math.cos(angle) * (26 + shardIndex * 5)}px`);
      shard.style.setProperty("--dy", `${Math.sin(angle) * (18 + shardIndex * 4)}px`);
      shard.style.setProperty("--rot", `${shardIndex * 31}deg`);
      button.append(shard);
      window.setTimeout(() => shard.remove(), 760);
    }
    window.setTimeout(() => burst.remove(), 700);
  });
}

function initBrokenGlassesCursor() {
  if (!window.matchMedia("(pointer: fine)").matches) return;

  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  document.body.append(glow);

  document.addEventListener("pointermove", (event) => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
    glow.classList.add("is-visible");
  });

  document.addEventListener("pointerover", (event) => {
    if (event.target.closest("a, button, .button, .vinyl-player")) {
      glow.classList.add("is-hot");
    }
  });

  document.addEventListener("pointerout", (event) => {
    if (event.target.closest("a, button, .button, .vinyl-player")) {
      glow.classList.remove("is-hot");
    }
  });

  document.addEventListener("pointerdown", () => glow.classList.add("is-hot"));
  document.addEventListener("pointerup", () => glow.classList.remove("is-hot"));
}

function initSiteMenu() {
  const menu = document.querySelector("[data-site-menu]");
  const toggle = document.querySelector("[data-menu-toggle]");
  if (!menu || !toggle) return;

  function setOpen(isOpen) {
    menu.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  }

  toggle.addEventListener("click", () => {
    setOpen(!menu.classList.contains("is-open"));
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

function initSignupForm() {
  const form = document.querySelector("[data-signup-form]");
  if (!form) return;

  const status = form.querySelector("[data-signup-status]");
  const input = form.querySelector("input[name='email']");
  const button = form.querySelector("button[type='submit']");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = input.value.trim().toLowerCase();
    if (!email || !input.validity.valid) {
      status.textContent = "Drop a valid email into the breach.";
      status.className = "signup-form__status is-error";
      return;
    }

    button.disabled = true;
    button.textContent = "Sending signal...";
    status.textContent = "Opening the signup breach...";
    status.className = "signup-form__status";

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "visionfakerz_landing",
          page_path: window.location.pathname,
          referrer: document.referrer || ""
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Signup failed");
      }

      sendConversionEvent("email_signup", "email_signup_form", "supabase");
      input.value = "";
      status.textContent = "You're in. The next fake vision will find you.";
      status.className = "signup-form__status is-success";
    } catch {
      status.textContent = "Signup channel is not live yet. Supabase env vars are needed on Vercel.";
      status.className = "signup-form__status is-error";
    } finally {
      button.disabled = false;
      button.textContent = "Subscribe";
    }
  });
}

function initIndexPage() {
  const playlistFrame = document.querySelector("[data-playlist-frame]");
  const trackList = document.querySelector("[data-track-list]");

  if (playlistFrame) {
    const embedUrl = SPOTIFY.playlistEmbedUrl || spotifyEmbedUrl(SPOTIFY.playlistUrl);
    playlistFrame.replaceChildren();
    if (isPlayableSpotifyEmbed(embedUrl)) {
      const frame = document.createElement("iframe");
      frame.title = "This Is VisionFakerZ playlist on Spotify";
      frame.loading = "lazy";
      frame.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
      frame.src = embedUrl;
      frame.addEventListener("focus", () => {
        setVisualizerTrack(SPOTIFY.tracks[activeTrackIndex], activeTrackIndex);
        if (visualizerRuntime) visualizerRuntime.pulse = 1.35;
      });
      playlistFrame.append(frame);
    } else {
      playlistFrame.append(renderSpotifyFallback({
        title: "This Is VisionFakerZ",
        subtitle: "False dimension playlist",
        url: SPOTIFY.playlistUrl,
        action: "playlist_save",
        label: "hero_playlist_save"
      }));
    }
  }

  if (trackList) {
    trackList.replaceChildren();
    SPOTIFY.tracks.forEach((track, index) => {
      trackList.append(buildTrackCard(track, index));
    });
    const defaultIndex = getDefaultTrackIndex();
    setVisualizerTrack(SPOTIFY.tracks[defaultIndex], defaultIndex);
  }

  document.querySelectorAll(".tracked-link").forEach((link) => {
    const action = link.dataset.action || "follow";
    const label = link.dataset.label || action;
    const target = link.dataset.target ||
      (action === "playlist_save" ? SPOTIFY.playlistUrl : SPOTIFY.artistUrl);
    link.href = redirectUrl(target, action, label);
    link.dataset.target = target;
  });
}

function initRedirectPage() {
  const params = new URLSearchParams(window.location.search);
  const target = safeSpotifyTarget(params.get("target") || SPOTIFY.artistUrl);
  const action = params.get("action") || "follow";
  const label = params.get("label") || action;
  const fallback = document.querySelector("[data-fallback-link]");

  sendConversionEvent(action, label, target);

  if (fallback) {
    fallback.href = target;
  }

  window.setTimeout(() => {
    window.location.href = target;
  }, 650);
}

async function bootSite() {
  setupAnalytics();
  initButtonEffects();
  initBrokenGlassesCursor();
  initSiteMenu();
  initSignupForm();

  if (document.body.classList.contains("redirect-page")) {
    initRedirectPage();
    return;
  }

  await loadSpotifyCatalog();
  startVisualizer();
  initIndexPage();
}

bootSite();
