#!/usr/bin/env node
// Build the review page: one card per scene (thumbnail, narration, on-screen text, duration,
// anchors) with approve/adjust buttons and a "copy feedback" output. Self-contained HTML.
//   npm run storyboard -- <slug>
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, renderFrames, run } from '../engine/render.mjs';
import { parseScript } from './lib/script.mjs';

const slug = process.argv[2];
if (!slug) { console.error('usage: npm run storyboard -- <slug>'); process.exit(1); }
const dir = (await import('../engine/render.mjs')).resolveProject(slug);
const board = JSON.parse(readFileSync(path.join(dir, 'storyboard.json'), 'utf8'));
const project = JSON.parse(readFileSync(path.join(dir, 'project.json'), 'utf8'));
const script = parseScript(readFileSync(path.join(dir, 'script.md'), 'utf8'));
const style = JSON.parse(readFileSync(path.join(ROOT, 'styles', `${project.style || 'default'}.style.json`), 'utf8'));
const pal = style.palettes.dark, light = style.palettes.light;
const roadmap = existsSync(path.join(dir, 'roadmap.json')) ? JSON.parse(readFileSync(path.join(dir, 'roadmap.json'), 'utf8')) : null;

// Thumbnails: each scene at ~70% of its duration (most elements revealed), downscaled to 640 px.
let start = 0;
const picks = board.scenes.map((s) => { const f = Math.round((start + s.duration * 0.7) * board.fps); start += s.duration; return f; });
const thumbDir = path.join(dir, 'out/storyboard-thumbs');
const { results } = await renderFrames(dir, picks, thumbDir, { workers: 4 });
const thumbs = [];
for (const r of results) {
  const small = r.file.replace(/\.png$/, '.640.jpg');
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', r.file, '-vf', 'scale=640:-1', '-q:v', '4', small]);
  thumbs.push(readFileSync(small).toString('base64'));
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
let t0 = 0;
// Section headings when the Blueprint block or topic changes (v2 boards group cards by topic).
const topicOf = (id) => roadmap?.topics.find((t) => t.id === id);
const groupKey = (s) => (s.block === 'topic' ? `topic:${s.topic}` : s.block || '');
const groupTitle = (s) => {
  if (s.block !== 'topic') return s.block ? s.block.replace(/-/g, ' ') : '';
  const t = topicOf(s.topic);
  return t ? `Topic ${roadmap.topics.indexOf(t) + 1} · ${t.title} <span class="muted">(budget ${t.budgetSec} s · recap: ${esc(t.recap)})</span>` : s.topic;
};
const cards = board.scenes.map((s, i) => {
  const head = groupKey(s) && groupKey(s) !== groupKey(board.scenes[i - 1] || {}) ? `<h2 class="group">${groupTitle(s)}</h2>\n` : '';
  const sid = s.say?.split(':')[0];
  const part = script.scenes.find((x) => x.id === sid);
  const card = `<article class="card" data-id="${esc(s.id)}">
  <img src="data:image/jpeg;base64,${thumbs[i]}" alt="Frame from scene ${esc(s.id)}" width="640" height="360">
  <div class="body">
    <header><span class="id">${esc(s.id)}</span><span class="tpl">${esc(s.template)}${s.part ? ` · ${esc(s.part)}` : ''}</span><span class="time">${fmt(t0)} · ${s.duration.toFixed(1)} s</span></header>
    ${part ? `<h2>${esc(part.title)}</h2>` : '<h2>Title card</h2>'}
    ${s.narration ? `<p class="say">${esc(s.narration)}</p>` : '<p class="say muted">(no narration)</p>'}
    ${part?.onscreen ? `<p class="meta"><b>On screen</b> ${esc(part.onscreen)}</p>` : ''}
    ${s.anchors?.length ? `<p class="meta"><b>Source</b> ${s.anchors.map((a) => a === 'transition' ? 'transition' : `<a href="${esc(project.source)}#${esc(a)}">#${esc(a)}</a>`).join(' ')}</p>` : ''}
    <div class="actions" role="group" aria-label="Decision for ${esc(s.id)}">
      <button type="button" data-v="approve">Approve</button>
      <button type="button" data-v="adjust">Adjust</button>
    </div>
    <textarea placeholder="What should change in ${esc(s.id)}?" aria-label="Notes for ${esc(s.id)}"></textarea>
  </div></article>`;
  t0 += s.duration;
  return head + card;
}).join('\n');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Storyboard: ${esc(project.title)}</title>
<style>
:root{--bg:${light.bg};--surface:${light.surface};--ink:${light.ink};--muted:${light.muted};--accent:${light.accent};--line:${light.line}}
@media (prefers-color-scheme: dark){:root{--bg:${pal.bg};--surface:${pal.surface};--ink:${pal.ink};--muted:${pal.muted};--accent:${pal.accent};--line:${pal.line}}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.55 Georgia,"Source Serif 4",serif;padding:24px 16px 120px}
main{max-width:1100px;margin:0 auto}h1{font-size:2rem;margin:0 0 4px}.lede{color:var(--muted);margin:0 0 24px}
.card{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;border:1px solid var(--line);border-radius:2px;padding:16px;margin:0 0 16px;background:var(--surface)}
.card img{width:100%;height:auto;display:block;border-radius:2px}
.card header{display:flex;gap:12px;font:13px/1.4 ui-monospace,monospace;color:var(--muted)}.card .id{color:var(--accent)}
h2{font-size:1.2rem;margin:6px 0}.say{margin:0 0 8px}.muted{color:var(--muted)}.meta{font-size:.9rem;color:var(--muted);margin:4px 0}.meta b{color:var(--ink);font-weight:600;margin-right:6px}
a{color:var(--accent)}.actions{display:flex;gap:8px;margin:10px 0}
button{font:inherit;font-size:.9rem;padding:6px 14px;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:2px;cursor:pointer}
button[aria-pressed=true][data-v=approve]{border-color:var(--accent);color:var(--accent)}button[aria-pressed=true][data-v=adjust]{border-color:#d9a05b;color:#d9a05b}
textarea{width:100%;min-height:56px;font:inherit;font-size:.9rem;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:2px;padding:8px}
.bar{position:fixed;left:0;right:0;bottom:0;background:var(--surface);border-top:1px solid var(--line);padding:12px 16px;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap}
.group{font-size:1.3rem;margin:32px 0 12px;text-transform:capitalize}.group .muted{text-transform:none;font-size:.9rem;font-weight:400}.roadmap{border:1px solid var(--line);padding:12px 16px;margin:0 0 24px;background:var(--surface)}.roadmap ol{margin:0;padding-left:1.4em}
.bar output{color:var(--muted);font-size:.9rem}
@media (max-width:720px){.card{grid-template-columns:1fr}}
</style></head><body><main>
<h1>${esc(project.title)}: storyboard</h1>
${roadmap ? `<section class="roadmap"><p class="lede"><b>Thesis</b> ${esc(roadmap.thesis)}</p><ol>${roadmap.topics.map((t) => `<li><b>${esc(t.title)}</b> · ${t.budgetSec} s · ${esc(t.promise)}</li>`).join('')}</ol></section>` : ''}
<p class="lede">${board.scenes.length} scenes · ${fmt(board.totalSeconds)} (${board.scenes.some((s) => s.speech?.source === 'estimate') ? 'timing estimated from word count' : 'timing from narration'}) · ${esc(project.format)} · ${project.fps} fps. Mark each scene, add notes, then copy the feedback and paste it to Claude.</p>
${cards}
</main>
<div class="bar"><button type="button" id="copy">Copy feedback</button><button type="button" id="all">Approve all unmarked</button><output id="status" aria-live="polite"></output></div>
<script>
const KEY='storyboard:${esc(slug)}';
let state={};try{state=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
for(const card of document.querySelectorAll('.card')){
  const id=card.dataset.id, ta=card.querySelector('textarea'), st=state[id]||(state[id]={});
  ta.value=st.note||'';
  const paint=()=>card.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(st.v===b.dataset.v)));
  card.querySelectorAll('button').forEach(b=>b.onclick=()=>{st.v=st.v===b.dataset.v?undefined:b.dataset.v;paint();save()});
  ta.oninput=()=>{st.note=ta.value;if(ta.value&&!st.v){st.v='adjust';paint()}save()};paint();
}
document.getElementById('all').onclick=()=>{for(const c of document.querySelectorAll('.card')){const s=state[c.dataset.id];if(!s.v){s.v='approve';c.querySelector('[data-v=approve]').setAttribute('aria-pressed','true')}}save()};
document.getElementById('copy').onclick=async()=>{
  const ids=[...document.querySelectorAll('.card')].map(c=>c.dataset.id);
  const lines=ids.map(id=>{const s=state[id]||{};return '- '+id+': '+(s.v||'unmarked')+(s.note?' — '+s.note.replace(/\\s+/g,' ').trim():'')});
  const ok=ids.every(id=>state[id]?.v==='approve');
  const text='Storyboard feedback (${esc(slug)}): '+(ok?'APPROVE ALL':'changes requested')+'\\n'+lines.join('\\n');
  const out=document.getElementById('status');
  try{await navigator.clipboard.writeText(text);out.textContent='Copied '+ids.length+' scenes.'}catch{prompt('Copy this feedback:',text)}
};
</script></body></html>`;
writeFileSync(path.join(dir, 'storyboard.html'), html);
console.log(`✓ projects/${slug}/storyboard.html (${(html.length / 1024).toFixed(0)} KB, ${board.scenes.length} cards)`);
