// Works around a Vitest 5 bug on Windows: when the working directory has a
// lower-case drive letter (as VS Code terminals often provide), Vitest loads
// itself twice and every suite fails with "Vitest failed to find the runner".
// This launcher re-runs Vitest from the same directory with an upper-case drive.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const cwd = process.platform === 'win32' ? process.cwd().replace(/^[a-z]:/, (d) => d.toUpperCase()) : process.cwd();
const vitestBin = path.join(cwd, 'node_modules', 'vitest', 'vitest.mjs');

const result = spawnSync(process.execPath, [vitestBin, ...process.argv.slice(2)], { cwd, stdio: 'inherit' });
process.exit(result.status ?? 1);
