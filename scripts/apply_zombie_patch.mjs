import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'index.original.html');
const outputPath = path.join(root, 'index.html');

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Missing source file: ${sourcePath}`);
}

let html = fs.readFileSync(sourcePath, 'utf8');
html = html
  .replaceAll('OPERATION IRONHOLD — Warehouse District', 'LAST LIGHT — Zombie District')
  .replaceAll('Warehouse District', 'Zombie District')
  .replaceAll('IRONHOLD // SECTOR 7', 'LAST LIGHT // ZOMBIE DISTRICT')
  .replaceAll('CONTAINER YARD 04', 'DOWNTOWN BLOCK 04')
  .replaceAll('GRID 118-042', 'EVAC ROUTE 04')
  .replaceAll('10 HOSTILES · 03:00 ON THE CLOCK', 'WAVE 01 · 10 INFECTED · 03:00')
  .replaceAll('CLASSIFIED // TASK FORCE IRONHOLD', 'OUTBREAK RESPONSE // LAST LIGHT')
  .replaceAll('<div class="title">WAREHOUSE<br>DISTRICT<small>SECTOR 7 — HOSTILE</small>', '<div class="title">ZOMBIE<br>DISTRICT<small>DOWNTOWN BLOCK — INFECTED</small>')
  .replaceAll('CLASSIFIED // TASK FORCE IRONHOLD WAREHOUSE', 'OUTBREAK RESPONSE // LAST LIGHT')
  .replaceAll('ELIMINATE ALL 10 HOSTILES BEFORE THE CLOCK RUNS OUT', 'CLEAR THE BLOCK BEFORE THE CLOCK RUNS OUT');

const style = `
<style id="lastLightStyle">
  #zombieBadge{position:absolute;left:50%;top:16px;transform:translateX(-50%);z-index:8;padding:7px 14px;border:1px solid rgba(255,93,72,.42);background:rgba(11,16,14,.78);color:#ffb36b;font:600 11px/1.1 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.18em;text-transform:uppercase;box-shadow:0 0 24px rgba(255,71,39,.12);pointer-events:none;}
  #startScreen:after{content:'ZOMBIE DISTRICT // THREE.JS SURVIVAL PROTOTYPE';position:absolute;left:clamp(28px,7vw,110px);bottom:22px;color:rgba(255,179,106,.74);font:10px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.16em;}
</style>`;
const script = '<script src="./zombie-mode.js"></script>';

if (!html.includes('id="lastLightStyle"')) html = html.replace('</head>', `${style}\n</head>`);
if (!html.includes('zombie-mode.js')) html = html.replace('</body>', `${script}\n</body>`);
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Patched ${outputPath} from ${sourcePath}`);
