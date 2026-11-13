// One context for the service bell and all step timers. Resume synchronously
// inside a gesture; iOS also needs a source started during that gesture.
let audio;

export function primeAudio() {
  try {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return Promise.resolve();
    if (!audio || audio.state === 'closed') audio = new Context();
    if (audio.state === 'running') return Promise.resolve(audio);
    const resumed = audio.resume();
    const source = audio.createBufferSource();
    source.buffer = audio.createBuffer(1, 1, audio.sampleRate);
    source.connect(audio.destination);
    source.onended = () => source.disconnect();
    source.start(0);
    return Promise.resolve(resumed).then(() => audio).catch(() => undefined);
  } catch {
    return Promise.resolve();
  }
}

function ding(context) {
  if (!context || context.state !== 'running') return;
  const now = context.currentTime;
  // A struck metal bell: a quick attack and three decaying partials.
  for (const [frequency, volume, decay] of [[1320, 0.38, 1.1], [2640, 0.16, 0.65], [3696, 0.08, 0.35]]) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(gain).connect(context.destination);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start(now);
    osc.stop(now + decay + 0.02);
  }
}

function prepareAudioSession() {
  // iOS otherwise treats Web Audio as ambient and obeys the ringer mute switch.
  // https://bugs.webkit.org/show_bug.cgi?id=251532
  try {
    if (globalThis.navigator?.audioSession) navigator.audioSession.type = 'playback';
  } catch { /* Older Safari has no configurable audio session. */ }
}

function chomp(context, step = 0) {
  if (!context || context.state !== 'running') return;
  const now = context.currentTime;
  const pitch = [1, 0.92, 1.08][step % 3] || 1;

  // Short downward jaw-chomp thud.
  const osc = context.createOscillator();
  const oscGain = context.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(240 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(72 * pitch, now + 0.095);
  oscGain.gain.setValueAtTime(0.0001, now);
  oscGain.gain.exponentialRampToValueAtTime(0.36, now + 0.008);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
  osc.connect(oscGain).connect(context.destination);
  osc.onended = () => { osc.disconnect(); oscGain.disconnect(); };
  osc.start(now);
  osc.stop(now + 0.12);

  // Crumbly pastry & frosting crunch burst through a sweeping bandpass filter.
  const rate = context.sampleRate || 44100;
  const length = Math.max(1, Math.floor(rate * 0.16));
  const buffer = context.createBuffer(1, length, rate);
  const data = buffer.getChannelData?.(0);
  if (data) {
    let seed = 1337 + step * 97;
    for (let i = 0; i < length; i++) {
      seed = (seed * 16807) % 2147483647;
      const white = (seed / 1073741823.5) - 1;
      const t = i / rate;
      const pulse = 0.45 + 0.55 * Math.sin(t * Math.PI * 36) ** 2;
      const crackle = Math.abs(white) > 0.38 ? white : white * 0.25;
      data[i] = crackle * pulse * Math.exp(-t * 14);
    }
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter?.();
  const noiseGain = context.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.55, now + 0.006);
  noiseGain.gain.exponentialRampToValueAtTime(0.32, now + 0.05);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.155);
  if (filter) {
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1750 * pitch, now);
    filter.frequency.exponentialRampToValueAtTime(820 * pitch, now + 0.14);
    filter.Q.value = 0.95;
    source.connect(filter).connect(noiseGain).connect(context.destination);
  } else {
    source.connect(noiseGain).connect(context.destination);
  }
  source.onended = () => { source.disconnect(); filter?.disconnect(); noiseGain.disconnect(); };
  source.start(now);
  source.stop(now + 0.16);
}

export function ring() {
  try { globalThis.navigator?.vibrate?.([120, 80, 120]); } catch { /* Optional haptics. */ }
  prepareAudioSession();
  // Even an interrupted context is resumed before scheduling the ding.
  const ready = primeAudio();
  return ready.then(ding).catch(() => {});
}

export function bite(step = 0) {
  try { globalThis.navigator?.vibrate?.(30); } catch { /* Optional haptics. */ }
  prepareAudioSession();
  const ready = primeAudio();
  return ready.then((context) => chomp(context, step)).catch(() => {});
}

// A restored timer also needs its new document's audio unlocked before expiry.
if (typeof document !== 'undefined') {
  document.addEventListener('pointerup', primeAudio, { passive: true });
  document.addEventListener('keydown', primeAudio);
}
