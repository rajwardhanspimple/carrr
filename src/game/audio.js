// Tiny procedural sound engine – no audio files needed.
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.started = false;
  }

  init() {
    if (this.started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(ctx.destination);

    // Engine: two detuned saws + lowpass
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.value = 400;
    this.engineFilter.Q.value = 2;
    this.osc1 = ctx.createOscillator();
    this.osc1.type = "sawtooth";
    this.osc2 = ctx.createOscillator();
    this.osc2.type = "square";
    this.osc1.frequency.value = 60;
    this.osc2.frequency.value = 30;
    const o2g = ctx.createGain();
    o2g.gain.value = 0.4;
    this.osc1.connect(this.engineFilter);
    this.osc2.connect(o2g).connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain).connect(this.master);
    this.osc1.start();
    this.osc2.start();

    // Wind / nitro noise
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    this.wind = ctx.createBufferSource();
    this.wind.buffer = buffer;
    this.wind.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.frequency.value = 800;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    this.wind.connect(this.windFilter).connect(this.windGain).connect(this.master);
    this.wind.start();

    this.started = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  setEnabled(v) {
    this.enabled = v;
    if (this.master) this.master.gain.setTargetAtTime(v ? 0.5 : 0, this.ctx.currentTime, 0.05);
  }

  // speed 0..1, nitro boolean
  updateEngine(speed01, nitro, playing) {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    const base = 45 + speed01 * 160 + (nitro ? 40 : 0);
    this.osc1.frequency.setTargetAtTime(base, t, 0.08);
    this.osc2.frequency.setTargetAtTime(base / 2, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(300 + speed01 * 1600, t, 0.1);
    this.engineGain.gain.setTargetAtTime(playing ? 0.12 + speed01 * 0.1 : 0, t, 0.1);
    this.windGain.gain.setTargetAtTime(playing ? speed01 * 0.08 + (nitro ? 0.15 : 0) : 0, t, 0.15);
    this.windFilter.frequency.setTargetAtTime(600 + speed01 * 1500 + (nitro ? 1200 : 0), t, 0.1);
  }

  blip(freq = 880, dur = 0.12, type = "sine", vol = 0.25) {
    if (!this.started) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.frequency.exponentialRampToValueAtTime(freq * 1.8, ctx.currentTime + dur);
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  coin() {
    this.blip(1200, 0.12, "sine", 0.2);
    setTimeout(() => this.blip(1800, 0.14, "sine", 0.15), 60);
  }

  pickup() {
    this.blip(500, 0.25, "triangle", 0.25);
  }

  whoosh() {
    if (!this.started) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 400;
    f.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.4);
    const g = ctx.createGain();
    g.gain.value = 0.3;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    src.connect(f).connect(g).connect(this.master);
    src.start();
    src.stop(ctx.currentTime + 0.5);
  }

  crash() {
    if (!this.started) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 2500;
    f.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.6);
    const g = ctx.createGain();
    g.gain.value = 0.8;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    src.connect(f).connect(g).connect(this.master);
    src.start();
    src.stop(ctx.currentTime + 0.8);
    this.blip(90, 0.4, "sawtooth", 0.3);
  }
}

export const audio = new AudioEngine();
