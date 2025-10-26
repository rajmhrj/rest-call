import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = path.join(rootDir, 'dist');

async function ensureDirExists(targetDir) {
  try {
    await access(targetDir, constants.F_OK);
  } catch {
    return false;
  }
  return true;
}

async function writeTypePackage(subDir, typeValue) {
  const target = path.join(distDir, subDir);
  if (!(await ensureDirExists(target))) {
    return;
  }

  await mkdir(target, { recursive: true });
  const typePkgPath = path.join(target, 'package.json');
  const contents = `${JSON.stringify({ type: typeValue }, null, 2)}\n`;
  await writeFile(typePkgPath, contents);
}

await Promise.all([
  writeTypePackage('cjs', 'commonjs'),
  writeTypePackage('esm', 'module'),
]);
