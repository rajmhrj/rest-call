import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = path.join(rootDir, 'dist');

await rm(distDir, { recursive: true, force: true });
