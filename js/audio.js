// audio.js — everything the player hears is synthesized here, no audio files.
'use strict';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.started = false;
    this._musicTimer = null;
    this._nextNoteTime = 0;
    this._step = 0;
    this.tempo = 128; // bpm, cheeky little heist-funk groove
    this.heat = 0; // 0..5, speeds up / intensifies music
  }

  init() {
    if (this.started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.35;
    this.musicGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.7;
    this.sfxGain.connect(this.master);

    this.started = true;
    this._scheduleMusic();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.8;
    return this.muted;
  }

  // ---- low level synth helpers ----
  _osc(type, freq, t0, dur, gainVal, dest, opts = {}) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0005, gainVal), t0 + (opts.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(dest || this.sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
    return o;
  }

  _noise(t0, dur, gainVal, dest, filterFreq) {
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainVal, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = src;
    if (filterFreq) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = filterFreq;
      node.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(dest || this.sfxGain);
    src.start(t0);
    return src;
  }

  // ---- SFX ----
  playBark() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this._osc('sawtooth', 380, t, 0.12, 0.5, this.sfxGain, { slideTo: 140, attack: 0.005 });
    this._osc('square', 620, t + 0.02, 0.08, 0.25, this.sfxGain, { slideTo: 300 });
  }

  playSteal() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this._osc('square', f, t + i * 0.045, 0.13, 0.22, this.sfxGain, { attack: 0.005 }));
  }

  playPickup() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this._osc('triangle', 880, t, 0.09, 0.3, this.sfxGain);
    this._osc('triangle', 1320, t + 0.05, 0.09, 0.22, this.sfxGain);
  }

  playBusted() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    [220, 196, 174.6, 146.8].forEach((f, i) => {
      this._osc('sawtooth', f, t + i * 0.11, 0.16, 0.4, this.sfxGain, { attack: 0.005 });
    });
    this._noise(t, 0.3, 0.15, this.sfxGain, 800);
  }

  playHeatUp() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this._osc('square', 300, t, 0.18, 0.25, this.sfxGain, { slideTo: 700, attack: 0.01 });
  }

  playSiren() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this._osc('sine', 700, t, 0.5, 0.18, this.sfxGain, { slideTo: 1000 });
  }

  playClick() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this._osc('square', 500, t, 0.05, 0.2, this.sfxGain);
  }

  playSprintPuff() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.06, 0.06, this.sfxGain, 2000);
  }

  playHide() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this._osc('sine', 500, t, 0.25, 0.2, this.sfxGain, { slideTo: 120, attack: 0.01 });
  }

  playGameOver(win) {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    const seq = win ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [392, 349.2, 293.7, 246.9];
    seq.forEach((f, i) => this._osc('triangle', f, t + i * 0.16, 0.3, 0.3, this.sfxGain, { attack: 0.01 }));
  }

  // ---- procedural background music (bassline + arpeggio, speeds up with heat) ----
  setHeat(h) { this.heat = h; }

  _scheduleMusic() {
    const bassPattern = [55, 55, 82.41, 55, 98, 55, 82.41, 65.41]; // A1-ish minor groove
    const leadScale = [220, 261.63, 293.66, 329.63, 349.23, 392, 440, 523.25];
    let stepInScheduler = 0;

    const scheduleAhead = 0.2;
    const tick = () => {
      if (!this.ctx) return;
      const bpm = this.tempo + this.heat * 10;
      const stepDur = 60 / bpm / 2; // 8th notes
      while (this._nextNoteTime < this.ctx.currentTime + scheduleAhead) {
        const t = this._nextNoteTime;
        const step = this._step % 8;
        // bass every step
        const bassFreq = bassPattern[step];
        this._osc('sawtooth', bassFreq, t, stepDur * 0.9, 0.22, this.musicGain, { attack: 0.005 });
        // hat on off-beats
        if (step % 2 === 1) this._noise(t, 0.04, 0.05, this.musicGain, 6000);
        // kick on 0 and 4
        if (step === 0 || step === 4) this._osc('sine', 90, t, 0.15, 0.5, this.musicGain, { slideTo: 40, attack: 0.001 });
        // lead arpeggio, busier when heat is high
        const playLead = this.heat > 0 ? true : (step % 2 === 0);
        if (playLead) {
          const idx = (Math.floor(this._step / 2) + (step % 3)) % leadScale.length;
          this._osc(this.heat >= 3 ? 'square' : 'triangle', leadScale[idx], t, stepDur * 0.8, 0.09, this.musicGain, { attack: 0.005 });
        }
        this._step++;
        this._nextNoteTime += stepDur;
      }
    };
    this._nextNoteTime = this.ctx.currentTime + 0.05;
    this._musicTimer = setInterval(tick, 50);
  }
}

const Sound = new SoundEngine();
