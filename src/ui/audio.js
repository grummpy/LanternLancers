/** Live Web Audio chiptune. No audio files. */

const MELODY = [220, 261.63, 329.63, 392, 349.23, 329.63, 261.63, 196];
const BASS = [110, 130.81, 98, 87.31];

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let volume = 0.7;
  let themeOn = false;
  let nextTime = 0;
  let step = 0;
  let lastFlap = 0;
  let noiseState = 1;

  function ensure() {
    const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain, slide) {
    const audio = ensure();
    if (!audio || muted || gain <= 0) return;
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    amp.gain.setValueAtTime(Math.max(gain, 0.0001), t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, gain) {
    const audio = ensure();
    if (!audio || muted) return;
    const length = Math.max(1, Math.floor(audio.sampleRate * dur));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      noiseState = (noiseState * 16807) % 2147483647;
      data[i] = noiseState / 2147483647 * 2 - 1;
    }
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    const amp = audio.createGain();
    amp.gain.setValueAtTime(gain, audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(master);
    src.start();
  }

  return {
    unlock: ensure,
    setVolume(value) {
      volume = value;
      if (master && !muted) master.gain.value = volume;
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : volume;
    },
    startTheme() {
      themeOn = true;
      if (ensure()) nextTime = ctx.currentTime + 0.05;
    },
    update() {
      if (!themeOn || muted || !ensure()) return;
      if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.02;
      const horizon = ctx.currentTime + 0.28;
      while (nextTime < horizon) {
        const index = step % MELODY.length;
        toneAt(MELODY[index], nextTime, 0.24, "square", 0.035);
        if (index % 2 === 0) toneAt(BASS[index / 2], nextTime, 0.32, "triangle", 0.045);
        nextTime += 0.3;
        step += 1;
      }
    },
    flap() {
      const audio = ensure();
      if (!audio || muted) return;
      if (audio.currentTime - lastFlap < 0.06) return;
      lastFlap = audio.currentTime;
      tone(480, 0.06, "square", 0.02, 240);
    },
    dash() {
      tone(180, 0.12, "sawtooth", 0.04, 70);
    },
    pop() {
      noise(0.08, 0.08);
      tone(660, 0.09, "square", 0.05, 220);
    },
    bounce() {
      tone(180, 0.06, "triangle", 0.04, 120);
    },
    pickup() {
      tone(523, 0.08, "square", 0.04);
      tone(659, 0.1, "square", 0.035);
      tone(784, 0.14, "square", 0.03);
    },
    ko() {
      noise(0.18, 0.07);
      tone(360, 0.28, "sawtooth", 0.05, 60);
    },
    fog() {
      tone(90, 0.16, "sine", 0.06, 50);
    },
    tick() {
      tone(880, 0.07, "square", 0.04);
    },
    go() {
      tone(523, 0.12, "square", 0.05);
      tone(659, 0.14, "square", 0.04);
      tone(784, 0.18, "square", 0.04);
    },
    roundWin() {
      tone(523, 0.12, "triangle", 0.05);
      tone(659, 0.16, "triangle", 0.05);
      tone(784, 0.2, "triangle", 0.05);
      tone(1046, 0.28, "triangle", 0.04);
    },
    matchWin() {
      tone(392, 0.16, "square", 0.05);
      tone(523, 0.18, "square", 0.05);
      tone(659, 0.22, "square", 0.045);
      tone(784, 0.32, "square", 0.04);
    },
  };

  function toneAt(freq, when, dur, type, gain) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    amp.gain.setValueAtTime(gain, when);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(amp);
    amp.connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }
}
