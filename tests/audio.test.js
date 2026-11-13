import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Mixer } from '../src/audio.js';

test('mute survives starting audio, changing volume and playing an alarm', async () => {
  const previous = globalThis.AudioContext;
  const param = () => ({ value: 0, setTargetAtTime(value) { this.value = value; }, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  globalThis.AudioContext = class {
    currentTime = 0;
    destination = {};
    async resume() {}
    createGain() { return { gain: param(), connect() {} }; }
    createOscillator() { return { frequency: param(), connect() {}, start() {}, stop() {} }; }
  };
  try {
    const mixer = new Mixer();
    await mixer.mute(true);
    await mixer.set('master', 75);
    assert.equal(mixer.master.gain.value, 0);
    await mixer.alarm();
    assert.equal(mixer.master.gain.value, 0);
    await mixer.set('master', 30);
    assert.equal(mixer.master.gain.value, 0);
    await mixer.mute(false);
    assert.equal(mixer.master.gain.value, .3);
    await mixer.mute(true);
    await mixer.start();
    assert.equal(mixer.master.gain.value, 0);
  } finally {
    globalThis.AudioContext = previous;
  }
});

test('rain shares one load and applies the latest volume after decoding', async () => {
  const oldContext = globalThis.AudioContext, oldFetch = globalThis.fetch;
  let release, requests = 0, sources = 0;
  const decoded = new Promise(resolve => { release = resolve; });
  globalThis.fetch = async () => { requests++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) }; };
  globalThis.AudioContext = class {
    currentTime = 0; destination = {};
    async resume() {}
    decodeAudioData() { return decoded; }
    createGain() { return { gain: { value: 0, setTargetAtTime(value) { this.value = value; } }, connect() {} }; }
    createBufferSource() { sources++; return { connect() {}, start() {} }; }
  };
  try {
    const mixer = new Mixer();
    await mixer.mute(true);
    const first = mixer.set('rain', 60), last = mixer.set('rain', 0);
    release({}); await Promise.all([first, last]);
    assert.equal(requests, 1); assert.equal(sources, 1);
    assert.equal(mixer.channels.rain.gain.value, 0);
    assert.equal(mixer.master.gain.value, 0);
  } finally { globalThis.AudioContext = oldContext; globalThis.fetch = oldFetch; }
});

test('music routes through master mute and keeps independent level', async () => {
  const previous = globalThis.AudioContext;
  const param = () => ({ value: 0, setTargetAtTime(value) { this.value = value; } });
  globalThis.AudioContext = class {
    currentTime = 0; destination = {};
    async resume() {}
    createGain() { return { gain: param(), connect(to) { this.target = to; } }; }
    createStereoPanner() { return { pan: param(), connect(to) { this.target = to; } }; }
    createOscillator() { return { frequency: param(), connect() {}, start() {} }; }
    createMediaElementSource() { return { connect() {} }; }
  };
  try {
    const mixer = new Mixer(); await mixer.mute(true); await mixer.attachMusic({});
    mixer.setMusicVolume(35); mixer.setSpatial(true);
    assert.equal(mixer.music.target, mixer.master);
    assert.equal(mixer.music.gain.value, .35);
    assert.equal(mixer.master.gain.value, 0);
    await mixer.set('master', 80); assert.equal(mixer.master.gain.value, 0);
    await mixer.mute(false); assert.equal(mixer.master.gain.value, .8);
    assert.equal(mixer.music.gain.value, .35);
    mixer.setSpatial(false); assert.equal(mixer.musicDepth.gain.value, 0);
  } finally { globalThis.AudioContext = previous; }
});
