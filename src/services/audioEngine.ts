/**
 * Original, fully synthesised soundscape (no audio files, so no licensing questions):
 * wind (filtered noise), flowing water, a soft lydian pad, random glass chimes, and
 * one-shot sparkles. Nothing is created until the visitor turns sound on.
 *
 * Background music: "Advika's Waltz", an original music-box lullaby in D major
 * (rendered by scripts/compose-music.py, so it is ours to use). It is only
 * downloaded once sound is switched on, streams through a plain <audio> element
 * (no big decoded buffer in memory), and the ambient pad and random chimes step
 * back while it plays so nothing clashes.
 */
const MUSIC_URL = `${import.meta.env.BASE_URL}audio/advika-waltz.mp3`;
const MUSIC_LEVEL = 0.55;
type Sfx = 'sparkle' | 'bookOpen' | 'fairy' | 'doors' | 'reveal' | 'pop' | 'secret' | 'chime';

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private waterGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private reverbIn: GainNode | null = null;
  private chimeTimer: number | null = null;
  private enabled = false;
  private volume = 0.6;
  private waterLevel = 0.3;
    private music: HTMLAudioElement | null = null;
  private musicGain: GainNode | null = null;
  private pauseTimer: number | null = null;

  get isEnabled() {
    return this.enabled;
  }

  private noiseBuffer(ctx: AudioContext, seconds = 4) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // pink-ish noise (Paul Kellet's economy filter)
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    }
    return buf;
  }

  private build() {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    const ctx = new Ctor();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    this.master = master;

    // feedback-delay "hall" for chimes and sparkles
    const rvIn = ctx.createGain();
    const d1 = ctx.createDelay(1);
    const d2 = ctx.createDelay(1);
    d1.delayTime.value = 0.29;
    d2.delayTime.value = 0.43;
    const fb = ctx.createGain();
    fb.gain.value = 0.42;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 3800;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    rvIn.connect(d1).connect(damp).connect(d2).connect(fb).connect(d1);
    d2.connect(wet).connect(master);
    rvIn.connect(master);
    this.reverbIn = rvIn;

    const noise = this.noiseBuffer(ctx);
    // wind
    const wind = ctx.createBufferSource();
    wind.buffer = noise;
    wind.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = 'lowpass';
    wf.frequency.value = 500;
    wf.Q.value = 0.8;
    const wg = ctx.createGain();
    wg.gain.value = 0.32;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 260;
    lfo.connect(lfoAmt).connect(wf.frequency);
    wind.connect(wf).connect(wg).connect(master);
    wind.start();
    lfo.start();
    this.windFilter = wf;

    // water
    const water = ctx.createBufferSource();
    water.buffer = noise;
    water.loop = true;
    water.playbackRate.value = 1.7;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1100;
    bp.Q.value = 0.6;
    const hg = ctx.createGain();
    hg.gain.value = this.waterLevel * 0.35;
    water.connect(bp).connect(hg).connect(master);
    water.start(0, 1.3);
    this.waterGain = hg;

    // pad: D lydian, slow breathing filter
    const padF = ctx.createBiquadFilter();
    padF.type = 'lowpass';
    padF.frequency.value = 900;
    const padG = ctx.createGain();
    padG.gain.value = 0.012; // the waltz carries the harmony; the pad is just air underneath
    [146.83, 220, 277.18, 329.63, 415.3].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      o.detune.value = (i - 2) * 4;
      o.connect(padF);
      o.start();
    });
    const padLfo = ctx.createOscillator();
    padLfo.frequency.value = 0.05;
    const padAmt = ctx.createGain();
    padAmt.gain.value = 420;
    padLfo.connect(padAmt).connect(padF.frequency);
    padLfo.start();
    padF.connect(padG).connect(rvIn);
    this.buildMusic(ctx, master);
    // pause everything while the tab is in the background (phones especially)
    document.addEventListener('visibilitychange', () => {
      if (!this.enabled || !this.ctx) return;
      if (document.hidden) {
        this.music?.pause();
        void this.ctx.suspend();
      } else {
        void this.ctx.resume();
        void this.music?.play().catch(() => undefined);
      }
    });
    return true;
  }

  private buildMusic(ctx: AudioContext, master: GainNode) {
    try {
      const el = new Audio();
      el.src = MUSIC_URL;
      el.loop = true;
      el.preload = 'auto';
      el.setAttribute('playsinline', '');
      const g = ctx.createGain();
      g.gain.value = 0;
      ctx.createMediaElementSource(el).connect(g).connect(master);
      this.music = el;
      this.musicGain = g;
    } catch {
      this.music = null; // ambience and sound effects still work without it
    }
  }

  private startMusic() {
    const el = this.music;
    if (!el || !this.ctx || !this.musicGain) return;
    if (this.pauseTimer !== null) clearTimeout(this.pauseTimer);
    this.pauseTimer = null;
    // must be called inside the tap that enabled sound (iOS/Safari autoplay rules)
    void el.play().catch(() => undefined);
    this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicGain.gain.setTargetAtTime(MUSIC_LEVEL, this.ctx.currentTime, 1.2);
  }

  private bell(freq: number, when: number, gain = 0.08, decay = 2.4) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    g.connect(this.reverbIn!);
    [1, 2.76, 5.4].forEach((ratio, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * ratio;
      const pg = ctx.createGain();
      pg.gain.value = [1, 0.35, 0.12][i];
      o.connect(pg).connect(g);
      o.start(when);
      o.stop(when + decay + 0.1);
    });
  }

  private scheduleChimes() {
    const tick = () => {
      if (!this.enabled || !this.ctx) return;
      const base = 587.33; // D5
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const st = PENTA[Math.floor(Math.random() * PENTA.length)];
        this.bell(base * Math.pow(2, st / 12), this.ctx.currentTime + i * 0.18, (0.03 + Math.random() * 0.02) * (this.music ? 0.4 : 1), 3);
      }
      this.chimeTimer = window.setTimeout(tick, (this.music ? 3 : 1) * (2600 + Math.random() * 4200));
    };
    this.chimeTimer = window.setTimeout(tick, 1200);
  }

  async enable(volume: number) {
    this.volume = volume;
    if (!this.ctx && !this.build()) return false;
    // resume() can stay pending on devices without an audio sink; don't block the UI on it
    void this.ctx!.resume().catch(() => undefined);
    this.enabled = true;
    this.master!.gain.cancelScheduledValues(this.ctx!.currentTime);
    this.master!.gain.setTargetAtTime(this.volume * 0.8, this.ctx!.currentTime, 0.6);
    this.startMusic();
    if (this.chimeTimer === null) this.scheduleChimes();
    return true;
  }

  disable() {
    this.enabled = false;
    if (this.chimeTimer !== null) clearTimeout(this.chimeTimer);
    this.chimeTimer = null;
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
    this.musicGain?.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
    this.pauseTimer = window.setTimeout(() => {
      this.pauseTimer = null;
      if (this.enabled) return;
      this.music?.pause();
      void ctx.suspend();
    }, 1800);
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.enabled && this.ctx && this.master) this.master.gain.setTargetAtTime(v * 0.8, this.ctx.currentTime, 0.15);
  }

  /** 0..1 — louder near waterfalls, softer in the sky. */
  setScene(water: number, windiness: number) {
    if (!this.ctx || !this.waterGain || !this.windFilter) return;
    this.waterLevel = water;
    this.waterGain.gain.setTargetAtTime(water * 0.35, this.ctx.currentTime, 1.2);
    this.windFilter.Q.setTargetAtTime(0.6 + windiness * 2, this.ctx.currentTime, 1.5);
  }

  play(name: Sfx) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const D = 587.33;
    const at = (st: number) => D * Math.pow(2, st / 12);
    switch (name) {
      case 'sparkle':
      case 'chime':
        [0, 4, 7, 12].forEach((s, i) => this.bell(at(s + 12), t + i * 0.06, 0.035, 1.6));
        break;
      case 'pop':
        [7, 12, 16].forEach((s, i) => this.bell(at(s), t + i * 0.05, 0.05, 1.2));
        break;
      case 'bookOpen':
        [0, 7, 12, 16, 19, 24].forEach((s, i) => this.bell(at(s - 12), t + i * 0.12, 0.05, 3.2));
        break;
      case 'fairy':
        for (let i = 0; i < 10; i++) this.bell(at(PENTA[i] + 12), t + i * 0.045, 0.025, 1.4);
        break;
      case 'doors':
        [-12, -5, 0].forEach((s, i) => this.bell(at(s - 12), t + i * 0.3, 0.07, 4.5));
        break;
      case 'reveal':
        [0, 4, 7, 11, 14].forEach((s) => this.bell(at(s - 12), t, 0.04, 5));
        [12, 16, 19, 24].forEach((s, i) => this.bell(at(s), t + 0.4 + i * 0.1, 0.035, 3));
        break;
      case 'secret':
        for (let i = 0; i < 14; i++) this.bell(at(PENTA[i % PENTA.length] + (i > 9 ? 24 : 12)), t + i * 0.07, 0.03, 2);
        break;
    }
  }
}

export const audio = new AudioEngine();
