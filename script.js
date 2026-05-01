const app = document.querySelector(".app-shell");
const loginForm = document.querySelector("#login-form");
const nameInput = document.querySelector("#name-input");
const finalMessage = document.querySelector("#final-message");
const goBackButton = document.querySelector("#go-back-button");
const ghostJump = document.querySelector("#ghost-jump");
const ghostScream = document.querySelector("#ghost-scream");
const leftCode = document.querySelector("#left-code");
const rightCode = document.querySelector("#right-code");
const breachGrid = document.querySelector("#breach-grid");
const canvas = document.querySelector("#matrix-rain");
const context = canvas.getContext("2d");

const tokens = [
  "0xDEAD",
  "NULL",
  "root",
  "void",
  "panic",
  "SIGIL",
  "crypt",
  "ghost",
  "sudo",
  "trace",
  "hex",
  "daemon",
  "BIOS",
  "inject",
  "proxy",
  "404",
  "reaper",
  "sys.lock",
  "wake",
  "fork",
  "drain",
  "mask",
  "host",
  "blink",
];

const glyphs = "01{}[]<>/\\|$#@%&*-+=?!:;ZXCVBNM";
const ghostRepeatMs = 5000;
const ghostAnimationBufferMs = 220;
let drops = [];
let matrixFontSize = 16;
let breachInterval = 0;
let breachTimeout = 0;
let ghostTimer = 0;
let ghostRepeatTimer = 0;
let ghostPlayToken = 0;
let screamAudioContext = null;
let screamAudioBuffer = null;
let screamAudioLoadPromise = null;
let currentScreamSource = null;

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomHex(length = 6) {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += "0123456789ABCDEF"[Math.floor(Math.random() * 16)];
  }

  return value;
}

function makeCodeLine(side) {
  const prefix = side === "left" ? ">" : "::";
  const signal = Math.random() > 0.72 ? `// ${randomItem(tokens)}` : "";
  const payload = Array.from({ length: Math.floor(Math.random() * 7) + 4 }, () =>
    Math.random() > 0.46 ? randomItem(tokens) : randomHex(Math.floor(Math.random() * 5) + 3),
  ).join(".");

  return `${prefix} ${randomItem(tokens)}_${randomHex(3)}(${payload}) ${signal}`;
}

function fillSideCode() {
  const lineCount = Math.ceil(window.innerHeight / 13);
  leftCode.textContent = Array.from({ length: lineCount }, () => makeCodeLine("left")).join("\n");
  rightCode.textContent = Array.from({ length: lineCount }, () => makeCodeLine("right")).join("\n");
}

function fillBreachGrid() {
  const lineCount = Math.ceil(window.innerHeight / 16);
  const lines = Array.from({ length: lineCount * 2 }, () => {
    return Array.from({ length: 9 }, () => `${randomItem(tokens)}:${randomHex(8)}`).join("  ");
  });

  breachGrid.textContent = lines.join("\n");
}

function sizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * pixelRatio);
  canvas.height = Math.floor(window.innerHeight * pixelRatio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  matrixFontSize = window.innerWidth < 600 ? 13 : 16;
  drops = Array.from({ length: Math.ceil(window.innerWidth / matrixFontSize) }, () =>
    Math.random() * window.innerHeight,
  );
}

function drawMatrix() {
  context.fillStyle = "rgba(2, 3, 5, 0.12)";
  context.fillRect(0, 0, window.innerWidth, window.innerHeight);
  context.font = `${matrixFontSize}px Consolas, monospace`;

  drops.forEach((drop, index) => {
    const char = glyphs[Math.floor(Math.random() * glyphs.length)];
    const x = index * matrixFontSize;
    const hot = Math.random() > 0.985;

    context.fillStyle = hot ? "rgba(255, 23, 72, 0.95)" : "rgba(55, 255, 139, 0.58)";
    context.fillText(char, x, drop);

    drops[index] = drop > window.innerHeight + Math.random() * 500 ? 0 : drop + matrixFontSize;
  });

  requestAnimationFrame(drawMatrix);
}

function sanitizeName(value) {
  return value.trim().replace(/\s+/g, " ").slice(0, 28) || "UNKNOWN";
}

function syncGhostAnimationDuration() {
  const duration = screamAudioBuffer?.duration ?? ghostScream?.duration;

  if (!duration || Number.isNaN(duration)) {
    return;
  }

  const durationMs = Math.max(900, Math.round(duration * 1000) + ghostAnimationBufferMs);
  document.documentElement.style.setProperty("--ghost-duration", `${durationMs}ms`);
}

function getScreamAudioContext() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  if (!screamAudioContext) {
    screamAudioContext = new AudioContextConstructor();
  }

  if (screamAudioContext.state === "suspended") {
    screamAudioContext.resume();
  }

  return screamAudioContext;
}

function loadScreamBuffer() {
  const contextToUse = getScreamAudioContext();

  if (!contextToUse) {
    return Promise.resolve(null);
  }

  if (screamAudioBuffer) {
    return Promise.resolve(screamAudioBuffer);
  }

  if (!screamAudioLoadPromise) {
    screamAudioLoadPromise = fetch("assets/ghost-scream.m4a")
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => contextToUse.decodeAudioData(arrayBuffer.slice(0)))
      .then((audioBuffer) => {
        screamAudioBuffer = audioBuffer;
        syncGhostAnimationDuration();
        return audioBuffer;
      })
      .catch(() => null);
  }

  return screamAudioLoadPromise;
}

function clearScareTimers() {
  ghostPlayToken += 1;
  window.clearInterval(breachInterval);
  window.clearTimeout(breachTimeout);
  window.clearTimeout(ghostTimer);
  window.clearInterval(ghostRepeatTimer);
  breachInterval = 0;
  breachTimeout = 0;
  ghostTimer = 0;
  ghostRepeatTimer = 0;
}

function prepareScreamAudio() {
  getScreamAudioContext();
  loadScreamBuffer();

  if (!ghostScream) {
    return;
  }

  ghostScream.volume = 1;
  ghostScream.addEventListener("loadedmetadata", syncGhostAnimationDuration, { once: true });
  ghostScream.load();

  const wasMuted = ghostScream.muted;
  ghostScream.muted = true;
  const unlockPromise = ghostScream.play();

  if (!unlockPromise) {
    ghostScream.muted = wasMuted;
    return;
  }

  unlockPromise
    .then(() => {
      ghostScream.pause();
      ghostScream.currentTime = 0;
      ghostScream.muted = wasMuted;
    })
    .catch(() => {
      ghostScream.muted = wasMuted;
    });
}

function stopScreamAudio() {
  if (currentScreamSource) {
    try {
      currentScreamSource.stop();
    } catch (error) {
      // The source may have already finished naturally.
    }

    currentScreamSource.disconnect();
    currentScreamSource = null;
  }

  if (!ghostScream) {
    return;
  }

  ghostScream.pause();

  try {
    ghostScream.currentTime = 0;
  } catch (error) {
    // Some browsers disallow seeking before metadata is ready.
  }
}

async function playScream() {
  stopScreamAudio();

  const contextToUse = getScreamAudioContext();
  const audioBuffer = await loadScreamBuffer();

  if (contextToUse && audioBuffer) {
    const source = contextToUse.createBufferSource();
    const gain = contextToUse.createGain();

    source.buffer = audioBuffer;
    gain.gain.value = 1;
    source.connect(gain).connect(contextToUse.destination);
    source.onended = () => {
      if (currentScreamSource === source) {
        currentScreamSource = null;
      }
    };
    currentScreamSource = source;
    syncGhostAnimationDuration();
    source.start(contextToUse.currentTime);
    return true;
  }

  if (!ghostScream) {
    return false;
  }

  ghostScream.muted = false;
  ghostScream.volume = 1;
  syncGhostAnimationDuration();

  try {
    await ghostScream.play();
    return true;
  } catch (error) {
    return false;
  }
}

function triggerGhostAnimation() {
  ghostJump.classList.remove("is-visible");
  void ghostJump.offsetWidth;
  ghostJump.classList.add("is-visible");
}

function showGhost() {
  const playToken = ++ghostPlayToken;

  ghostJump.classList.remove("is-visible");
  playScream().then(() => {
    if (playToken === ghostPlayToken && app.dataset.state === "success") {
      triggerGhostAnimation();
    }
  });
}

function startGhostLoop() {
  window.clearTimeout(ghostTimer);
  window.clearInterval(ghostRepeatTimer);
  ghostJump.classList.remove("is-visible");

  ghostTimer = window.setTimeout(() => {
    showGhost();
    ghostRepeatTimer = window.setInterval(showGhost, ghostRepeatMs);
  }, ghostRepeatMs);
}

function resetLogin() {
  clearScareTimers();
  stopScreamAudio();
  app.dataset.state = "idle";
  ghostJump.classList.remove("is-visible");
  nameInput.value = "";
  finalMessage.textContent = "";
  nameInput.focus();
}

function beginLogin(event) {
  event.preventDefault();
  clearScareTimers();
  prepareScreamAudio();

  const username = sanitizeName(nameInput.value).toUpperCase();
  finalMessage.textContent = `${username} YOU ARE DOOMED!!!!!!!!!!!`;
  app.dataset.state = "breach";
  nameInput.blur();

  breachInterval = window.setInterval(fillBreachGrid, 70);

  breachTimeout = window.setTimeout(() => {
    window.clearInterval(breachInterval);
    app.dataset.state = "success";
    startGhostLoop();
  }, 2000);
}

fillSideCode();
fillBreachGrid();
sizeCanvas();
drawMatrix();

window.setInterval(fillSideCode, 180);
window.addEventListener("resize", () => {
  fillSideCode();
  fillBreachGrid();
  sizeCanvas();
});
loginForm.addEventListener("submit", beginLogin);
goBackButton.addEventListener("click", resetLogin);
