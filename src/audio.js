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

export function ring() {
  try { globalThis.navigator?.vibrate?.([120, 80, 120]); } catch { /* Optional haptics. */ }
  // iOS otherwise treats Web Audio as ambient and obeys the ringer mute switch.
  // https://bugs.webkit.org/show_bug.cgi?id=251532
  try {
    if (globalThis.navigator?.audioSession) navigator.audioSession.type = 'playback';
  } catch { /* Older Safari has no configurable audio session. */ }
  // Even an interrupted context is resumed before scheduling the ding.
  const ready = primeAudio();
  return ready.then(ding).catch(() => {});
}

// A restored timer also needs its new document's audio unlocked before expiry.
if (typeof document !== 'undefined') {
  document.addEventListener('pointerup', primeAudio, { passive: true });
  document.addEventListener('keydown', primeAudio);
}
