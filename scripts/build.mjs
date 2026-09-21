import { cp, mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

await rm('.build', { recursive: true, force: true });
await rm('dist', { recursive: true, force: true });
const compiled = spawnSync('tsc', ['-p', 'tsconfig.json'], { stdio: 'inherit' });
if (compiled.status !== 0) process.exit(compiled.status ?? 1);
await mkdir('dist', { recursive: true });
await cp('.build/js', 'dist/js', { recursive: true });
await cp('index.html', 'dist/index.html');
await cp('styles.css', 'dist/styles.css');
console.log('Built dist/');
