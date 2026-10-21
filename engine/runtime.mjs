// Browser side: load a project, then expose window.render(frame) → manifest.
// Params: root=/projects/<slug> (dir with storyboard.json + project.json), format=16:9|9:16,
//         size=WxH (output size; scenes always draw in design units), cut=<name> (storyboard.cuts).
import { buildTimeline, locateFrame } from './timeline.mjs';
import { SIZES, safeRect, minTextPx } from './safe-area.mjs';
import { makeApi } from './draw.mjs';
import { drawTracker } from './tracker.mjs';

export async function boot(canvas, params) {
  const root = params.get('root');
  const getJson = async (p) => { const r = await fetch(p); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json(); };
  const [board, project] = await Promise.all([getJson(`${root}/storyboard.json`), getJson(`${root}/project.json`)]);
  const style = await getJson(`/styles/${project.style || 'default'}.style.json`);
  // Channel brand (optional): palette, wordmark, end-screen slots, and the outro links (confirmed + outro).
  const optJson = async (p) => { const r = await fetch(p); return r.ok ? r.json() : null; };
  const brand = await optJson('/brand/brand.json');
  const links = await optJson('/brand/links.json');
  if (brand) brand.links = (links || []).filter((l) => l.status === 'confirmed' && l.outro).map((l) => ({ platform: l.platform, display: l.display || l.url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '') }));
  if (project.dials) style.dials = { ...style.dials, ...project.dials };
  const cutName0 = params.get('cut');
  const format = params.get('format') || (cutName0 && board.cuts[cutName0].format) || project.format || '16:9';
  const { width: W, height: H } = SIZES[format];
  const [outW, outH] = (params.get('size') || `${W}x${H}`).split('x').map(Number);
  const palette = style.palettes[project.theme || style.theme];
  const fps = Number(params.get('fps') || board.fps || project.fps || 30);
  const reducedMotion = params.get('reducedMotion') === '1' || !!project.reducedMotion;
  // Burned-in captions: cues in global seconds from <root>/captions/captions.json ({cues:[{start,end,text}]}).
  const cues = params.get('captions') === '1' ? (await getJson(`${root}/captions/captions${params.get('cut') ? '.' + params.get('cut') : ''}.json`)).cues : [];

  // Scenes for this cut: all scenes, or a named cut [{id, duration?, props?}] from storyboard.cuts.
  const cutName = params.get('cut');
  let scenes = board.scenes;
  if (cutName) {
    const byId = new Map(board.scenes.map((s) => [s.id, s]));
    scenes = board.cuts[cutName].scenes.map((c) => ({ ...byId.get(c.id), ...c, props: { ...byId.get(c.id).props, ...c.props } }));
  }

  // Fonts
  for (const [, f] of Object.entries(style.fonts)) {
    for (const [variant, file] of Object.entries(f.files)) {
      const desc = /^\d+$/.test(variant) ? { weight: variant } : { weight: f.weights || '400', style: variant };
      const face = new FontFace(f.family, `url(/${file})`, desc);
      document.fonts.add(await face.load());
    }
  }
  await document.fonts.ready;

  // Scene modules: project-local scenes/<id>.mjs when `module` is set, else templates/scenes/<template>.mjs
  const mods = {};
  for (const s of scenes) {
    // Data files (e.g. an Archify layout): props.layoutFile (repo-relative) is loaded once at boot into props.layout,
    // so render(t) stays pure and never touches the network.
    if (s.props?.layoutFile && !s.props.layout) s.props = { ...s.props, layout: await getJson('/' + s.props.layoutFile.replace(/^\/+/, '')) };
    const url = s.module ? `${root}/${s.module}` : `/templates/scenes/${s.template}.mjs`;
    mods[s.id] = (await import(url)).default;
    if (typeof mods[s.id]?.render !== 'function') throw new Error(`scene ${s.id}: ${url} has no default export with render()`);
  }

  const tl = buildTimeline(scenes, fps);
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  const safeFull = safeRect(format, W, H);
  const minPx = minTextPx(W, H);
  // Reserve the caption band (2 lines + padding) at the bottom of the safe area for every render,
  // so clean and captioned versions share one layout and captions never cover content.
  const captionBand = Math.round(2 * 1.3 * minPx * 1.15 + 3 * 16);
  const safe = { ...safeFull, h: safeFull.h - captionBand };
  const fade = style.motion.sceneFade;

  window.info = {
    W, H, outW, outH, fps, format, frames: tl.frames, duration: tl.duration, safe: safeFull, contentSafe: safe, minPx,
    scenes: tl.scenes.map((s) => ({ id: s.id, frameStart: s.frameStart, frames: s.frames, duration: s.duration })),
  };

  window.render = (frame) => {
    const loc = locateFrame(tl, frame);
    if (!loc) throw new Error(`frame ${frame} out of range 0..${tl.frames - 1}`);
    const { scene, localT } = loc;
    const sceneFade = Math.min(1, (localT + 1 / fps) / fade, (scene.duration - localT) / fade);
    const manifest = { frame, t: +(frame / fps).toFixed(4), scene: scene.id, block: scene.block || null, localT: +localT.toFixed(4), sceneFade: +Math.max(0, sceneFade).toFixed(3), texts: [] };
    ctx.setTransform(outW / W, 0, 0, outH / H, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);
    const api = makeApi({ ctx, style, palette, format, W, H, safe, minPx, scene, t: localT, reducedMotion, manifest, brand });
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, sceneFade));
    mods[scene.id].render(ctx, localT, api, scene.props || {});
    if (scene.block === 'topic' && scene.tracker !== false && board.roadmap) drawTracker(api, board.roadmap, scene.topic);
    ctx.restore();
    const t = frame / fps;
    const cue = cues.find((c) => t >= c.start && t < c.end);
    if (cue) drawCaption(api, cue.text);
    return manifest;
  };

  // Caption: bottom of the safe area on a surface plate, ≤ 2 lines, never below the size floor.
  function drawCaption(api, str) {
    const w = Math.min(safe.w, api.W * (format === '9:16' ? 0.88 : 0.7));
    const lay = api.layoutText(str, { x: 0, y: 0, w, h: 2 * 1.3 * minPx * 1.15, role: 'small', px: Math.round(minPx * 1.15 / api.k) });
    const pad = api.s(2);
    const y = safeFull.y + safeFull.h - lay.height - pad;
    api.box({ x: (api.W - lay.width) / 2 - pad * 1.5, y: y - pad, w: lay.width + pad * 3, h: lay.height + pad * 2, fill: 'surface', alpha: 0.92, decor: true });
    api.text(str, { x: (api.W - w) / 2, y, w, h: lay.height, role: 'small', px: Math.round(minPx * 1.15 / api.k), align: 'center', color: 'ink', on: 'surface', allowOrphan: true });
    api.manifest.texts[api.manifest.texts.length - 1].role = 'caption';
  }

  // Content hash of the current canvas pixels (determinism test).
  window.pixelHash = async () => {
    const data = ctx.getImageData(0, 0, outW, outH).data;
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  };
  return window.info;
}
