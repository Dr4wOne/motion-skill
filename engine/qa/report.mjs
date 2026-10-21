// Merge check results into qa-report.json and a one-screen markdown summary.
import { writeFileSync } from 'node:fs';

export function writeReport(file, { project, cut, results, extra = {} }) {
  const pass = results.every((r) => r.pass);
  const report = { project, cut: cut || null, date: new Date().toISOString(), pass, checks: results, ...extra };
  writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  const lines = [`# QA ${project}${cut ? ` (${cut})` : ''}: ${pass ? 'PASS' : 'FAIL'}`, '', '| check | result | key numbers |', '|---|---|---|'];
  for (const r of results) {
    const m = Object.entries(r.metrics || {}).filter(([, v]) => typeof v !== 'object').map(([k, v]) => `${k}=${v}`).join(', ');
    lines.push(`| ${r.name} | ${r.skipped ? `skipped (${r.skipped})` : r.pass ? 'pass' : `**FAIL** (${r.failureCount})`} | ${m} |`);
  }
  for (const r of results.filter((x) => !x.pass)) {
    lines.push('', `## ${r.name}`);
    for (const f of r.failures.slice(0, 8)) lines.push(`- ${f.scene ? `[${f.scene}] ` : ''}${f.t != null ? `t=${f.t}s ` : ''}${f.frames > 1 ? `(${f.frames} frames) ` : ''}${f.msg}`);
  }
  writeFileSync(file.replace(/\.json$/, '.md'), lines.join('\n') + '\n');
  return { pass, summary: lines.join('\n') };
}
