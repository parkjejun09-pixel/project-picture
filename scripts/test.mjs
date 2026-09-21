import { readdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

await rm('.build', { recursive: true, force: true });
const compiled = spawnSync('tsc', ['-p', 'tsconfig.json'], { stdio: 'inherit' });
if (compiled.status !== 0) process.exit(compiled.status ?? 1);
const testFiles = (await readdir('tests'))
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => path.join('tests', name));
const tests = spawnSync(process.execPath, ['--test', ...testFiles], { stdio: 'inherit' });
process.exit(tests.status ?? 1);
