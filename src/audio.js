export class Mixer {
  constructor() { this.channels = {}; this.muted = false; this.volume = 60; }
  async start() {
    if (!this.ctx) {
      this.ctx = new AudioContext(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.master.gain.value = this.muted ? 0 : this.volume / 100;
    }
    await this.ctx.resume();
  }
  async set(name, volume) {
    await this.start();
    if (name === 'master') { this.volume = volume; this.master.gain.setTargetAtTime(this.muted ? 0 : volume / 100, this.ctx.currentTime, .1); return; }
    if (!this.channels[name]) {
      const gain = this.ctx.createGain(); gain.gain.value = 0; gain.connect(this.master);
      if (name === 'delta' || name === 'theta') {
        const merger = this.ctx.createChannelMerger(2);
        [180, 180 + (name === 'delta' ? 3 : 6)].forEach((hz, i) => { const osc = this.ctx.createOscillator(); osc.frequency.value = hz; osc.connect(merger, 0, i); osc.start(); });
        merger.connect(gain);
      } else {
        const buffer = this.ctx.createBuffer(2, this.ctx.sampleRate * 8, this.ctx.sampleRate);
        for (let c = 0; c < 2; c++) { const data = buffer.getChannelData(c); let last = 0; for (let i = 0; i < data.length; i++) { const noise = Math.random() * 2 - 1; last = (last + .02 * noise) / 1.02; data[i] = name === 'rain' ? noise * .3 : last * 3.5; } }
        const source = this.ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = name === 'rain' ? 3000 : name === 'fire' ? 600 : 900;
        source.connect(filter); filter.connect(gain); source.start();
        if (name === 'ocean') { const lfo = this.ctx.createOscillator(); const depth = this.ctx.createGain(); lfo.frequency.value = .12; depth.gain.value = 300; lfo.connect(depth); depth.connect(filter.frequency); lfo.start(); }
      }
      this.channels[name] = gain;
    }
    this.channels[name].gain.setTargetAtTime(volume / 100 * (['delta','theta'].includes(name) ? .12 : .7), this.ctx.currentTime, .1);
  }
  async alarm({ sound = 'bell', volume = 70 } = {}) {
    if (sound === 'none' || volume <= 0) return;
    await this.start();
    this.alarmNodes?.forEach(node => { try { node.stop(); } catch {} });
    this.alarmNodes = [];
    const patterns = {
      bell: [660, 660, 660],
      chime: [523.25, 659.25, 783.99, 1046.5],
      soft: [440, 554.37, 659.25],
      digital: [880, 660, 880, 660]
    };
    const notes = patterns[sound] || patterns.bell;
    const spacing = sound === 'soft' ? .55 : .35;
    notes.forEach((hz, i) => {
      const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
      const t = this.ctx.currentTime + i * spacing;
      osc.frequency.value = hz; osc.type = sound === 'digital' ? 'triangle' : 'sine';
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(.17 * volume / 100, t + .02);
      gain.gain.exponentialRampToValueAtTime(.001, t + spacing - .03);
      osc.connect(gain); gain.connect(this.master);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      osc.start(t); osc.stop(t + spacing); this.alarmNodes.push(osc);
    });
  }
  async mute(muted) {
    this.muted = muted;
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : this.volume / 100, this.ctx.currentTime, .1);
  }
}
