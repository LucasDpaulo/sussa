import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import electron from 'electron';

const directory = mkdtempSync(join(tmpdir(), 'sussa-youtube-'));
try {
  const flags = process.argv.includes('--no-sandbox') ? ['--no-sandbox'] : [];
  const result = spawnSync(electron, [...flags, 'scripts/youtube-smoke.cjs'], {
    env: { ...process.env, SUSSA_YOUTUBE_TEST_DIRECTORY: directory }, stdio: 'inherit', timeout: 45000
  });
  if (result.status !== 0) throw new Error(`YouTube smoke failed: ${result.error ?? result.status}`);
} finally {
  // No Windows, os arquivos do Chromium só são liberados após o processo terminar.
  rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
