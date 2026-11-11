export class Mixer {
  constructor() { this.channels = {}; }
  async start() {
    if (!this.ctx) {
      this.ctx = new AudioContext(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    }
    await this.ctx.resume();
  }
  async set(name, volume) {
    await this.start();
    if (name === 'master') { this.master.gain.setTargetAtTime(volume / 100, this.ctx.currentTime, .1); return; }
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
  async alarm() {
    await this.start();
    for (let i = 0; i < 3; i++) { const osc = this.ctx.createOscillator(), gain = this.ctx.createGain(), t = this.ctx.currentTime + i * .35; osc.frequency.value = 660; gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.12, t + .02); gain.gain.exponentialRampToValueAtTime(.001, t + .3); osc.connect(gain); gain.connect(this.master); osc.start(t); osc.stop(t + .32); }
  }
  async mute(muted) { if (this.ctx) await this.ctx[muted ? 'suspend' : 'resume'](); }
}
