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

const GA_MEASUREMENT_ID = "";

const DEFAULT_TRACK_TITLE = "Whoremonger";
const DEFAULT_TRACK_INDEX = Math.max(0, SPOTIFY.tracks.findIndex((track) => track.title === DEFAULT_TRACK_TITLE));

const EVENT_NAMES = {
  follow: "spotify_follow_click",
  playlist_save: "spotify_playlist_save_click",
  track_save: "spotify_track_save_click",
  visualizer_play: "spotify_visualizer_play_click",
  email_signup: "email_signup_submit"
};

let activeTrackIndex = DEFAULT_TRACK_INDEX;
let visualizerRuntime;
let previewAudio;
let playingPreviewIndex = null;
let audioContext;
let audioSource;
let analyserNode;
let frequencyData;

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
  link.className = "button button--primary tracked-link";
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

function sendConversionEvent(action, label, target) {
  const eventName = EVENT_NAMES[action] || "spotify_click";
  const payload = {
    event: eventName,
    spotify_action: action,
    spotify_label: label,
    spotify_target: target,
    page_path: window.location.pathname,
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
  sendConversionEvent("visualizer_play", `preview_${index + 1}_${track.title}`, track.url);

  audio.play().catch(() => {
    playingPreviewIndex = null;
    syncTrackStates();
  });
}

function startVisualizer() {
  const canvas = document.querySelector("[data-visualizer-canvas]");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const runtime = {
    canvas,
    context,
    track: SPOTIFY.tracks[activeTrackIndex],
    particles: [],
    audio: readAudioSync(0),
    pulse: 1,
    last: 0
  };
  visualizerRuntime = runtime;

  for (let index = 0; index < 80; index += 1) {
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
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw(timestamp) {
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== Math.floor(rect.width * (window.devicePixelRatio || 1))) {
      resize();
    }

    const width = rect.width;
    const height = rect.height;
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
    requestAnimationFrame(draw);
  }

  resize();
  canvas.closest(".visualizer")?.addEventListener("pointermove", () => {
    runtime.pulse = Math.max(runtime.pulse, 1.12);
  });
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);
}

function drawPattern(context, runtime, width, height, time, primary, secondary, tertiary) {
  const sync = runtime.audio || readAudioSync(time);
  const audioHit = sync.isPlaying
    ? sync.level * 1.35 + sync.bass * 0.82 + sync.treble * 0.22 + sync.beat * 0.58
    : 0;
  const microFrequency = sync.isPlaying ? Math.pow(Math.max(0, Math.sin(time * 12.5)), 16) * sync.treble * 0.46 : 0;
  const energy = Math.min(1.75, Math.max(sync.isPlaying ? 0.28 : 0.18, runtime.pulse, audioHit + microFrequency));
  const silence = !sync.isPlaying;
  const lens = [
    [width * 0.07, height * 0.23],
    [width * 0.72 + energy * 16, height * 0.08],
    [width * 0.95, height * 0.34],
    [width * 0.82, height * 0.92],
    [width * 0.18 - energy * 12, height * 0.84]
  ];
  const centerX = width * 0.52;
  const centerY = height * 0.52;

  context.lineCap = "round";
  context.lineJoin = "round";
  context.fillStyle = "#030000";
  context.fillRect(0, 0, width, height);

  drawDimensionalVoid(context, width, height, time, energy, primary);
  drawLensShadow(context, lens, energy);

  context.save();
  tracePolygon(context, lens);
  context.clip();
  drawLensInterior(context, width, height, time, energy, primary, secondary);
  drawTrackSignature(context, runtime.track, width, height, time, energy, primary, secondary, tertiary, sync);
  drawFrequencyLine(context, width, height, time, energy, silence, tertiary);
  if (!silence) {
    drawDimensionalFlash(context, width, height, energy, primary, secondary);
  }
  context.restore();

  drawLensGlass(context, lens, width, height, energy);
  drawLensCracks(context, width, height, energy, primary);
  drawFloatingShards(context, runtime, width, height, time, energy, primary, tertiary);
  drawFrequencyLine(context, width, height, time, Math.max(energy * 0.72, 0.18), silence, "rgba(255,255,255,0.92)");

  context.globalAlpha = 1;
  context.shadowBlur = 0;
  context.setLineDash([]);
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
  link.className = "button button--primary tracked-link";
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
    document.querySelector("[data-visualizer]")?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    SPOTIFY.tracks.forEach((track, index) => {
      trackList.append(buildTrackCard(track, index));
    });
    setVisualizerTrack(SPOTIFY.tracks[DEFAULT_TRACK_INDEX], DEFAULT_TRACK_INDEX);
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

setupAnalytics();
initButtonEffects();
initBrokenGlassesCursor();
initSiteMenu();
initSignupForm();

if (document.body.classList.contains("redirect-page")) {
  initRedirectPage();
} else {
  startVisualizer();
  initIndexPage();
}
