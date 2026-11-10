#!/usr/bin/env node
/**
 * Injectează fotografiile reale ale antrenorilor în `__SM_ASSETS__` (public/index.html).
 *
 * Sursa: `assets/coach-photos/<clubId>.(jpg|jpeg|png)` — portrete decupate pătrat.
 * Rezultat: cheia `coach/club/<clubId>.webp`, 128×128 WebP (base64), folosită de
 * `_smClubCoachSrc(clubId)` din bundle. Fără fișier sursă, clubul rămâne pe
 * galeria generică de 24 de chipuri (fallback).
 *
 *   node tools/coach-photos.js            # injectează tot ce e în assets/coach-photos
 *   node tools/coach-photos.js --list     # doar ce e disponibil / ce lipsește
 *
 * Necesită ImageMagick (`convert`) pentru redimensionare și conversie WebP.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const HTML = path.join(ROOT, 'public', 'index.html');
const SRC_DIR = path.join(ROOT, 'assets', 'coach-photos');
const SIZE = 128;
const QUALITY = 80;

const CLUBS = {
  fcsb: 'Laurențiu Reghecampf',
  craiova: 'Filipe Coelho',
  dinamo: 'Nuno Campos',
  rapid: 'Daniel Pancu',
  cfr: 'Marius Șumudică',
  ucluj: 'Cristiano Bergodi',
  farul: 'Ioan Ovidiu Sabău',
  petrolul: 'Ricardo Sousa',
  sepsi: 'Ovidiu Burcă',
  uta: 'Adrian Mihalcea',
  corvinul: 'Florin Maxim',
  otelul: 'Rui Duarte',
  botosani: 'Marius Croitoru',
  arges: 'Bogdan Andone',
  voluntari: 'Florin Pîrvu',
  csikszereda: 'Valentin Suciu',
  realmadrid: 'Xabi Alonso',
  barcelona: 'Hansi Flick',
  mancity: 'Pep Guardiola',
  arsenal: 'Mikel Arteta',
  liverpool: 'Arne Slot',
  inter: 'Cristian Chivu',
  psg: 'Luis Enrique',
  bayern: 'Vincent Kompany',
};

/** Găsește capătul obiectului `__SM_ASSETS__={...}` (state machine simplu). */
function assetsBounds(html) {
  const start = html.indexOf('__SM_ASSETS__={');
  if (start < 0) throw new Error('Nu găsesc __SM_ASSETS__ în bundle');
  let open = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') open += 1;
    else if (ch === '}') {
      open -= 1;
      if (open === 0) return { start, open: start + '__SM_ASSETS__='.length, close: i };
    }
  }
  throw new Error('__SM_ASSETS__ neînchis');
}

function listSources() {
  if (!fs.existsSync(SRC_DIR)) return [];
  return fs
    .readdirSync(SRC_DIR)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((f) => {
      const id = path.basename(f).replace(/\.[^.]+$/, '');
      return { id, file: path.join(SRC_DIR, f) };
    })
    .filter((x) => CLUBS[x.id]);
}

/** Decupare pătrată (centrată pe treimea superioară, unde stă fața) + WebP mic. */
/** Decupaje manuale: `<clubId>: [x, y, latura]` (coordonate în pixelii pozei sursă). */
function manualCrops() {
  const f = path.join(SRC_DIR, 'crops.json');
  if (!fs.existsSync(f)) return {};
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8')) || {};
  } catch {
    return {};
  }
}

function buildWebp(file, crop) {
  const tmp = path.join(require('node:os').tmpdir(), `sm-coach-${process.pid}.webp`);
  const meta = execFileSync('identify', ['-format', '%w %h', file], { encoding: 'utf8' }).trim().split(' ');
  const w = Number(meta[0]);
  const h = Number(meta[1]);
  let side = Math.min(w, h);
  let x = Math.max(0, Math.round((w - side) / 2));
  let y = Math.max(0, Math.round(Math.min(h - side, (h - side) * 0.28)));
  if (Array.isArray(crop) && crop.length === 3) {
    side = Math.min(Math.round(crop[2]), w, h);
    x = Math.max(0, Math.min(w - side, Math.round(crop[0])));
    y = Math.max(0, Math.min(h - side, Math.round(crop[1])));
  }
  execFileSync('convert', [
    file,
    '-crop',
    `${side}x${side}+${x}+${y}`,
    '+repage',
    '-resize',
    `${SIZE}x${SIZE}`,
    '-quality',
    String(QUALITY),
    '-define',
    'webp:method=6',
    tmp,
  ]);
  const buf = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);
  return buf;
}

function main() {
  const listOnly = process.argv.includes('--list');
  const sources = listSources();
  const have = new Set(sources.map((s) => s.id));
  const missing = Object.keys(CLUBS).filter((id) => !have.has(id));
  console.log(`Portrete reale: ${sources.length}/${Object.keys(CLUBS).length}`);
  if (missing.length) console.log(`Lipsesc (fallback pe galerie): ${missing.join(', ')}`);
  if (listOnly) return 0;

  const crops = manualCrops();
  let html = fs.readFileSync(HTML, 'utf8');
  const bounds = assetsBounds(html);
  let body = html.slice(bounds.open, bounds.close);
  let added = 0;
  let total = 0;

  for (const src of sources) {
    const webp = buildWebp(src.file, crops[src.id]);
    total += webp.length;
    const key = `coach/club/${src.id}.webp`;
    const value = `"${key}":"data:image/webp;base64,${webp.toString('base64')}"`;
    const exists = new RegExp(`"${key.replace(/[/.]/g, '\\$&')}":"[^"]*"`);
    if (exists.test(body)) body = body.replace(exists, value);
    else body = `${body},${value}`;
    added += 1;
    console.log(`  ✓ ${src.id} — ${CLUBS[src.id]} (${(webp.length / 1024).toFixed(1)} KB)`);
  }

  if (added === 0) {
    console.log('Nimic de injectat (pune pozele în assets/coach-photos/<clubId>.jpg).');
    return 0;
  }

  html = html.slice(0, bounds.open) + body + html.slice(bounds.close);
  fs.writeFileSync(HTML, html);
  console.log(
    `Bundle: ${(Buffer.byteLength(html, 'utf8') / 1048576).toFixed(2)} MB (poze: ${(total / 1024).toFixed(1)} KB)`
  );
  return 0;
}

process.exit(main());
