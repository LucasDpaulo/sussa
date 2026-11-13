import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import electron from 'electron';
const directory = mkdtempSync(join(tmpdir(), 'pomodoro-desktop-'));
try {
  for (const args of [['--write'], []]) {
    const testFlags = process.argv.includes('--no-sandbox') ? ['--no-sandbox'] : [];
    const result = spawnSync(electron, [...testFlags, 'scripts/desktop-smoke.cjs', ...args], {
      env: { ...process.env, XDG_CONFIG_HOME: directory, APPDATA: directory }, stdio: 'inherit', timeout: 50000
    });
    if (result.status !== 0) throw new Error(`Desktop smoke failed: ${result.error ?? result.status}`);
  }
} finally { rmSync(directory, { recursive: true, force: true }); }
