// Read .env without printing it. Values never leave this process except in API headers.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
export function loadEnv(root) {
  const f = path.join(root, '.env');
  const env = {};
  if (existsSync(f)) for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return { ...env, ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('ELEVENLABS_'))) };
}
