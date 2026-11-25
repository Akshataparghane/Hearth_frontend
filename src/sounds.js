let audio;
let ringTimer = 0;

function context() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audio) audio = new Ctx();
  if (audio.state === 'suspended') audio.resume().catch(() => {});
  return audio;
}

export function unlockSounds() {
  context();
}

function tone(freq, start, duration, gain) {
  const ctx = context();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const when = ctx.currentTime + start;
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.exponentialRampToValueAtTime(gain, when + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

export function playSend() {
  tone(740, 0, 0.07, 0.04);
  tone(980, 0.05, 0.08, 0.035);
}

export function playNotify() {
  tone(523, 0, 0.12, 0.06);
  tone(784, 0.11, 0.16, 0.06);
}

export function startCallSound() {
  stopCallSound();
  const pulse = () => {
    tone(440, 0, 0.28, 0.07);
    tone(494, 0.02, 0.28, 0.04);
    tone(440, 0.4, 0.28, 0.07);
    tone(494, 0.42, 0.28, 0.04);
  };
  pulse();
  ringTimer = window.setInterval(pulse, 1800);
}

export function stopCallSound() {
  if (ringTimer) window.clearInterval(ringTimer);
  ringTimer = 0;
}
