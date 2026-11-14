import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const { openStore } = createRequire(import.meta.url)('../desktop/store.cjs');

test('desktop preserves state after reopening and rejects invalid writes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'sussa-store-'));
  let store;
  try {
    const file = join(directory, 'workspace.sqlite');
    store = openStore(file);
    assert.equal(store.getItem('meu-espaco-v1'), null);
    const state = JSON.stringify({ version: 1, tasks: [{ title: 'Estudar' }], sessions: [], notes: [{ text: 'Nota local' }] });
    store.setItem('meu-espaco-v1', state);
    assert.throws(() => store.setItem('meu-espaco-v1', '{invalid'));
    assert.throws(() => store.setItem('other', state));
    store.close();
    store = openStore(file);
    assert.equal(store.getItem('meu-espaco-v1'), state);
  } finally { store?.close(); rmSync(directory, { recursive: true, force: true }); }
});
