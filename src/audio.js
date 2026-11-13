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
  const pitch = [1, 0.94, 1.07][step % 3] || 1;

  // Subtle short jaw thump so the crisp crunch dominates.
  const osc = context.createOscillator();
  const oscGain = context.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(165 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(56 * pitch, now + 0.05);
  oscGain.gain.setValueAtTime(0.0001, now);
  oscGain.gain.exponentialRampToValueAtTime(0.14, now + 0.005);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  osc.connect(oscGain).connect(context.destination);
  osc.onended = () => { osc.disconnect(); oscGain.disconnect(); };
  osc.start(now);
  osc.stop(now + 0.07);

  // Granular crisp crunch buffer: multi-wave crumb grit + sharp fracture snaps.
  const rate = context.sampleRate || 44100;
  const length = Math.max(1, Math.floor(rate * 0.24));
  const buffer = context.createBuffer(1, length, rate);
  const data = buffer.getChannelData?.(0);
  if (data) {
    let seed = 4242 + step * 131;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const white = rand() * 2 - 1;
      const wave = (
        Math.exp(-((t - 0.018) ** 2) / 0.0008)
        + 0.95 * Math.exp(-((t - 0.082) ** 2) / 0.0015)
        + 0.55 * Math.exp(-((t - 0.155) ** 2) / 0.0018)
      );
      data[i] = white * 0.3 * wave;
    }
    for (let s = 0; s < 48; s++) {
      const tCenter = s < 18 ? rand() * 0.055 : s < 36 ? 0.055 + rand() * 0.08 : 0.135 + rand() * 0.09;
      const idx = Math.floor(tCenter * rate);
      const amp = (s < 36 ? 0.9 : 0.6) * (0.55 + 0.45 * rand()) * (rand() > 0.5 ? 1 : -1);
      const snapLen = Math.max(1, Math.floor(rate * (0.0011 + rand() * 0.0016)));
      for (let k = 0; k < snapLen && idx + k < length; k++) {
        const env = Math.exp(-k / (snapLen * 0.3));
        const sign = k === 0 ? 1 : (rand() > 0.35 ? 1 : -0.75);
        data[idx + k] = Math.max(-1, Math.min(1, data[idx + k] + amp * env * sign));
      }
    }
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  const midFilter = context.createBiquadFilter?.();
  const hiFilter = context.createBiquadFilter?.();
  const midGain = context.createGain();
  midGain.gain.setValueAtTime(0.0001, now);
  midGain.gain.exponentialRampToValueAtTime(0.65, now + 0.004);
  midGain.gain.linearRampToValueAtTime(0.55, now + 0.16);
  midGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.235);

  let hiGain;
  if (midFilter && hiFilter) {
    midFilter.type = 'bandpass';
    midFilter.frequency.setValueAtTime(2450 * pitch, now);
    midFilter.frequency.exponentialRampToValueAtTime(1250 * pitch, now + 0.22);
    midFilter.Q.value = 0.8;

    hiFilter.type = 'highpass';
    hiFilter.frequency.setValueAtTime(2400 * pitch, now);
    hiGain = context.createGain();
    hiGain.gain.setValueAtTime(0.0001, now);
    hiGain.gain.exponentialRampToValueAtTime(0.55, now + 0.004);
    hiGain.gain.linearRampToValueAtTime(0.45, now + 0.16);
    hiGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.235);

    source.connect(midFilter).connect(midGain).connect(context.destination);
    source.connect(hiFilter).connect(hiGain).connect(context.destination);
  } else if (midFilter) {
    midFilter.type = 'bandpass';
    midFilter.frequency.setValueAtTime(2450 * pitch, now);
    midFilter.frequency.exponentialRampToValueAtTime(1250 * pitch, now + 0.22);
    midFilter.Q.value = 0.8;
    source.connect(midFilter).connect(midGain).connect(context.destination);
  } else {
    source.connect(midGain).connect(context.destination);
  }
  source.onended = () => {
    source.disconnect();
    midFilter?.disconnect();
    hiFilter?.disconnect();
    midGain.disconnect();
    hiGain?.disconnect();
  };
  source.start(now);
  source.stop(now + 0.24);
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
