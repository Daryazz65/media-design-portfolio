"use strict";

const parameters = new URLSearchParams(location.search);
const obsMode = parameters.get("mode") === "obs";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
document.body.classList.toggle("obs-mode", obsMode);

const lines = [
  { text: "Чат, я тут. Пару секунд, и продолжим.", file: "stream-line-1.wav", duration: 2710 },
  { text: "Так. На чём мы остановились?", file: "stream-line-2.wav", duration: 1760 },
  { text: "Я всё вижу. Чат, ведите себя прилично.", file: "stream-line-3.wav", duration: 2700 },
];

const scene = document.querySelector(".scene");
const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const subtitle = document.querySelector(".subtitle");
const next = document.querySelector('[data-action="next"]');
const loop = document.querySelector('[data-action="loop"]');
const sound = document.querySelector('[data-action="sound"]');
const portrait = new Image();
portrait.src = "./stream-scene.jpg";
const audio = document.querySelector("audio");
audio.volume = 0.72;

let lineIndex = -1;
let started = -Infinity;
let autoplay = obsMode || !reducedMotion;
let voiceEnabled = obsMode && parameters.get("sound") === "1";
let nextTime = autoplay ? performance.now() + 2300 : Infinity;
let audioContext;
let analyser;
let samples;
let jaw = 0;
let lastFrame = -Infinity;

function enableAudioAnalysis() {
  if (!window.AudioContext) return;
  if (!audioContext) {
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    samples = new Uint8Array(analyser.fftSize);
    audioContext.createMediaElementSource(audio).connect(analyser).connect(audioContext.destination);
  }
  audioContext.resume().catch(() => {});
}

function playLine(now = performance.now()) {
  lineIndex = (lineIndex + 1) % lines.length;
  const line = lines[lineIndex];
  subtitle.textContent = line.text;
  started = now;
  nextTime = now + 10500;
  audio.pause();
  if (voiceEnabled) {
    audio.src = line.file;
    audio.play().catch(() => {});
  }
}

function speechAmount(elapsed) {
  if (lineIndex < 0) return 0;
  if (voiceEnabled && !audio.paused && analyser && audioContext.state === "running") {
    analyser.getByteTimeDomainData(samples);
    let energy = 0;
    for (const value of samples) energy += ((value - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(energy / samples.length) * 4.9);
  }
  if (elapsed < 70 || elapsed > lines[lineIndex].duration) return 0;
  const beat = Math.sin(elapsed * .026) * Math.sin(elapsed * .0101);
  return Math.max(0, .16 + beat * .8);
}

function animateMouth(level) {
  if (level < .085) return;
  const width = 29 + level * 8;
  const opening = 3 + level * 16;
  context.save();
  context.translate(1061, 475);
  context.rotate(-.084);
  // Extend the lower lip into the open shape, then paint the mouth interior.
  context.fillStyle = "#864b45";
  context.beginPath();
  context.moveTo(-width, 0);
  context.quadraticCurveTo(4, -7, width, -2);
  context.quadraticCurveTo(15, opening + 10, -5, opening + 9);
  context.quadraticCurveTo(-20, opening + 7, -width, 0);
  context.fill();
  context.fillStyle = "#25151b";
  context.beginPath();
  context.moveTo(-width + 3, 0);
  context.quadraticCurveTo(0, -5 - level * 2, width - 2, -2);
  context.quadraticCurveTo(11, opening, -4, opening);
  context.quadraticCurveTo(-19, opening - 1, -width + 3, 0);
  context.fill();
  if (level > .4) {
    context.fillStyle = "#e7c9b4";
    context.beginPath();
    context.moveTo(-19, -.7);
    context.quadraticCurveTo(0, -3.2, 20, -1.3);
    context.quadraticCurveTo(8, 4.2, -12, 2.5);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function blinkEye(x, y, angle) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  const lid = context.createLinearGradient(0, -11, 0, 11);
  lid.addColorStop(0, "#a96849");
  lid.addColorStop(.56, "#b57455");
  lid.addColorStop(1, "#b77556");
  context.fillStyle = lid;
  context.beginPath();
  context.ellipse(0, 0, 23, 10, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#3d251f";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(-20, 1);
  context.quadraticCurveTo(2, 7, 22, 0);
  context.stroke();
  context.restore();
}

function draw(now) {
  const elapsed = now - started;
  jaw += (speechAmount(elapsed) - jaw) * .48;
  context.drawImage(portrait, 0, 0, canvas.width, canvas.height);
  animateMouth(jaw);
  const blink = now % 4380;
  if (!reducedMotion && blink > 4228 && blink < 4350) {
    blinkEye(1014, 385, .046);
    blinkEye(1100, 377, -.085);
  }
  const glow = context.createRadialGradient(1230, 342, 8, 1230, 342, 185);
  glow.addColorStop(0, "rgba(63,105,255," + (.06 + Math.sin(now / 1900) * .035) + ")");
  glow.addColorStop(1, "transparent");
  context.fillStyle = glow;
  context.fillRect(1045, 157, 370, 370);
}

function tick(now) {
  if (autoplay && now >= nextTime) playLine(now);
  if (!document.hidden && now - lastFrame >= 31 && portrait.complete && portrait.naturalWidth) {
    draw(now);
    lastFrame = now;
  }
  requestAnimationFrame(tick);
}

next.addEventListener("click", () => {
  if (voiceEnabled) enableAudioAnalysis();
  playLine();
});
loop.setAttribute("aria-pressed", String(autoplay));
loop.addEventListener("click", () => {
  autoplay = !autoplay;
  loop.setAttribute("aria-pressed", String(autoplay));
  nextTime = autoplay ? performance.now() + 1200 : Infinity;
});
sound.addEventListener("click", () => {
  voiceEnabled = !voiceEnabled;
  sound.setAttribute("aria-pressed", String(voiceEnabled));
  if (voiceEnabled) {
    enableAudioAnalysis();
    playLine();
  } else {
    audio.pause();
  }
});
if (obsMode) scene.querySelector(".controls").hidden = true;
requestAnimationFrame(tick);
