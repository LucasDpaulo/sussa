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
