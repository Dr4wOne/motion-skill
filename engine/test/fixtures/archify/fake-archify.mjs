#!/usr/bin/env node
// Test double for the Archify CLI: checks the arguments and offline env, prints a committed raw layout.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [cmd, type, spec, flag] = process.argv.slice(2);
if (process.env.ARCHIFY_UPDATE_CHECK_DISABLED !== '1') { console.error('update check not disabled'); process.exit(3); }
const dir = path.dirname(fileURLToPath(import.meta.url));
if (cmd === 'inspect' && type === 'architecture' && spec) process.stdout.write(readFileSync(path.join(dir, 'raw-architecture.json'), 'utf8'));
else if (cmd === 'validate' && type === 'workflow' && flag === '--layout-json') process.stdout.write(readFileSync(path.join(dir, 'raw-workflow.json'), 'utf8'));
else { console.error(`unexpected args: ${process.argv.slice(2).join(' ')}`); process.exit(2); }
