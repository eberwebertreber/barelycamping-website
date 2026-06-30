/* ════════════════════════════════════════════════════════════
   THE CAMPSITE — a top-down pixel world for BarelyCamping.
   GBA/Pokemon-style (240x160 internal res, scaled up crisp).
   Layout traced from Luke's marked aerial of the sandy point on
   the river: a grassy/sandy point fenced in by water, the tent +
   blanket(sleeping bags) + campfire up by the water, a patch of
   trees with the Pokemon-card tent tied to one, and the long
   sandbar out in the river you can wade to.
   Characters: Luke (you) and Teebo. Art is hand-drawn in code;
   crew sprites get re-skinned from real photos later.
   ════════════════════════════════════════════════════════════ */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const TILE = 16;
const VIEW_W = canvas.width;
const VIEW_H = canvas.height;
const MAP_W = 34;          // 30 painted + 4 river cols on the right
const MAP_H = 27;          // 20 painted + 7 rows of beach/water below (room to fish + pan)
const PX_W = MAP_W * TILE;
const PX_H = MAP_H * TILE;

function hash(n) { return (Math.sin(n * 127.1) * 43758.5) % 1; }
function rnd(a, b) { return Math.abs(hash(a * 12.9898 + b * 78.233)); }
function inEllipse(x, y, cx, cy, rx, ry) { const dx = (x-cx)/rx, dy = (y-cy)/ry; return dx*dx + dy*dy <= 1; }

/* ─── Terrain ──────────────────────────────────────────────
   The point bulges toward the lower-center; river wraps the
   bottom and right. A sandbar sits out in the river.
   Codes: g grass  , tuft  * daisy  s sand  T tree
          w shallow water(walk)  W deep water(solid)            */
// Shape traced from Luke's marked aerial: the playable FIELD is a teardrop
// (camp at the upper-right tip, field trailing down to the lower-left),
// mainland WOODS fill the NW, the river wraps the SE, with a long sand bar in it.
const FIELD = [[18,2],[26,7],[24,13],[23,15],[3,17],[10,7],[14,4]];
const RIVER = [[19,0],[30,0],[30,20],[3,20],[3,17],[23,15],[24,13],[26,7],[19,1]];
function pip(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length-1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > py) !== (yj > py)) && (px < (xj-xi)*(py-yi)/(yj-yi) + xi)) inside = !inside;
  }
  return inside;
}
const ISLAND = { x:14, y:17, rx:7, ry:1.1 };           // moved down one
const island = (tx, ty) => inEllipse(tx, ty, ISLAND.x, ISLAND.y, ISLAND.rx, ISLAND.ry);
const TREES2 = new Set(['12,11', '10,11']);                       // tree under the card-tent + one to its left
const BUSHES = new Set(['11,11','13,11','9,11','11,12','10,12','13,10']);
function genTile(tx, ty) {
  const px = tx + 0.5, py = ty + 0.5;
  if (island(tx, ty)) {                                           // sand bar: a 1-tile stream + a couple grass patches
    if (tx === 16) return 'w';                                    // stream cutting the bar
    if (inEllipse(tx, ty, 11, 17, 1.3, 0.7)) return 'g';
    if (inEllipse(tx, ty, 20, 17, 1.1, 0.7)) return 'g';
    if ((tx === 13 && ty === 17) || (tx === 22 && ty === 17)) return 'b';
    return 's';
  }
  if (pip(px, py, RIVER)) {                                       // river: shallow at its edges
    const wet = (dx, dy) => pip(px+dx, py+dy, RIVER) && !island(tx+dx, ty+dy);
    return (wet(1,0) && wet(-1,0) && wet(0,1) && wet(0,-1)) ? 'W' : 'w';
  }
  if (!pip(px, py, FIELD)) return rnd(tx, ty) > 0.14 ? 'T' : 'g'; // mainland woods (NW)
  if (TREES2.has(tx + ',' + ty)) return 'T';
  if (BUSHES.has(tx + ',' + ty)) return 'b';
  const h = rnd(tx, ty);
  if (inEllipse(tx, ty, 9, 10, 5, 4) || inEllipse(tx, ty, 18, 6, 5.5, 3.5)) {  // worn, walked-on ground
    if (h > 0.93) return 'b';                                                   // more bushes
    if (h > 0.86) return 'd';                                                   // worn dirt
    if (h > 0.42) return ',';                                                   // heavier grass
    return 'g';
  }
  if (h > 0.92) return '*';
  if (h > 0.76) return ',';
  return 'g';
}
const MAPG = [
  "gTgTTTTTTTTTTgTgTTgWWWWWWWWWWWWWWW","TTTTTTTTTTTTTgTTTTTgWWWWWWWWWWWWWW",
  "TTTgTTTTTgTTTgTTTgGTgWWWWWWWWWWWWW","TTTTTTTTTgTTTgTg,gG,ggWWWWWWWWWWWW",
  "TTggTTTTTTTTgg,g,g,g,,gWWWWWWWWWWW","TgTgTTTTTTgTg,,,ggg,g,ggwWWWWWWWWW",
  "TTTTTTgTTTT,g,gg,g,gg,,gTwWWWWWWWW","TTTTTTTTTTg,GGGg,,,,gg,gGgwWWWWWWW",
  "TTgTTgTgTgGGGGGgb,g,gsgdgwwWWWWWWW","TTTTTgTTggGgbgGGgg,gssdggwwwWWWWWW",
  "gTTTTTTTggG*,b,GGgggssgggwwwWWWWWW","TTTTgTT,GbTbTbGG,,,ggs,gwwwwWWWWWW",
  "TTTTTTg,,gbbg,G*gg*,,ssGwwwwWWWWWW","TTT*g,b,GG,*GGg,Gg,ggssggwwWWWWWWW",
  "TTTTGG*GGGgGG,,ggggsssgggwwWWWWWWW","gggGGG*GGGGGgwwwwwwwwwwwwwWWWWWWWW",
  "sssggwwwwwwwwwwwwwwwsssswwWWWWWWWW","wssswwwwwwwsssssGGGsssssswWWWWWWWW",
  "wwwwwwssssssss**GG*GssssswWWWWWWWW","wsssssssssssssssssssssswwwWWWWWWWW",
  "wwwssssssssssssssssssssssWWWWWWWWW","WWwwwwwwwwwwwwwwwwwwwwwwwWWWWWWWWW",
  "WWWwwwwwwwwwwwwwwWWWWWWWWWWWWWWWWW","WWWWwwwwwwwwwwWWWWWWWWWWWWWWWWWWWW",
  "WWWWWwwwwwwWWWWWWWWWWWWWWWWWWWWWWW","WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
];
// Bottom of the map transcribed from Luke's painted screenshot: a sand apron at
// the grass edge, a light-blue stream across, a sand bar with a grass island,
// a water pool on the lower-left, the river on the right.
function paintBottom() {
  const B = (tx, ty) => {
    if (tx <= 2)  return ty <= 14 ? 'T' : 'W';                 // left woods, then water
    if (tx >= 26) return 'W';                                  // deep river (right)
    if (tx === 25) return 'w';
    if (ty === 13) return (tx >= 22 && tx <= 24) ? 's' : null; // null = keep the grass field
    if (ty === 14) return (tx >= 15 && tx <= 24) ? 's' : null; // sand apron
    if (ty === 15 || ty === 16) return 'w';                    // light stream straight across
    if (ty === 17) return (tx >= 3 && tx <= 5) ? 'W' : (tx >= 12 && tx <= 15) ? 'g' : 's'; // pool · island · bar
    if (ty === 18) return (tx >= 3 && tx <= 5) ? 'W' : 's';
    if (ty === 19) return 's';
    return null;
  };
  for (let ty = 13; ty < MAP_H; ty++) {
    let nr = '';
    for (let tx = 0; tx < MAP_W; tx++) { const c = B(tx, ty); nr += (c === null ? MAPG[ty][tx] : c); }
    MAPG[ty] = nr;
  }
}
function regenMap() { for (let y = 0; y < MAP_H; y++) { let r = ''; for (let x = 0; x < MAP_W; x++) r += genTile(x, y); MAPG[y] = r; } paintBottom(); }
// map is baked from Luke's editor export above — regenMap() is no longer called.
const overrides = {};                                   // hand-painted tiles from the in-game brush
try { const s = localStorage.getItem('bc_paint'); if (s) Object.assign(overrides, JSON.parse(s)); } catch (_) {}
function tileAt(tx, ty) { if (tx<0||ty<0||tx>=MAP_W||ty>=MAP_H) return 'W'; const k = tx+'_'+ty; return (k in overrides) ? overrides[k] : MAPG[ty][tx]; }
const isWater = c => c === 'w' || c === 'W';
const SOLID_TILE = new Set(['T', 'O']);   // deep water is swimmable now, not solid
function solidAtPx(px, py) {
  if (SOLID_TILE.has(tileAt(Math.floor(px/TILE), Math.floor(py/TILE)))) return true;
  for (const p of props) { if (!p.solid) continue;
    if (px>=p.box[0] && px<=p.box[0]+p.box[2] && py>=p.box[1] && py<=p.box[1]+p.box[3]) return true; }
  return false;
}

/* ─── Palettes ─────────────────────────────────────────────── */
const OL = '#20201c';
const PALETTES = {
  // Luke: dark slate long-sleeve, black shorts, brown hair
  luke:  { hair:'#3a2716', skin:'#e9b489', shirt:'#3d4654', shirtD:'#2b3340', pants:'#1f1f24', pantsD:'#141418', shoe:'#2a2a2a' },
  // Teebo: tan/khaki long-sleeve, grey-blue shorts, reddish-brown hair
  teebo: { hair:'#6b4524', skin:'#eebf97', shirt:'#cdbf9a', shirtD:'#b1a37c', pants:'#5b6b82', pantsD:'#44505f', shoe:'#caa56e' },
};
const CHARIZARD = { hair:'#e07b2a', skin:'#f0c08a', shirt:'#e8862f', shirtD:'#c46a1f', pants:'#e8862f', pantsD:'#c46a1f', shoe:'#c46a1f' };

/* ─── Tile painters ────────────────────────────────────────── */
function dither(x, y, tx, ty, base, dark) {
  ctx.fillStyle = base; ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = dark;
  for (let j = 0; j < TILE; j += 4) for (let i = 0; i < TILE; i += 4)
    if (((i + j) >> 2) % 2 === 0) ctx.fillRect(x + i, y + j, 2, 2);
}
function drawGrass(x, y, tx, ty, v) {
  dither(x, y, tx, ty, '#5aa83f', '#52a03a');
  ctx.fillStyle = '#3f8a30';
  for (let i = 0; i < 4; i++) {                       // little blades
    const px = x + Math.floor(rnd(tx*9+i, ty) * 13), py = y + Math.floor(rnd(tx, ty*7+i) * 12);
    ctx.fillRect(px, py + 1, 1, 2); ctx.fillRect(px + 1, py, 1, 2);
  }
  if (v === ',') { ctx.fillStyle = '#357a2a';
    ctx.fillRect(x+6,y+8,2,4); ctx.fillRect(x+8,y+6,2,6); ctx.fillRect(x+4,y+9,2,3); ctx.fillRect(x+10,y+9,2,3); }
  if (v === '*') {                                    // white wildflowers
    ctx.fillStyle = '#fff'; ctx.fillRect(x+6,y+6,2,2); ctx.fillRect(x+9,y+7,2,2); ctx.fillRect(x+7,y+4,2,2); ctx.fillRect(x+7,y+9,2,2);
    ctx.fillStyle = '#f6d23a'; ctx.fillRect(x+7,y+7,2,2);
    ctx.fillStyle = '#fff'; ctx.fillRect(x+2,y+10,2,2); ctx.fillRect(x+12,y+3,2,2);   // a couple extra blooms
    ctx.fillStyle = '#f6d23a'; ctx.fillRect(x+2,y+11,1,1); ctx.fillRect(x+12,y+4,1,1); }
  if (v === 'G') {                                    // tall grass
    ctx.fillStyle = '#357a2a';
    for (let i = 0; i < 6; i++) { const bx = x + 1 + i*2, hh = 5 + Math.floor(rnd(tx*3+i, ty)*4); ctx.fillRect(bx, y+TILE-hh-1, 1, hh); }
    ctx.fillStyle = '#46a84e';
    for (let i = 0; i < 6; i += 2) { const bx = x + 2 + i*2, hh = 4 + Math.floor(rnd(ty+i, tx)*3); ctx.fillRect(bx, y+TILE-hh-1, 1, hh); } }
}
function drawSand(x, y, tx, ty) {                       // smooth pale sand (reads as sand, not gravel)
  dither(x, y, tx, ty, '#e9d8ab', '#e2cf9c');
  ctx.fillStyle = '#d6c38c';
  for (let i = 0; i < 3; i++) {
    const h = rnd(tx*3+i, ty*5);
    ctx.fillRect(x + Math.floor(h*13), y + Math.floor(rnd(tx, ty+i)*13), 2, 1);
  }
}
function drawRock(x, y, tx, ty) {                       // flat rocky ground (grey)
  dither(x, y, tx, ty, '#9a988c', '#8e8c80');
  ctx.fillStyle = '#7d7b6f';
  for (let i = 0; i < 5; i++) { const h = rnd(tx*4+i, ty*3);
    ctx.fillRect(x + Math.floor(h*13), y + Math.floor(rnd(tx, ty*2+i)*13), 3, 2); }
  ctx.fillStyle = '#b1afa1'; ctx.fillRect(x+3, y+3, 3, 2);
}
function drawBoulder(x, y, tx, ty) {                    // raised rock (solid)
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x+8, y+13, 7, 2.2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = OL; ctx.beginPath(); ctx.ellipse(x+8, y+8, 7, 6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#9b998d'; ctx.beginPath(); ctx.ellipse(x+8, y+8, 6, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#7d7b6f'; ctx.fillRect(x+4, y+10, 9, 2);
  ctx.fillStyle = '#b6b4a6'; ctx.beginPath(); ctx.ellipse(x+6, y+6, 2.6, 2, 0, 0, 7); ctx.fill();
}
function drawBush(x, y) {                               // leafy round bush (outlined)
  ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.ellipse(x+8, y+13, 6, 2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = OL; ctx.beginPath(); ctx.ellipse(x+8, y+9, 7, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2c7a33'; ctx.beginPath(); ctx.ellipse(x+8, y+9, 6, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#3f9a44'; for (const [cx, cy] of [[5,8],[11,8],[8,7]]) { ctx.beginPath(); ctx.ellipse(x+cx, y+cy, 2.4, 2.2, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#5cb85f'; ctx.fillRect(x+6, y+7, 2, 2);
}
let waterPhase = 0;
function drawWater(x, y, deep, tx, ty) {
  if (deep) { dither(x, y, tx, ty, '#3777bd', '#316cad'); ctx.fillStyle = '#4d8bcf'; }
  else { dither(x, y, tx, ty, '#5fa8d6', '#69b0db');
    ctx.fillStyle = '#b6b09a';                          // pebbles through clear water
    for (let i = 0; i < 4; i++) ctx.fillRect(x + Math.floor(rnd(tx*7+i,ty)*12), y + Math.floor(rnd(tx,ty*5+i)*12), 2, 2);
    ctx.fillStyle = '#8fcfe8'; }
  const off = Math.floor(Math.sin((x*0.5 + waterPhase) * 0.5) * 2);
  ctx.fillRect(x+2, y+4+off, 5, 1); ctx.fillRect(x+9, y+10-off, 4, 1);
  // foam edge against land neighbours
  ctx.fillStyle = '#dff1f6';
  if (!isWater(tileAt(tx, ty-1))) ctx.fillRect(x, y, TILE, 2);
  if (!isWater(tileAt(tx, ty+1))) ctx.fillRect(x, y+TILE-2, TILE, 2);
  if (!isWater(tileAt(tx-1, ty))) ctx.fillRect(x, y, 2, TILE);
  if (!isWater(tileAt(tx+1, ty))) ctx.fillRect(x+TILE-2, y, 2, TILE);
}
function drawTree(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.20)'; ctx.beginPath(); ctx.ellipse(x+8, y+15, 7, 2.4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = OL; ctx.fillRect(x+6, y+9, 5, 7);                       // trunk outline
  ctx.fillStyle = '#6a4526'; ctx.fillRect(x+7, y+9, 3, 6);
  // canopy: outline blob then layered greens + clumps
  ctx.fillStyle = OL;
  ctx.beginPath(); ctx.ellipse(x+8, y+2, 9, 8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#256d2c'; ctx.beginPath(); ctx.ellipse(x+8, y+2, 8, 7, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2f8a38';
  for (const [cx, cy, r] of [[5,1,3],[11,2,3],[8,-2,3],[8,4,4]]) { ctx.beginPath(); ctx.ellipse(x+cx, y+cy, r, r, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#46a84e'; ctx.beginPath(); ctx.ellipse(x+6, y, 2.5, 2.5, 0, 0, 7); ctx.fill();
}

/* ─── Prop painters ───────────────────────────────────────── */
let shelterRot = 0;                                     // 0/1/2/3 — press R in the editor to rotate 90° at a time
function logoPikachu(cx, yp) {
  cx = Math.round(cx); yp = Math.round(yp);
  ctx.fillStyle = '#f5d21f'; ctx.fillRect(cx-3, yp, 6, 4);
  ctx.fillStyle = OL; ctx.fillRect(cx-4, yp-2, 1, 3); ctx.fillRect(cx+3, yp-2, 1, 3);
  ctx.fillStyle = '#f5d21f'; ctx.fillRect(cx-4, yp-1, 1, 2); ctx.fillRect(cx+3, yp-1, 1, 2);
  ctx.fillStyle = OL; ctx.fillRect(cx-2, yp+1, 1, 1); ctx.fillRect(cx+1, yp+1, 1, 1);
  ctx.fillStyle = '#e2443a'; ctx.fillRect(cx-3, yp+2, 1, 1); ctx.fillRect(cx+2, yp+2, 1, 1);
}
function tentRect(x, y, w, h, horiz) {                  // top-down ridge tent (straight edges) with the logo
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x+2, y+h-1, w-4, 3);
  ctx.fillStyle = OL; ctx.fillRect(x, y, w, h);
  if (!horiz) { const m = w>>1;
    ctx.fillStyle = '#e8e8e3'; ctx.fillRect(x+1, y+1, m-1, h-2);
    ctx.fillStyle = '#c2c2bb'; ctx.fillRect(x+m+1, y+1, w-m-2, h-2);
    ctx.fillStyle = '#f6f6f1'; ctx.fillRect(x+m-1, y+1, 2, h-2);
    logoPikachu(x+w/2, y+h-6);
  } else { const m = h>>1;
    ctx.fillStyle = '#e8e8e3'; ctx.fillRect(x+1, y+1, w-2, m-1);
    ctx.fillStyle = '#c2c2bb'; ctx.fillRect(x+1, y+m+1, w-2, h-m-2);
    ctx.fillStyle = '#f6f6f1'; ctx.fillRect(x+1, y+m-1, w-2, 2);
    logoPikachu(x+w-6, y+h/2);
  }
}
function bag(x, y, w, h, head, body, headc) {           // one sleeping bag, rolled head on one end
  ctx.fillStyle = OL; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = body; ctx.fillRect(x+1, y+1, w-2, h-2);
  ctx.fillStyle = headc;
  if (head === 'top') ctx.fillRect(x+1, y+1, w-2, 4);
  else if (head === 'bottom') ctx.fillRect(x+1, y+h-5, w-2, 4);
  else if (head === 'left') ctx.fillRect(x+1, y+1, 4, h-2);
  else ctx.fillRect(x+w-5, y+1, 4, h-2);                // right
}
function drawMatBags(mx, my, mw, mh, horizBags, head) {
  ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(mx+1, my+mh-1, mw, 3);
  ctx.fillStyle = OL; ctx.fillRect(mx-1, my-1, mw+2, mh+2);
  ctx.fillStyle = '#3c6f38'; ctx.fillRect(mx, my, mw, mh);
  if (!horizBags) {
    bag(mx+2, my+2, (mw>>1)-2, mh-4, head, '#3a5fb2', '#5c80d0');
    bag(mx+(mw>>1)+1, my+2, (mw>>1)-3, mh-4, head, '#27478e', '#3d62b6');
  } else {
    bag(mx+2, my+2, mw-4, (mh>>1)-2, head, '#3a5fb2', '#5c80d0');
    bag(mx+2, my+(mh>>1)+1, mw-4, (mh>>1)-3, head, '#27478e', '#3d62b6');
  }
}
function drawShelter(x, y) {                            // green mat + 2 blue bags + tent over the heads (half length)
  const r = shelterRot;
  if (r === 0) { drawMatBags(x, y+9, 24, 19, false, 'top');    tentRect(x, y, 24, 14, false); }
  else if (r === 2) { drawMatBags(x, y, 24, 19, false, 'bottom'); tentRect(x, y+14, 24, 14, false); }
  else if (r === 1) { drawMatBags(x+9, y, 19, 24, true, 'left'); tentRect(x, y, 14, 24, true); }
  else { drawMatBags(x, y, 19, 24, true, 'right'); tentRect(x+14, y, 14, 24, true); }
}
function drawCardTent(x, y, treeX, treeY) {             // little tent of Pokemon cards — a rectangle pyramid
  ctx.strokeStyle = 'rgba(40,30,20,0.6)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x+11, y+1); ctx.lineTo(treeX, treeY); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x+2, y+16, 20, 2);
  // outline + two shaded faces meeting at a peak (pyramid)
  ctx.fillStyle = OL; ctx.beginPath(); ctx.moveTo(x+11, y); ctx.lineTo(x+1, y+16); ctx.lineTo(x+22, y+16); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a64c8'; ctx.beginPath(); ctx.moveTo(x+11, y+1); ctx.lineTo(x+3, y+15); ctx.lineTo(x+11, y+15); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#27479c'; ctx.beginPath(); ctx.moveTo(x+11, y+1); ctx.lineTo(x+20, y+15); ctx.lineTo(x+11, y+15); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#cdd8ff'; ctx.fillRect(x+10, y+2, 2, 13);              // ridge
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x+6, y+9, 1, 6); ctx.fillRect(x+15, y+9, 1, 6); // card seams
  ctx.fillStyle = OL; ctx.fillRect(x+9, y+11, 4, 5);                      // dark doorway
}
function drawBlanket(x, y) {                             // blanket + two sleeping bags
  ctx.fillStyle = OL; ctx.fillRect(x-1, y-1, 26, 16);
  ctx.fillStyle = '#9a5b4a'; ctx.fillRect(x, y, 24, 14);
  ctx.fillStyle = '#b06f5a'; for (let i=0;i<24;i+=4) ctx.fillRect(x+i, y, 2, 14);
  ctx.fillStyle = '#c9b18a'; ctx.fillRect(x+2, y+2, 9, 10);              // bag 1
  ctx.fillStyle = '#3a5fa8'; ctx.fillRect(x+13, y+2, 9, 10);            // bag 2
  ctx.fillStyle = '#fff8'; ctx.fillRect(x+3, y+3, 4, 2); ctx.fillRect(x+14, y+3, 4, 2);
}
function drawBlanketV(x, y) {                            // green mat + two blue sleeping bags (heads tuck under the tent)
  const w = 26, h = 38;
  ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x+1, y+h-1, w, 3);
  ctx.fillStyle = OL; ctx.fillRect(x-1, y-1, w+2, h+2);
  ctx.fillStyle = '#3c6f38'; ctx.fillRect(x, y, w, h);                   // mat — a distinct green, outlined
  ctx.fillStyle = '#34632f'; for (let i=4;i<h;i+=6) ctx.fillRect(x, y+i, w, 1);
  ctx.fillStyle = OL; ctx.fillRect(x+2, y+2, 11, h-5); ctx.fillRect(x+13, y+2, 11, h-5);
  ctx.fillStyle = '#3a5fb2'; ctx.fillRect(x+3, y+3, 9, h-7);            // bag 1 (blue)
  ctx.fillStyle = '#27478e'; ctx.fillRect(x+14, y+3, 9, h-7);          // bag 2 (navy)
  ctx.fillStyle = '#5c80d0'; ctx.fillRect(x+3, y+3, 9, 5);             // rolled head 1
  ctx.fillStyle = '#3d62b6'; ctx.fillRect(x+14, y+3, 9, 5);           // rolled head 2
}
function drawDirt(x, y, tx, ty) {                       // worn-down grass (grass with bare patches showing through)
  drawGrass(x, y, tx, ty, '.');                        // grass base, so it blends with the field
  for (let i = 0; i < 8; i++) {
    const h = rnd(tx*5+i, ty*3+i);
    if (h > 0.4) {                                     // scattered worn/bare spots, soft and irregular
      ctx.fillStyle = h > 0.72 ? '#7e6a44' : '#8c7c52';
      const w = h > 0.86 ? 3 : 2;
      ctx.fillRect(x + Math.floor(rnd(h, i)*13), y + Math.floor(rnd(i, h)*13), w, 2);
    }
  }
}
function drawTote(x, y) {                                // black tote, tan cooler bag, yellow lid
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x+1, y+13, 16, 2);
  ctx.fillStyle = OL; ctx.fillRect(x, y+5, 18, 9);
  ctx.fillStyle = '#2a2a30'; ctx.fillRect(x+1, y+6, 16, 7);
  ctx.fillStyle = '#45454f'; ctx.fillRect(x+1, y+6, 16, 1);
  ctx.fillStyle = '#cdbf95'; ctx.fillRect(x+2, y+1, 12, 5);            // tan cooler bag
  ctx.fillStyle = OL; ctx.fillRect(x+2, y+1, 12, 1);
  ctx.fillStyle = '#e6b62e'; ctx.fillRect(x+9, y, 7, 4);              // yellow lid
  ctx.fillStyle = OL; ctx.fillRect(x+9, y, 7, 1);
}
function drawShoes(x, y) {                               // crocs + sneakers by the mat
  ctx.fillStyle = '#2f7d52'; ctx.fillRect(x, y+2, 5, 3); ctx.fillRect(x+1, y+1, 3, 2);
  ctx.fillStyle = '#1f6342'; ctx.fillRect(x+6, y+2, 5, 3); ctx.fillRect(x+7, y+1, 3, 2);
  ctx.fillStyle = '#6a6a6a'; ctx.fillRect(x+1, y+6, 5, 2); ctx.fillRect(x+7, y+6, 5, 2);
  ctx.fillStyle = OL; ctx.fillRect(x, y+8, 12, 1);
}
function drawFire(x, y, t, lit) {
  // ring of stones
  ctx.fillStyle = OL; ctx.beginPath(); ctx.ellipse(x+8, y+10, 8, 4.5, 0, 0, 7); ctx.fill();
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283;
    ctx.fillStyle = i % 2 ? '#a7a79c' : '#8b8b80';
    ctx.fillRect(Math.round(x+8 + Math.cos(a)*6.5 - 1.5), Math.round(y+10 + Math.sin(a)*3.5 - 1.5), 3, 3); }
  // charred logs inside
  ctx.fillStyle = '#3a2a1c'; ctx.fillRect(x+4, y+9, 8, 2); ctx.fillRect(x+6, y+8, 5, 3);
  if (!lit) {                                            // put out — just a wisp of smoke
    ctx.fillStyle = 'rgba(180,180,180,0.22)';
    for (let i = 0; i < 3; i++) { const s = (t*0.5 + i*5) % 15; ctx.fillRect(Math.round(x+7 + Math.sin(s*0.3)*2), Math.round(y+6 - s), 2, 2); }
    return;
  }
  // flame — gentle, slow flicker (no fast pulse, no constant glow)
  ctx.save(); ctx.translate(x+8, y+10);
  const f = Math.sin(t*0.09) * 0.8 + Math.sin(t*0.05) * 0.5;
  ctx.fillStyle = '#f5631c'; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.quadraticCurveTo(0, -7-f, 3, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f9a72a'; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.quadraticCurveTo(0, -4.5-f, 2, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffe24a'; ctx.fillRect(-1, -3-f*0.3, 2, 3);
  ctx.restore();
  ctx.fillStyle = '#ffce5a'; ctx.fillRect(x+8, y+2 - (t*0.3 % 9), 1, 1);   // a slow ember (glow handled at night only)
}
function drawTable(x, y) {                               // low table, yellow top, stainless mugs
  ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x+1, y+9, 16, 2);
  ctx.fillStyle = '#3a3a3a'; ctx.fillRect(x+2, y+7, 1, 4); ctx.fillRect(x+15, y+7, 1, 4);   // legs
  ctx.fillStyle = OL; ctx.fillRect(x, y+4, 18, 5);
  ctx.fillStyle = '#e6c84a'; ctx.fillRect(x+1, y+5, 16, 3);                                  // yellow top
  for (const mx of [3, 8, 12]) { ctx.fillStyle = OL; ctx.fillRect(x+mx, y+1, 4, 5);          // mugs
    ctx.fillStyle = '#c8ccce'; ctx.fillRect(x+mx+1, y+2, 2, 4); ctx.fillStyle = '#e6e8ea'; ctx.fillRect(x+mx+1, y+2, 2, 1); }
}
function drawStool(x, y, leg) {                          // little X-frame folding stool, colored legs + dark seat
  ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x+1, y+8, 7, 2);
  ctx.fillStyle = leg; ctx.fillRect(x+1, y+4, 1, 5); ctx.fillRect(x+7, y+4, 1, 5); ctx.fillRect(x+3, y+4, 1, 5); ctx.fillRect(x+5, y+4, 1, 5);
  ctx.fillStyle = OL; ctx.fillRect(x, y+1, 9, 3); ctx.fillStyle = '#2a2a2e'; ctx.fillRect(x+1, y+2, 7, 1);
}
function drawMilkweed(x, y) {                            // tall milkweed stalk with seed pods + a puff
  ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(x+5, y+15, 6, 2);
  ctx.fillStyle = '#4a7a3a'; ctx.fillRect(x+7, y+4, 2, 12);                 // stalk
  ctx.fillStyle = '#5f9a48'; ctx.fillRect(x+2, y+7, 5, 2); ctx.fillRect(x+9, y+9, 5, 2);  // broad leaves
  ctx.fillStyle = '#3f6a32'; ctx.fillRect(x+2, y+7, 5, 1); ctx.fillRect(x+9, y+9, 5, 1);
  ctx.fillStyle = '#9a8c6a'; ctx.fillRect(x+5, y+2, 4, 4);                  // seed pod
  ctx.fillStyle = OL; ctx.fillRect(x+5, y+2, 4, 1);
  ctx.fillStyle = 'rgba(245,245,235,0.85)'; ctx.fillRect(x+10, y, 3, 3);    // a floating puff
  ctx.fillStyle = 'rgba(245,245,235,0.5)'; ctx.fillRect(x+12, y+3, 2, 2);
}
function drawStump(x, y) {                               // big dead stump with roots flaring out
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x+10, y+16, 11, 3, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = OL; ctx.fillRect(x+2, y+2, 16, 13);                       // trunk outline
  ctx.fillStyle = '#6a4c30'; ctx.fillRect(x+3, y+3, 14, 11);               // bark
  ctx.fillStyle = '#5a3f28'; ctx.fillRect(x+3, y+3, 14, 2);
  ctx.fillStyle = '#7c5c3a'; ctx.fillRect(x+5, y+6, 2, 7); ctx.fillRect(x+9, y+5, 2, 8); ctx.fillRect(x+13, y+6, 2, 7); // bark grain
  // roots flaring at the base
  ctx.fillStyle = OL; ctx.fillRect(x, y+13, 4, 3); ctx.fillRect(x+16, y+13, 4, 3); ctx.fillRect(x+7, y+14, 6, 3);
  ctx.fillStyle = '#5a3f28'; ctx.fillRect(x, y+13, 3, 2); ctx.fillRect(x+17, y+13, 3, 2); ctx.fillRect(x+8, y+14, 4, 2);
  // hollow top (cut, dead)
  ctx.fillStyle = '#3a2a1c'; ctx.fillRect(x+5, y+3, 9, 3); ctx.fillStyle = '#8a6a44'; ctx.fillRect(x+6, y+4, 7, 1);
}
function drawDrift(x, y) {                               // bleached driftwood log with a branch
  ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x+1, y+7, 22, 2);
  ctx.fillStyle = OL; ctx.fillRect(x, y+2, 24, 6);
  ctx.fillStyle = '#cbbfa6'; ctx.fillRect(x+1, y+3, 22, 4);                // bleached grey-tan wood
  ctx.fillStyle = '#b3a787'; ctx.fillRect(x+1, y+5, 22, 1);
  ctx.fillStyle = '#9a8e70'; for (let i=2;i<22;i+=5) ctx.fillRect(x+i, y+3, 1, 4);  // cracks
  ctx.fillStyle = OL; ctx.fillRect(x+18, y-2, 3, 5);                       // jutting broken branch
  ctx.fillStyle = '#cbbfa6'; ctx.fillRect(x+19, y-1, 1, 4);
}
function drawChair(x, y, opt) {                          // tall Helinox-style chair (headrest + frame legs)
  const fr = opt.frame, fab = opt.fabric;
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x+2, y+19, 12, 2);
  ctx.fillStyle = fr;                                   // splayed frame legs
  ctx.fillRect(x+1, y+13, 2, 7); ctx.fillRect(x+13, y+13, 2, 7);
  ctx.fillRect(x+5, y+13, 2, 6); ctx.fillRect(x+9, y+13, 2, 6);
  ctx.fillStyle = OL; ctx.fillRect(x+1, y+19, 2, 1); ctx.fillRect(x+13, y+19, 2, 1);
  ctx.fillStyle = fr; ctx.fillRect(x+1, y-3, 14, 17);   // frame piping around the fabric
  ctx.fillStyle = fab; ctx.fillRect(x+2, y-2, 12, 15);  // tall fabric back + seat
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x+2, y+1, 12, 1);   // headrest seam
  if (opt.tie) {                                        // tie-dye swirl
    ctx.fillStyle = '#6c6c78'; ctx.fillRect(x+5, y+2, 5, 6);
    ctx.fillStyle = '#8a8a96'; ctx.fillRect(x+6, y+4, 3, 2); ctx.fillRect(x+4, y+9, 2, 2);
    ctx.fillStyle = '#4c4c54'; ctx.fillRect(x+9, y-1, 2, 4); ctx.fillRect(x+3, y+6, 2, 2);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(x+3, y, 8, 1); // subtle Helinox label strip
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x+2, y+8, 2, 5); ctx.fillRect(x+12, y+8, 2, 5); // mesh sides
}
function drawCrocs(x, y) {                               // a pair of black crocs
  ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x+1, y+6, 12, 2);
  for (const ox of [0, 7]) {
    ctx.fillStyle = OL; ctx.fillRect(x+ox, y+1, 6, 5);
    ctx.fillStyle = '#2a2a2e'; ctx.fillRect(x+ox+1, y+2, 4, 3); ctx.fillRect(x+ox+1, y+1, 3, 1);
    ctx.fillStyle = '#454550'; ctx.fillRect(x+ox+1, y+2, 4, 1);    // strap highlight
  }
}
function nudgeCans(px, py) {                             // push cans away when a character walks into the pile
  if (canSfxCd > 0) canSfxCd--;
  for (const it of CANS.items) {
    const cx = CANS.x + it.bx + it.ox, cy = CANS.y + it.by + it.oy;
    const dx = cx - px, dy = cy - py, d2 = dx*dx + dy*dy;
    if (d2 < 90) { const d = Math.sqrt(d2) || 1; it.vx += dx/d*0.7; it.vy += dy/d*0.45;
      if (canSfxCd <= 0) { sfx('can'); canSfxCd = 18; } }
    it.ox += it.vx; it.oy += it.vy; it.vx *= 0.8; it.vy *= 0.8;
    it.ox = Math.max(-12, Math.min(16, it.ox)); it.oy = Math.max(-9, Math.min(9, it.oy));
  }
}
function drawCans() {                                    // empty Coors Light cans (silver + blue band), scattered
  const x = CANS.x, y = CANS.y;
  ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x, y+9, 15, 2);
  for (const it of CANS.items) {
    const cx = x + it.bx + Math.round(it.ox), cy = y + it.by + Math.round(it.oy);
    if (it.up) {
      ctx.fillStyle = OL; ctx.fillRect(cx-1, cy-1, 5, 7);
      ctx.fillStyle = '#d6dadf'; ctx.fillRect(cx, cy, 3, 5);
      ctx.fillStyle = '#5fb4e0'; ctx.fillRect(cx, cy+2, 3, 1);
      ctx.fillStyle = '#b9bcc2'; ctx.fillRect(cx, cy, 3, 1);
    } else {
      ctx.fillStyle = OL; ctx.fillRect(cx-1, cy-1, 7, 5);
      ctx.fillStyle = '#d6dadf'; ctx.fillRect(cx, cy, 5, 3);
      ctx.fillStyle = '#5fb4e0'; ctx.fillRect(cx+2, cy, 1, 3);
      ctx.fillStyle = '#b9bcc2'; ctx.fillRect(cx+4, cy, 1, 3);
    }
  }
}
function drawLog(x, y) {
  ctx.fillStyle = OL; ctx.fillRect(x-1, y+4, 18, 8);
  ctx.fillStyle = '#7c5532'; ctx.fillRect(x, y+5, 16, 6);
  ctx.fillStyle = '#5e4026'; ctx.fillRect(x, y+9, 16, 2);
  ctx.fillStyle = '#9a6e42'; for (let i=0;i<16;i+=4) ctx.fillRect(x+i, y+6, 1, 4);
  ctx.fillStyle = '#caa56e'; ctx.fillRect(x+14, y+6, 2, 4);
}

/* ─── Character renderer (outlined, clean 4-frame walk) ────── */
function box(x, y, w, h, fill) { ctx.fillStyle = OL; ctx.fillRect(x, y, w, h); ctx.fillStyle = fill; ctx.fillRect(x+1, y+1, w-2, h-2); }
function drawTrainer(sx, sy, dir, step, pal, bob) {
  const x = Math.round(sx), y = Math.round(sy) + bob;
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(x+8, y+20, 6, 2.2, 0, 0, 7); ctx.fill();
  const lLeg = dir === 2 ? x+5 : dir === 3 ? x+5 : x+4;
  const rLeg = dir === 2 ? x+8 : dir === 3 ? x+8 : x+9;
  const la = step === 1 ? -1 : 0, ra = step === 3 ? -1 : 0;   // lift a foot per stride
  box(lLeg, y+14+la, 3, 6, pal.pants); ctx.fillStyle = pal.shoe; ctx.fillRect(lLeg, y+19+la, 3, 2);
  box(rLeg, y+14+ra, 3, 6, pal.pants); ctx.fillStyle = pal.shoe; ctx.fillRect(rLeg, y+19+ra, 3, 2);
  // torso
  box(x+2, y+8, 11, 8, pal.shirt);
  ctx.fillStyle = pal.shirtD; ctx.fillRect(x+3, y+13, 9, 2);
  // arms by facing
  if (dir === 2) box(x+9, y+9, 2, 5, pal.skin);
  else if (dir === 3) box(x+3, y+9, 2, 5, pal.skin);
  else { box(x+1, y+9, 2, 5, pal.skin); box(x+11, y+9, 2, 5, pal.skin); }
  // head
  box(x+3, y+1, 9, 8, pal.skin);
  // hair
  ctx.fillStyle = pal.hair;
  ctx.fillRect(x+3, y, 9, 1);
  if (dir === 1) { ctx.fillRect(x+3, y+1, 9, 7); }            // back of head
  else { ctx.fillRect(x+3, y+1, 9, 3); ctx.fillRect(x+3, y+1, 2, 5); ctx.fillRect(x+10, y+1, 2, 5); }
  // face
  if (dir !== 1) {
    ctx.fillStyle = '#23150c';
    if (dir === 0) { ctx.fillRect(x+5, y+4, 2, 2); ctx.fillRect(x+8, y+4, 2, 2); }
    if (dir === 2) ctx.fillRect(x+4, y+4, 2, 2);
    if (dir === 3) ctx.fillRect(x+9, y+4, 2, 2);
  }
}
function drawSeated(sx, sy, pal, t) {
  const x = Math.round(sx), y = Math.round(sy), br = Math.sin(t*0.06) < 0 ? 0 : 1;
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(x+7, y+17, 6, 2, 0, 0, 7); ctx.fill();
  box(x+2, y+12, 5, 5, pal.pants); box(x+8, y+12, 5, 5, pal.pants);     // legs out front
  ctx.fillStyle = pal.shoe; ctx.fillRect(x+2, y+15, 4, 2); ctx.fillRect(x+9, y+15, 4, 2);
  box(x+2, y+6+br, 11, 8, pal.shirt);
  box(x+3, y+br, 9, 8, pal.skin);
  ctx.fillStyle = pal.hair; ctx.fillRect(x+3, y-1+br, 9, 3); ctx.fillRect(x+3, y-1+br, 2, 5); ctx.fillRect(x+10, y-1+br, 2, 5);
  ctx.fillStyle = '#23150c'; ctx.fillRect(x+5, y+3+br, 2, 2); ctx.fillRect(x+8, y+3+br, 2, 2);
}

/* ─── Camp props ──────────────────────────────────────────── */
const FIRE    = { x: 23*TILE, y: 9*TILE };              // from Luke's editor layout
const BLANKET = { x: 22*TILE, y: 6*TILE };              // shelter anchor (tent + mat + bags)
const CHAIR   = { x: 15*TILE, y: 19*TILE };             // blue chair
const CHAIR2  = { x: 17*TILE, y: 19*TILE };             // gray chair
const CARD    = { x: 12*TILE, y: 9*TILE };
const TOTE    = { x: 21*TILE, y: 7*TILE };
const SHOES   = { x: 23*TILE, y: 10*TILE };
const CROCS   = { x: 23*TILE, y: 8*TILE };              // black crocs
const CANS    = { x: 21*TILE, y: 13*TILE,               // pile of empty Coors Lights (scatter when walked through)
  items: [[2,3,1],[7,2,1],[9,6,0],[2,7,0],[11,4,1]].map(c=>({ bx:c[0], by:c[1], up:c[2], ox:0, oy:0, vx:0, vy:0 })) };
const TABLE   = { x: 22*TILE, y: 8*TILE };              // little yellow table with mugs
const STOOL_G = { x: 21*TILE, y: 8*TILE };
const STOOL_O = { x: 24*TILE, y: 9*TILE };
const STOOL_B = { x: 22*TILE, y: 10*TILE };
const STOOL_Y = { x: 20*TILE, y: 7*TILE };
const MILKWEED = { x: 9*TILE, y: 12*TILE };             // milkweed plant
const STUMP    = { x: 24*TILE, y: 14*TILE };            // big dead stump with roots
const DRIFT    = { x: 13*TILE, y: 18*TILE };            // driftwood on the bar
let fireLit = true;
const cardTent = { gone:false, blowT:0 };

const cardProp = { sortY: CARD.y+18, solid:true, box:[CARD.x+1, CARD.y+1, 22, 16],
  draw:()=> cardTent.gone ? drawCardBlow(cardTent.blowT) : drawCardTent(CARD.x, CARD.y, 12*TILE+8, 11*TILE+2) };
const shelterProp = { sortY: BLANKET.y+30, solid:true, box:[BLANKET.x-1, BLANKET.y-1, 26, 30], draw:()=>drawShelter(BLANKET.x, BLANKET.y) };
const props = [
  { sortY: FIRE.y+12,    solid:true,  box:[FIRE.x+2, FIRE.y+8, 12, 5], draw:(t)=>drawFire(FIRE.x, FIRE.y, t, fireLit) },
  shelterProp,
  cardProp,
  { sortY: CHAIR.y+12,   solid:true,  box:[CHAIR.x+2, CHAIR.y+4, 12, 8], draw:()=>drawChair(CHAIR.x, CHAIR.y, {frame:'#2fc4e6', fabric:'#181818', tie:false}) },   // cyan-leg Helinox
  { sortY: CHAIR2.y+12,  solid:true,  box:[CHAIR2.x+2, CHAIR2.y+4, 12, 8], draw:()=>drawChair(CHAIR2.x, CHAIR2.y, {frame:'#1c1c1c', fabric:'#3e3e46', tie:true}) },  // black-leg tie-dye
  { sortY: TOTE.y+14,    solid:true,  box:[TOTE.x, TOTE.y+5, 18, 9], draw:()=>drawTote(TOTE.x, TOTE.y) },
  { sortY: SHOES.y+8,    solid:false, box:[0,0,0,0], draw:()=>drawShoes(SHOES.x, SHOES.y) },
  { sortY: CROCS.y+8,    solid:false, box:[0,0,0,0], draw:()=>drawCrocs(CROCS.x, CROCS.y) },
  { sortY: CANS.y+11,    solid:false, box:[0,0,0,0], draw:()=>drawCans() },
  { sortY: TABLE.y+10,   solid:true,  box:[TABLE.x, TABLE.y+4, 18, 6], draw:()=>drawTable(TABLE.x, TABLE.y) },
  { sortY: STOOL_G.y+9,  solid:false, box:[0,0,0,0], draw:()=>drawStool(STOOL_G.x, STOOL_G.y, '#3a9a4a') },
  { sortY: STOOL_O.y+9,  solid:false, box:[0,0,0,0], draw:()=>drawStool(STOOL_O.x, STOOL_O.y, '#e07b2a') },
  { sortY: STOOL_B.y+9,  solid:false, box:[0,0,0,0], draw:()=>drawStool(STOOL_B.x, STOOL_B.y, '#3a78c0') },
  { sortY: STOOL_Y.y+9,  solid:false, box:[0,0,0,0], draw:()=>drawStool(STOOL_Y.x, STOOL_Y.y, '#e6c84a') },
  { sortY: MILKWEED.y+15, solid:false, box:[0,0,0,0], draw:()=>drawMilkweed(MILKWEED.x, MILKWEED.y) },
  { sortY: STUMP.y+15,    solid:true,  box:[STUMP.x+2, STUMP.y+4, 16, 11], draw:()=>drawStump(STUMP.x, STUMP.y) },
  { sortY: DRIFT.y+8,     solid:false, box:[0,0,0,0], draw:()=>drawDrift(DRIFT.x, DRIFT.y) },
];

/* ─── Characters — toggle control with C ──────────────────── */
const SPEED = 1.1;
const mkChar = (tx, ty, dir, pal, action) => ({ x:tx*TILE, y:ty*TILE, dir, pal, action, moving:false, animT:0, idleT:0 });
const luke  = mkChar(19, 14, 0, PALETTES.luke, null);
const teebo = mkChar(17, 12, 0, PALETTES.teebo, null);   // standing (chairs moved to the water)
const chars = [luke, teebo];
let active = 0;

/* ─── Ambient: jumping fish, a rare bald eagle, the secret sub ─── */
let fish = null, fishTimer = 90;
let eagle = null, eagleTimer = 500;
let sub = null;                                          // summoned by typing "sub"
function updateAmbient() {
  if (fish) { fish.t++; if (fish.t > fish.life) fish = null; }
  else if (--fishTimer <= 0) {
    const fx = (8 + Math.random()*15) * TILE, fy = (16 + Math.random()*5) * TILE;
    if (isWater(tileAt(Math.floor(fx/TILE), Math.floor(fy/TILE)))) fish = { x:fx, y:fy, t:0, life:34 };
    fishTimer = 160 + Math.floor(Math.random()*260);
  }
  if (eagle) { eagle.x += eagle.vx; eagle.y += Math.sin(eagle.x*0.012)*0.25; if (eagle.x < -24 || eagle.x > PX_W+24) eagle = null; }
  else if (--eagleTimer <= 0) { const d = Math.random()<0.5?1:-1;
    eagle = { x: d>0?-18:PX_W+18, y:(2+Math.random()*5)*TILE, vx:d*0.5 }; eagleTimer = 1100 + Math.floor(Math.random()*1400); }
  if (sub) { sub.t++;
    if (sub.phase==='rise') { sub.surf = Math.min(1, sub.surf+0.02); if (sub.surf>=1 && !sub.escape) sub.phase='down'; }
    else if (sub.phase==='down') { sub.y += 0.4; if (sub.y > 22*TILE) sub.phase='left'; }         // down the river, into deep water
    else if (sub.phase==='left') { sub.x -= 0.45; if (sub.x < 2*TILE) sub.phase='dive'; }         // turn left across the bottom
    else { sub.surf = Math.max(0, sub.surf-0.02); if (sub.surf<=0) sub = null; } }
}
function summonSub() { if (!sub) sub = { x: 27.5*TILE, y: 4*TILE, surf: 0, phase:'rise', t:0 }; }
function drawEagle() {
  if (!eagle) return;
  const x = Math.round(eagle.x), y = Math.round(eagle.y), fl = eagle.vx>0?1:-1, flap = Math.sin(eagle.x*0.25)>0?-3:1;
  ctx.fillStyle = OL;
  ctx.fillRect(x-8, y+flap, 7, 2); ctx.fillRect(x+1, y+flap, 7, 2);     // wings
  ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x-2, y, 4, 3);                // body
  ctx.fillStyle = '#f2f2ec'; ctx.fillRect(x+1*fl, y-1, 2, 2);          // white head
  ctx.fillStyle = '#e6b62e'; ctx.fillRect(x+3*fl, y-1, 1, 1);          // beak
  ctx.fillStyle = '#f2f2ec'; ctx.fillRect(x-1, y+3, 3, 1);            // white tail
}
function drawSub() {
  if (!sub) return;
  const x = Math.round(sub.x), y = Math.round(sub.y) + (1-sub.surf)*8;
  ctx.save(); ctx.globalAlpha = 0.4 + sub.surf*0.6;
  ctx.fillStyle = 'rgba(220,240,248,0.45)'; ctx.fillRect(x-18, y+6, 38, 1);   // wake
  ctx.fillStyle = OL; ctx.beginPath(); ctx.ellipse(x, y+2, 18, 6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#3a4a3a'; ctx.beginPath(); ctx.ellipse(x, y+1, 16, 5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2a3a2c'; ctx.fillRect(x-15, y+2, 30, 3);
  ctx.fillStyle = OL; ctx.fillRect(x-4, y-7, 8, 8);                            // conning tower
  ctx.fillStyle = '#3a4a3a'; ctx.fillRect(x-3, y-6, 6, 6);
  ctx.fillStyle = '#ffe04a'; ctx.fillRect(x-1, y-5, 2, 2);                     // light
  ctx.fillStyle = OL; ctx.fillRect(x+1, y-11, 1, 4);                          // periscope
  ctx.restore();
}
function drawFishJump(f) {
  const p = f.t / f.life, arc = Math.sin(p*Math.PI);
  const fx = f.x + p*9, fy = f.y - arc*15;
  if (f.t < 6 || f.t > f.life-6) { ctx.fillStyle = 'rgba(220,240,250,0.8)'; ctx.fillRect(f.x-2, f.y, 2, 2); ctx.fillRect(f.x+3, f.y-1, 2, 2); }
  ctx.fillStyle = OL; ctx.beginPath(); ctx.ellipse(fx, fy, 4, 2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#bcd0d6'; ctx.beginPath(); ctx.ellipse(fx, fy, 3, 1.3, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#8fb0b8'; ctx.fillRect(Math.round(fx-5), Math.round(fy-1), 2, 3);
}

/* ─── Action sprites ──────────────────────────────────────── */
function drawLying(x, y, pal) {              // head poking out of the top sleeping bag
  box(x+3, y-2, 8, 8, pal.skin);
  ctx.fillStyle = pal.hair; ctx.fillRect(x+3, y-3, 8, 3); ctx.fillRect(x+3, y-3, 2, 5); ctx.fillRect(x+9, y-3, 2, 5);
  ctx.fillStyle = '#23150c'; ctx.fillRect(x+5, y+1, 2, 1); ctx.fillRect(x+8, y+1, 2, 1);  // sleepy eyes
}
function drawFishing(x, y, dir, pal, t) {
  drawTrainer(x, y, dir, 0, pal, 0);
  const left = dir === 2;
  const hx = x + (left ? 2 : 13), hy = y + 10;
  const rx = x + (left ? -10 : 23), ry = y - 2;
  ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(rx, ry); ctx.stroke();
  const bobY = y + 14 + Math.sin(t*0.1)*1.5;
  ctx.strokeStyle = 'rgba(240,240,240,0.7)'; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx, bobY); ctx.stroke();
  ctx.fillStyle = '#e4443a'; ctx.fillRect(rx-1, bobY, 2, 2);
}
function drawSwim(x, y, dir, pal, t) {        // head & shoulders above the surface, body under water
  const bob = Math.sin(t*0.1) < 0 ? 0 : 1;
  ctx.fillStyle = 'rgba(95,168,214,0.55)'; ctx.beginPath(); ctx.ellipse(x+8, y+15, 9, 4, 0, 0, TAU); ctx.fill();   // water over the body
  box(x+3, y+9+bob, 9, 4, pal.shirt);                                                                              // shoulders
  ctx.fillStyle = pal.skin; ctx.fillRect(x+1, y+10+bob, 2, 3); ctx.fillRect(x+12, y+10+bob, 2, 3);                 // arms
  box(x+3, y+2+bob, 9, 8, pal.skin);                                                                               // head
  ctx.fillStyle = pal.hair; ctx.fillRect(x+3, y+1+bob, 9, 3); ctx.fillRect(x+3, y+1+bob, 2, 5); ctx.fillRect(x+10, y+1+bob, 2, 5);
  if (dir !== 1) { ctx.fillStyle = '#23150c'; ctx.fillRect(x+5, y+5+bob, 2, 1); ctx.fillRect(x+8, y+5+bob, 2, 1); }
  ctx.strokeStyle = 'rgba(225,242,250,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x+8, y+15, 11+Math.sin(t*0.2)*1.5, 5, 0, 0, TAU); ctx.stroke();
}
function drawCardBlow(bt) {                   // the card tent tumbling away in the wind
  if (bt >= 60) return;
  for (let i = 0; i < 4; i++) {
    const cx = CARD.x + 6 + i*3 + bt*(1 + i*0.4), cy = CARD.y + 8 - bt*0.5 + Math.sin(bt*0.2 + i)*4;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(bt*0.18 + i);
    ctx.fillStyle = OL; ctx.fillRect(-3, -4, 6, 8);
    ctx.fillStyle = i%2 ? '#3a64c8' : '#2f55b0'; ctx.fillRect(-2, -3, 4, 6);
    ctx.restore();
  }
}
function headlampHead(c, bob) {                          // little lamp on the controlled character's head, after dark
  if (c !== chars[active] || lamp === 0 || lighting(timeOfDay).d < 0.28) return;
  const x = Math.round(c.x), y = Math.round(c.y) + (bob || 0);
  ctx.fillStyle = '#222'; ctx.fillRect(x+3, y+1, 9, 1);
  ctx.fillStyle = lamp === 2 ? '#e2443a' : '#f6f4d2'; ctx.fillRect(x+6, y, 3, 2);
}
function drawCharSprite(c, t) {
  if (c.action === 'sit')  { drawSeated(c.x, c.y, c.pal, t); headlampHead(c, 0); return; }
  if (c.action === 'lay')  return drawLying(c.x, c.y, c.pal);
  if (c.action === 'fish') { drawFishing(c.x, c.y, c.dir, c.pal, t); headlampHead(c, 0); return; }
  if (tileAt(Math.floor((c.x+7)/TILE), Math.floor((c.y+16)/TILE)) === 'W') { drawSwim(c.x, c.y, c.dir, c.pal, t); headlampHead(c, 0); return; }  // swimming
  const bob = (!c.moving && Math.floor(c.idleT/34) % 2 === 0) ? 0 : (!c.moving ? -1 : 0);
  const step = c.moving ? [0,1,2,3][Math.floor(c.animT) % 4] : 0;
  const wading = tileAt(Math.floor((c.x+7)/TILE), Math.floor((c.y+18)/TILE)) === 'w';
  const charizard = (c === teebo) && lighting(timeOfDay).d > 0.3;   // Teebo throws on the Charizard onesie at night
  drawTrainer(c.x, c.y, c.dir, step, charizard ? CHARIZARD : c.pal, bob);
  if (charizard) {
    const x = Math.round(c.x), y = Math.round(c.y) + bob;
    ctx.fillStyle = '#f2d9a0'; ctx.fillRect(x+4, y+9, 7, 5);                    // cream belly
    ctx.fillStyle = '#e8862f'; ctx.fillRect(x+2, y-2, 2, 3); ctx.fillRect(x+11, y-2, 2, 3); // horns
    ctx.fillStyle = '#e8862f'; ctx.fillRect(x-2, y+13, 3, 4);                   // tail
    ctx.fillStyle = '#f5631c'; ctx.fillRect(x-3, y+10, 2, 3); ctx.fillStyle = '#ffd24a'; ctx.fillRect(x-3, y+10, 1, 1); // tail flame
  }
  headlampHead(c, bob);
  if (wading) {                                          // wading in the shallows: ripple over the feet + splash
    ctx.fillStyle = 'rgba(150,210,238,0.5)'; ctx.beginPath(); ctx.ellipse(c.x+8, c.y+19, 6, 2, 0, 0, TAU); ctx.fill();
    if (c.moving && Math.floor(t) % 6 < 3) { ctx.fillStyle = 'rgba(225,242,250,0.8)'; ctx.fillRect(c.x+2, c.y+16, 1, 1); ctx.fillRect(c.x+12, c.y+17, 1, 1); }
  }
}

/* ─── Input ───────────────────────────────────────────────── */
const keys = {};
let keyBuf = '';                                        // for the secret "sub" code
let escaped = null;                                     // walk-off-the-top easter egg state
let riding = false;                                     // riding the sub to get dropped off
const DIRKEYS = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right', KeyW:'up', KeyS:'down', KeyA:'left', KeyD:'right' };
addEventListener('keydown', (e) => {
  if (DIRKEYS[e.code]) { keys[DIRKEYS[e.code]] = true; e.preventDefault(); }
  if (!running) return;
  if (e.code === 'KeyZ' || e.code === 'Enter') { interact(); sfx('blip'); }
  if (e.code === 'KeyC' || e.code === 'Tab') { e.preventDefault(); active = (active + 1) % chars.length; dialog = null; sfx('blip'); }
  if (e.code === 'KeyF') { lamp = (lamp + 1) % 3; }   // off -> white -> red
  if (e.key && e.key.length === 1) { keyBuf = (keyBuf + e.key.toLowerCase()).slice(-3); if (keyBuf === 'sub') summonSub(); }
  if (e.code === 'KeyR' && editMode) {                // rotate the shelter 90° at a time, full 360
    shelterRot = (shelterRot + 1) % 4;
    shelterProp.box = (shelterRot % 2) ? [BLANKET.x-1, BLANKET.y-1, 30, 26] : [BLANKET.x-1, BLANKET.y-1, 26, 30];
  }
});
addEventListener('keyup', (e) => { if (DIRKEYS[e.code]) keys[DIRKEYS[e.code]] = false; });

/* ─── Dialog + interactions ───────────────────────────────── */
let dialog = null;
const say = t => dialog = { lines: Array.isArray(t) ? t : [t], i: 0 };   // one or many boxes to click through
const near = (ax, ay, bx, by, r) => Math.abs(ax-bx) < r && Math.abs(ay-by) < r;
function interact() {
  const a = chars[active];
  if (dialog) { if (++dialog.i >= dialog.lines.length) dialog = null; return; }   // advance / close the conversation
  if (a.action) { a.action = null; return; }            // stand back up
  const fx = a.x + 7 + (a.dir===2?-12:a.dir===3?12:0);
  const fy = a.y + 12 + (a.dir===0?14:a.dir===1?-14:0);
  const tcode = tileAt(Math.floor(fx/TILE), Math.floor(fy/TILE));
  const isLuke = a === luke;
  const L = (lukeLine, teeboLine) => say(isLuke ? lukeLine : teeboLine);   // line depends on who you control
  const other = isLuke ? teebo : luke;
  if (near(fx, fy, other.x+7, other.y+10, 16)) {        // a back-and-forth you click through
    if (isLuke) say(["Luke: yo, you gonna help set up or just stand there?", "Teebo: I'm supervising. it's a real job.", "Luke: ...right."]);
    else        say(["Teebo: we got any food left?", "Luke: it's all in the cooler, man.", "Teebo: ...so that's a maybe."]);
  } else if (near(fx, fy, FIRE.x+8, FIRE.y+10, 18)) {
    fireLit = !fireLit;
    if (fireLit) L("You get the fire going again.", "Teebo: there we go, that's better.");
    else L("You kick dirt over the fire till it hisses out.", "Teebo: fire's out. rip.");
  } else if (!cardTent.gone && near(fx, fy, CARD.x+10, CARD.y+8, 20)) {
    cardTent.gone = true; cardTent.blowT = 0; cardProp.solid = false;
    L("You lean on the card tent and the whole thing blows over. Never gonna hold.", "Teebo: bro do NOT touch the card tent — ...and it's gone.");
  } else if (near(fx, fy, CANS.x+7, CANS.y+5, 16)) {
    L("Luke: who leaves a whole pile of cans out here? ...wait, are some of these full?", "Teebo: free Coors. I'm not asking questions.");
  } else if (near(fx, fy, CROCS.x+6, CROCS.y+4, 14)) {
    L("Luke: my crocs. can't go in the river without the crocs.", "Teebo: those are Luke's. man loves those crocs.");
  } else if (near(fx, fy, BLANKET.x+12, BLANKET.y+14, 28)) {
    a.action = 'lay'; a.x = BLANKET.x + 10; a.y = BLANKET.y + 14;
    L("You crawl into a sleeping bag, head in the tent.", "Teebo: bag time. wake me at noon.");
  } else if (near(fx, fy, CHAIR.x+6, CHAIR.y+6, 16))  { a.action = 'sit'; a.x = CHAIR.x; a.y = CHAIR.y; L("You drop into the chair.", "Teebo kicks back."); }
  else if (near(fx, fy, CHAIR2.x+6, CHAIR2.y+6, 16)) { a.action = 'sit'; a.x = CHAIR2.x; a.y = CHAIR2.y; L("You drop into the chair.", "Teebo kicks back."); }
  else if (tcode === 'w' || tcode === 'W') { a.action = 'fish'; L("Luke: one of these days I'm actually gonna catch a fish.", "Teebo: i never catch anything but i'll stand here lookin good."); }
  else if (tcode === 'T') L("Just woods. They go back a long way.", "Teebo: lotta trees, man.");
  else if (tcode === 's') L("Soft sand out on the bar.", "Teebo: sand's gettin everywhere.");
  else L("Quiet out here. Just the river.", "Teebo: this is the spot. unreal.");
}
function drawDialog() {
  if (!dialog) return;
  const bx = 10, by = VIEW_H-46, bw = VIEW_W-20, bh = 36;
  ctx.fillStyle = '#102a45'; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#f0ece6'; ctx.fillRect(bx+2, by+2, bw-4, bh-4);
  ctx.fillStyle = '#102a45'; ctx.fillRect(bx+4, by+4, bw-8, bh-8);
  ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.textBaseline = 'top';
  wrapText(dialog.lines[dialog.i], bx+9, by+9, bw-18, 10);
  if (Math.floor(performance.now()/400) % 2 === 0) {    // blinking prompt: ▸ if more boxes, ▾ to close
    ctx.fillStyle = '#f5a623';
    if (dialog.i < dialog.lines.length-1) { ctx.fillRect(bx+bw-13, by+bh-12, 2, 5); ctx.fillRect(bx+bw-11, by+bh-11, 2, 3); ctx.fillRect(bx+bw-9, by+bh-10, 2, 1); }
    else ctx.fillRect(bx+bw-12, by+bh-11, 4, 4);
  }
}
function wrapText(text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) { const test = line + w + ' ';
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w+' '; yy += lh; } else line = test; }
  ctx.fillText(line, x, yy);
}

/* ─── Update ──────────────────────────────────────────────── */
function update() {
  const a = chars[active];
  if (editMode) {                                       // arrow keys pan the map while painting
    const sp = 5;
    if (keys.up) camY -= sp; if (keys.down) camY += sp; if (keys.left) camX -= sp; if (keys.right) camX += sp;
    camX = Math.max(0, Math.min(PX_W-VIEW_W, camX)); camY = Math.max(0, Math.min(PX_H-VIEW_H, camY));
    return;
  }
  if (escaped) {                                        // the "put me back in the game" bit
    escaped.t++;
    if (escaped.t < 46) a.y -= 1.1;                     // keep walking up, off the top edge
    if (escaped.t === 6) say("Luke: ...uh, the map kinda just ends here, man. ...yo. put me back in the game, bro. PUT ME BACK IN THE GAME.");
    if (escaped.t > 175) { sub = { x: 18*TILE, y: 21*TILE, surf:0, phase:'rise', escape:true, t:0 }; riding = true; escaped = null; }  // the sub comes to fetch you
    waterPhase += 0.06; updateAmbient(); return;
  }
  if (riding) {                                         // riding the sub until it surfaces and drops you on the beach
    if (sub) { a.x = sub.x - 3; a.y = sub.y - 11; a.dir = 0;
      if (sub.surf >= 1) { a.x = sub.x; a.y = 19*TILE; a.dir = 0; riding = false; sub.phase = 'dive'; sfx('splash'); say("the sub surfaces, spits you out onto the beach, and dives back under. ...don't ask."); }
    } else riding = false;
    waterPhase += 0.06; updateAmbient(); return;
  }
  let dx = 0, dy = 0;
  if (!dialog) {
    if (keys.up) { dy -= SPEED; a.dir = 1; }
    else if (keys.down) { dy += SPEED; a.dir = 0; }
    else if (keys.left) { dx -= SPEED; a.dir = 2; }
    else if (keys.right) { dx += SPEED; a.dir = 3; }
  }
  if (tileAt(Math.floor((a.x+7)/TILE), Math.floor((a.y+16)/TILE)) === 'W') { dx *= 0.6; dy *= 0.6; }  // slower while swimming
  a.moving = (dx !== 0 || dy !== 0);
  if (a.moving && a.action) { if (a.action === 'lay') { a.x = BLANKET.x + 10; a.y = BLANKET.y + 38; } a.action = null; }  // stand clear of the shelter
  if (!a.action) {
    const feet = 18;
    if (dx !== 0) { const nx = a.x+dx, e = dx>0?nx+13:nx+2; if (!solidAtPx(e, a.y+feet) && !solidAtPx(e, a.y+11)) a.x = nx; }
    if (dy !== 0) { const ny = a.y+dy, e = dy>0?ny+feet:ny+8; if (!solidAtPx(a.x+2, e) && !solidAtPx(a.x+13, e)) a.y = ny; }
    a.x = Math.max(0, Math.min(PX_W-14, a.x));
    a.y = Math.max(0, Math.min(PX_H-22, a.y));
  }
  const ow = ['w','W'].includes(tileAt(Math.floor((a.x+7)/TILE), Math.floor((a.y+16)/TILE)));   // splash entering water
  if (ow && !lastWater) sfx('splash');
  lastWater = ow;
  if (!escaped && a.y <= 0 && keys.up) escaped = { t:0 };   // reached the very top while heading up
  if (a.moving) { a.animT += 0.16; a.idleT = 0; } else { a.animT = 0; a.idleT++; }
  for (const c of chars) if (c !== a) { c.moving = false; c.idleT++; }
  if (cardTent.gone && cardTent.blowT < 60) cardTent.blowT++;
  nudgeCans(a.x+7, a.y+12);
  waterPhase += 0.06;
  updateAmbient();
}

/* ─── Render ──────────────────────────────────────────────── */
function render(t) {
  const a = chars[active];
  if (!editMode) {                                      // edge-scroll: clamps at top/left, pans down/right
    const mr = 140, ml = 140, mb = 100, mt = 100;
    if (a.x - camX > VIEW_W - mr) camX = a.x - (VIEW_W - mr);
    if (a.x - camX < ml) camX = a.x - ml;
    if (a.y - camY > VIEW_H - mb) camY = a.y - (VIEW_H - mb);
    if (a.y - camY < mt) camY = a.y - mt;
    camX = Math.max(0, Math.min(PX_W-VIEW_W, camX));
    camY = Math.max(0, Math.min(PX_H-VIEW_H, camY));
  }
  const cx = Math.round(camX), cy = Math.round(camY);
  camX = cx; camY = cy;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.save(); ctx.translate(-cx, -cy);
  const x0 = Math.floor(cx/TILE), x1 = Math.ceil((cx+VIEW_W)/TILE);
  const y0 = Math.floor(cy/TILE), y1 = Math.ceil((cy+VIEW_H)/TILE)+1;

  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = tileAt(tx, ty), x = tx*TILE, y = ty*TILE;
    if (c === 's') drawSand(x, y, tx, ty);
    else if (c === 'w') drawWater(x, y, false, tx, ty);
    else if (c === 'W') drawWater(x, y, true, tx, ty);
    else if (c === 'R' || c === 'O') drawRock(x, y, tx, ty);
    else if (c === 'd') drawDirt(x, y, tx, ty);
    else if (c === 'T' || c === 'b') drawGrass(x, y, tx, ty, 'g');
    else drawGrass(x, y, tx, ty, c);
  }

  const drawables = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = tileAt(tx, ty);
    if (c === 'T') drawables.push({ y: ty*TILE+10, fn: () => drawTree(tx*TILE, ty*TILE) });
    else if (c === 'O') drawables.push({ y: ty*TILE+12, fn: () => drawBoulder(tx*TILE, ty*TILE, tx, ty) });
    else if (c === 'b') drawables.push({ y: ty*TILE+11, fn: () => drawBush(tx*TILE, ty*TILE) });
  }
  for (const p of props) drawables.push({ y: p.sortY, fn: () => p.draw(t) });
  for (const c of chars) drawables.push({ y: c.y + (c.action === 'lay' ? 20 : 19), fn: () => drawCharSprite(c, t) });
  if (fish) drawables.push({ y: fish.y, fn: () => drawFishJump(fish) });
  if (sub) drawables.push({ y: sub.y + 40, fn: () => drawSub() });
  drawables.sort((p, q) => p.y - q.y);
  drawables.forEach(d => d.fn());
  drawEagle();                                           // eagle glides above everything

  ctx.restore();
  const vg = ctx.createRadialGradient(VIEW_W/2, VIEW_H/2, 40, VIEW_W/2, VIEW_H/2, 150);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.26)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (!editMode) { applyAtmosphere(t); drawTimeDial(t); }
  drawDialog();
  if (editMode) drawEditor();
}

/* ─── Map editor: paint tiles + move gear ─────────────────── */
let editMode = false, drag = null, brush = null, brushSize = 2, painting = false, hover = null;
const BRUSHES = [
  { c:null,    label:'move gear', col:'#aaaaaa' },
  { c:'g',     label:'grass',     col:'#5aa83f' },
  { c:'G',     label:'tall grass',col:'#357a2a' },
  { c:'*',     label:'flowers',   col:'#ffffff' },
  { c:'d',     label:'worn grass',col:'#8c7c52' },
  { c:'b',     label:'bush',      col:'#2c7a33' },
  { c:'T',     label:'tree',      col:'#1f6b2e' },
  { c:'s',     label:'sand',      col:'#e3d2a0' },
  { c:'w',     label:'stream',    col:'#6fb6dd' },
  { c:'W',     label:'river',     col:'#3777bd' },
  { c:'erase', label:'erase',     col:'#7a3a3a' },
];
function editHandles() {
  const ph = (o) => ({ get:()=>[Math.round(o.x/TILE), Math.round(o.y/TILE)], set:(x,y)=>{ o.x=x*TILE; o.y=y*TILE; }, color:'#ffd23a' });
  return [ ph(FIRE), ph(BLANKET), ph(CHAIR), ph(CHAIR2), ph(CARD), ph(TOTE), ph(CROCS), ph(CANS), ph(TABLE), ph(STOOL_G), ph(STOOL_O), ph(STOOL_B), ph(STOOL_Y), ph(MILKWEED), ph(STUMP), ph(DRIFT),
    { get:()=>[Math.round(luke.x/TILE), Math.round(luke.y/TILE)], set:(x,y)=>{ luke.x=x*TILE; luke.y=y*TILE; }, color:'#66ccff' },
    { get:()=>[Math.round(teebo.x/TILE), Math.round(teebo.y/TILE)], set:(x,y)=>{ teebo.x=x*TILE; teebo.y=y*TILE; }, color:'#ffaa55' } ];
}
const PROP_LABELS = ['fire','shelter','chair','chair2','card','tote','crocs','cans','table','stoolG','stoolO','stoolB','stoolY','milkweed','stump','drift','Luke','Teebo'];
function mouseWorld(e) { const r = canvas.getBoundingClientRect(); return [ (e.clientX-r.left)*(VIEW_W/r.width), (e.clientY-r.top)*(VIEW_H/r.height) ]; }
function saveOverrides() { try { localStorage.setItem('bc_paint', JSON.stringify(overrides)); } catch (_) {} }
function paintAt(wx, wy) {
  const cx = Math.floor(wx/TILE), cy = Math.floor(wy/TILE), r = brushSize-1;
  for (let dy=-r; dy<=r; dy++) for (let dx=-r; dx<=r; dx++) {
    const x=cx+dx, y=cy+dy; if (x<0||y<0||x>=MAP_W||y>=MAP_H) continue;
    const k = x+'_'+y; if (brush==='erase') delete overrides[k]; else overrides[k]=brush;
  }
  saveOverrides();
}
function drawEditor() {
  ctx.save(); ctx.translate(-camX, -camY);              // draw the grid/handles in world space so they track the pan
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 0.5;
  for (let x=0;x<=MAP_W;x++){ ctx.beginPath(); ctx.moveTo(x*TILE,0); ctx.lineTo(x*TILE,MAP_H*TILE); ctx.stroke(); }
  for (let y=0;y<=MAP_H;y++){ ctx.beginPath(); ctx.moveTo(0,y*TILE); ctx.lineTo(MAP_W*TILE,y*TILE); ctx.stroke(); }
  if (brush === null) {
    editHandles().forEach((h,i)=>{ const [tx,ty]=h.get(); ctx.fillStyle=h.color; ctx.fillRect(tx*TILE-3,ty*TILE-3,6,6); ctx.strokeStyle='#000'; ctx.lineWidth=1; ctx.strokeRect(tx*TILE-3,ty*TILE-3,6,6);
      ctx.fillStyle='#fff'; ctx.font='6px monospace'; ctx.fillText(PROP_LABELS[i]||'', tx*TILE+5, ty*TILE-4); });
  } else if (hover) {
    const n = 2*(brushSize-1)+1, b = BRUSHES.find(x=>x.c===brush);
    ctx.strokeStyle = b ? b.col : '#fff'; ctx.lineWidth = 1.4;
    ctx.strokeRect((hover[0]-(brushSize-1))*TILE, (hover[1]-(brushSize-1))*TILE, n*TILE, n*TILE);
  }
  ctx.restore();
}
canvas.addEventListener('mousedown', (e) => {
  if (!running) return;
  const [sx, sy] = mouseWorld(e);                       // screen-space (for the dial)
  if (!editMode && Math.hypot(sx-DIAL.x, sy-DIAL.y) < DIAL.r+9) { dialDrag = true; setTimeFromMouse(sx, sy); return; }
  if (!editMode) return;
  const wx = sx + camX, wy = sy + camY;                 // world-space (account for camera pan)
  if (brush !== null) { painting = true; paintAt(wx, wy); return; }
  let best=null, bd=13; for (const h of editHandles()){ const [tx,ty]=h.get(); const d=Math.hypot(tx*TILE-wx,ty*TILE-wy); if(d<bd){bd=d;best=h;} } drag=best;
});
canvas.addEventListener('mousemove', (e) => {
  const [sx, sy] = mouseWorld(e);
  hover = [Math.floor((sx+camX)/TILE), Math.floor((sy+camY)/TILE)];
  if (dialDrag) { setTimeFromMouse(sx, sy); return; }
  if (!editMode) return;
  const wx = sx + camX, wy = sy + camY;
  if (painting) { paintAt(wx, wy); return; }
  if (drag) drag.set(Math.max(0, Math.min(MAP_W, Math.round(wx/TILE))), Math.max(0, Math.min(MAP_H, Math.round(wy/TILE))));
});
addEventListener('mouseup', () => { drag = null; dialDrag = false; painting = false; });
const tt = (o) => [Math.round(o.x/TILE), Math.round(o.y/TILE)];
function fullMapRows() { const rows=[]; for (let y=0;y<MAP_H;y++){ let r=''; for (let x=0;x<MAP_W;x++) r+=tileAt(x,y); rows.push(r); } return rows; }
function exportJSON() {
  return JSON.stringify({ map: fullMapRows(), shelterRot, FIRE:tt(FIRE), BLANKET:tt(BLANKET), CHAIR:tt(CHAIR), CHAIR2:tt(CHAIR2), CARD:tt(CARD), TOTE:tt(TOTE), SHOES:tt(SHOES), CROCS:tt(CROCS), CANS:tt(CANS), TABLE:tt(TABLE), STOOL_G:tt(STOOL_G), STOOL_O:tt(STOOL_O), STOOL_B:tt(STOOL_B), STOOL_Y:tt(STOOL_Y), MILKWEED:tt(MILKWEED), STUMP:tt(STUMP), DRIFT:tt(DRIFT), luke:tt(luke), teebo:tt(teebo) });
}
{
  const editBtn=document.getElementById('editBtn'), panel=document.getElementById('editPanel'), out=document.getElementById('layoutOut'), row=document.getElementById('brushRow');
  // editor is for building the map locally — hide it on the live site (still reachable via file:// or ?edit)
  const editorAllowed = location.protocol === 'file:' || /^(localhost$|127\.|192\.168\.)/.test(location.hostname) || location.search.includes('edit');
  if (!editorAllowed) editBtn.style.display = 'none';
  BRUSHES.forEach(b=>{ const btn=document.createElement('button'); btn.className='brush-btn'+(b.c===null?' on':''); btn.textContent=b.label; btn.style.setProperty('--bc', b.col);
    btn.addEventListener('click',()=>{ brush=b.c; [...row.children].forEach(c=>c.classList.remove('on')); btn.classList.add('on'); });
    row.appendChild(btn); });
  document.querySelectorAll('.size-row button').forEach(btn=>{ btn.addEventListener('click',()=>{ brushSize=+btn.dataset.sz; document.querySelectorAll('.size-row button').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); }); });
  editBtn.addEventListener('click', ()=>{ editMode=!editMode; panel.classList.toggle('hidden',!editMode); editBtn.textContent=editMode?'exit editor':'edit map'; });
  document.getElementById('copyBtn').addEventListener('click', ()=>{ const s=exportJSON(); out.value=s; out.select(); if(navigator.clipboard) navigator.clipboard.writeText(s).catch(()=>{}); try{document.execCommand('copy');}catch(_){} });
  document.getElementById('clearBtn').addEventListener('click', ()=>{ for(const k in overrides) delete overrides[k]; saveOverrides(); });
}

/* ─── Atmosphere: time of day, lighting, weather ──────────── */
let timeOfDay = 15, lamp = 0, camX = 0, camY = 0, dialDrag = false, fogPhase = 0;
const TAU = Math.PI * 2;
const lerp = (a, b, f) => a + (b - a) * f;
const w2s = (wx, wy) => [wx - camX, wy - camY];
const SKY = [
  { t:0,   c:[12,18,44],   d:0.70 }, { t:5,   c:[30,38,66],   d:0.52 },
  { t:6.5, c:[120,124,150],d:0.28 }, { t:8,   c:[236,238,234],d:0.05 },
  { t:12,  c:[255,250,238],d:0.0  }, { t:17,  c:[255,240,212],d:0.04 },
  { t:19,  c:[168,138,150],d:0.16 }, { t:20.5,c:[72,68,110],  d:0.36 },
  { t:22,  c:[24,30,64],   d:0.55 }, { t:24,  c:[12,18,44],   d:0.70 },
];
function lighting(time) {
  for (let i = 0; i < SKY.length-1; i++) { const a = SKY[i], b = SKY[i+1];
    if (time >= a.t && time <= b.t) { const f = (time-a.t)/(b.t-a.t);
      return { c:[lerp(a.c[0],b.c[0],f), lerp(a.c[1],b.c[1],f), lerp(a.c[2],b.c[2],f)], d: lerp(a.d,b.d,f) }; } }
  return SKY[0];
}
const fireflies = Array.from({length:9}, (_,i)=>({ x:(2+i*1.2)*TILE, y:(1+(i%6)*1.7)*TILE, ph:i*2.3, vx:(i%2?0.045:-0.035), vy:(i%3?0.03:-0.025) }));

const DIRV = [[0,1],[0,-1],[-1,0],[1,0]];               // down, up, left, right
function headlampBeam(hx, hy, dir, additive, red) {     // the soft bloom (no clip/half-circle), nudged forward
  const [dx, dy] = DIRV[dir], bx = hx + dx*18, by = hy + dy*18;
  const g = ctx.createRadialGradient(bx, by, 1, bx, by, 26);
  if (additive) { const col = red ? '255,16,16' : '255,250,228';   // headlamp glow — red is properly red now
    g.addColorStop(0, `rgba(${col},${red?0.38:0.26})`); g.addColorStop(1, `rgba(${col},0)`); }
  else { g.addColorStop(0, 'rgba(255,255,255,0.82)'); g.addColorStop(0.6, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
  ctx.save(); ctx.translate(bx, by); ctx.scale(dx?1.5:0.7, dy?1.5:0.7); ctx.translate(-bx, -by);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 26, 0, TAU); ctx.fill(); ctx.restore();
}
function lightMask(t, additive, nightAmt) {
  if (fireLit && nightAmt > 0.05) {                     // campfire only glows once the moon's out
    const [sx, sy] = w2s(FIRE.x+8, FIRE.y+6), r = 22 + Math.sin(t*0.08)*1.5;
    const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, r);
    if (additive) { g.addColorStop(0, `rgba(255,165,70,${0.45*nightAmt})`); g.addColorStop(1, 'rgba(255,165,70,0)'); }
    else { g.addColorStop(0, `rgba(255,255,255,${0.85*nightAmt})`); g.addColorStop(0.6, `rgba(255,255,255,${0.4*nightAmt})`); g.addColorStop(1, 'rgba(255,255,255,0)'); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
  }
  if (lamp > 0) { const c = chars[active]; if (c.action !== 'lay') {
    const [hx, hy] = w2s(c.x+7, c.y+2); headlampBeam(hx, hy, c.dir, additive, lamp === 2); } }
}
function drawMoon(t, amt) {                              // no moon disc — only its reflection drifting on the river
  let np = timeOfDay >= 19 ? (timeOfDay-19)/10 : (timeOfDay+5)/10;
  np = Math.max(0, Math.min(1, np));
  const [sx, sy] = w2s(28*TILE, (6 + np*10)*TILE);      // reflection moves down the right-side river over the night
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = amt;
  for (let i = 0; i < 5; i++) { const wob = Math.sin(t*0.06 + i)*3;
    ctx.fillStyle = `rgba(208,220,255,${0.18 - i*0.025})`; ctx.fillRect(sx-7+wob, sy + i*5 - 8, 14, 2); }
  const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, 20); g.addColorStop(0, 'rgba(208,220,255,0.12)'); g.addColorStop(1, 'rgba(208,220,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, sy, 10, 16, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawFireflies(t, amt) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const f of fireflies) {
    f.x += f.vx; f.y += f.vy;                            // drift slowly in the woods
    if (f.x < 1*TILE || f.x > 12*TILE) f.vx *= -1;
    if (f.y < 1*TILE || f.y > 12*TILE) f.vy *= -1;
    const s = Math.sin(t*0.035 + f.ph), blink = s > 0.6 ? (s-0.6)/0.4 : 0;   // lit only briefly, slow
    if (blink <= 0) continue;
    const a = blink * amt, [sx, sy] = w2s(f.x, f.y);
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 5); g.addColorStop(0, `rgba(200,255,140,${a*0.5})`); g.addColorStop(1, 'rgba(200,255,140,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(215,255,160,${a*0.85})`; ctx.fillRect(sx, sy, 1.5, 1.5);
  }
  ctx.restore();
}
function drawFog(t) {
  fogPhase += 0.15;
  const inten = timeOfDay < 7 ? (timeOfDay-5)/2 : (9.5-timeOfDay)/2.5;
  const a = Math.max(0, Math.min(1, inten)) * 0.55;
  if (a <= 0.01) return;
  for (let i = 0; i < 6; i++) {
    let fx = (((i*140 - fogPhase*0.7) % (PX_W+160)) + (PX_W+160)) % (PX_W+160) - 80 - camX;
    const fy = (11 + i*1.6)*TILE + Math.sin(fogPhase*0.05+i)*7 - camY;
    const g = ctx.createRadialGradient(fx, fy, 4, fx, fy, 72); g.addColorStop(0, `rgba(226,232,236,${a*0.5})`); g.addColorStop(1, 'rgba(226,232,236,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(fx, fy, 72, 26, 0, 0, TAU); ctx.fill();
  }
}
function applyAtmosphere(t) {
  const L = lighting(timeOfDay), dark = L.d;
  const nightAmt = Math.max(0, Math.min(1, (dark - 0.22) / 0.4));   // gradual: night stuff eases in, never pops
  if (timeOfDay >= 5 && timeOfDay <= 9.5) drawFog(t);
  if (dark > 0.006) {
    ctx.save();
    ctx.fillStyle = `rgba(${L.c[0]|0},${L.c[1]|0},${L.c[2]|0},${dark})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalCompositeOperation = 'destination-out'; lightMask(t, false, nightAmt);
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; lightMask(t, true, nightAmt); ctx.restore();
  }
  if (nightAmt > 0.01) { drawMoon(t, nightAmt); drawFireflies(t, nightAmt); }
}
const DIAL = { x: 30, y: 158, r: 17 };
function setTimeFromMouse(mx, my) {
  const ang = Math.atan2(my - DIAL.y, mx - DIAL.x);
  timeOfDay = ((12 + (ang + Math.PI/2) / TAU * 24) % 24 + 24) % 24;
}
function drawTimeDial(t) {
  const L = lighting(timeOfDay), cx = DIAL.x, cy = DIAL.y, r = DIAL.r;
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(cx, cy, r+4, 0, TAU); ctx.fill();
  ctx.fillStyle = `rgb(${Math.min(255,L.c[0]*0.6+30)|0},${Math.min(255,L.c[1]*0.6+40)|0},${Math.min(255,L.c[2]*0.6+60)|0})`;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  const sunA = -Math.PI/2 + (timeOfDay-12)/24*TAU;
  const sx = cx+Math.cos(sunA)*r, sy = cy+Math.sin(sunA)*r, mx = cx-Math.cos(sunA)*r, my = cy-Math.sin(sunA)*r;
  ctx.fillStyle = '#e8e8d0'; ctx.beginPath(); ctx.arc(mx, my, 3.4, 0, TAU); ctx.fill();   // moon
  ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(mx+1.2, my-0.6, 2.6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e8e8d0'; ctx.beginPath(); ctx.arc(mx-0.6, my+0.4, 2.4, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#ffce3a'; ctx.lineWidth = 1;                                          // sun rays
  for (let i = 0; i < 8; i++) { const a = i/8*TAU; ctx.beginPath(); ctx.moveTo(sx+Math.cos(a)*5, sy+Math.sin(a)*5); ctx.lineTo(sx+Math.cos(a)*7.5, sy+Math.sin(a)*7.5); ctx.stroke(); }
  ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(sx, sy, 4, 0, TAU); ctx.fill();      // sun
  const hh = Math.floor(timeOfDay), mm = Math.floor((timeOfDay%1)*60);
  ctx.fillStyle = '#fff'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
  ctx.fillText((hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm, cx, cy+r+11); ctx.textAlign = 'left';
}

/* ─── Audio: music + location-balanced ambience + chiptune SFX ─── */
const AUD = { started:false, music:0.05, amb:0.5, sfx:0.5, muted:false, el:{} };
let sfxCtx = null, lastWater = false, canSfxCd = 0;
function startAudio() {
  if (AUD.started) return; AUD.started = true;
  AUD.el = { music:document.getElementById('bgMusic'), river:document.getElementById('ambRiver'), meadow:document.getElementById('ambMeadow'), fire:document.getElementById('ambFire') };
  for (const k in AUD.el) { const a = AUD.el[k]; if (a) { a.volume = 0; a.play().catch(()=>{}); } }
  try { sfxCtx = new (window.AudioContext||window.webkitAudioContext)(); } catch (_) {}
}
function updateAudio() {
  if (!AUD.started) return;
  const c = chars[active], m = AUD.muted ? 0 : 1;
  if (AUD.el.music) AUD.el.music.volume += (AUD.music*m - AUD.el.music.volume) * 0.1;
  const ftx = Math.floor((c.x+7)/TILE), fty = Math.floor((c.y+16)/TILE);
  let water = 0; for (let dy=-3;dy<=3;dy++) for (let dx=-3;dx<=3;dx++) if (isWater(ftx+dx, fty+dy)) water++;
  const riverAmt = Math.min(1, water/14);
  const fireAmt = fireLit ? Math.max(0, 1 - Math.hypot(c.x-FIRE.x, c.y-FIRE.y)/100) : 0;
  const meadowAmt = Math.max(0.12, 1 - riverAmt*0.9 - fireAmt*0.6);
  const set = (a, target) => { if (a) a.volume += (target*AUD.amb*m - a.volume) * 0.08; };
  set(AUD.el.river, riverAmt); set(AUD.el.fire, fireAmt); set(AUD.el.meadow, meadowAmt);
}
function sfx(type) {
  if (AUD.muted || AUD.sfx <= 0 || !sfxCtx) return;
  const now = sfxCtx.currentTime, g = sfxCtx.createGain(); g.connect(sfxCtx.destination);
  const tone = (wave, f0, f1, dur, vol) => { const o = sfxCtx.createOscillator(); o.type = wave; o.frequency.setValueAtTime(f0, now); if (f1) o.frequency.exponentialRampToValueAtTime(f1, now+dur); o.connect(g); g.gain.setValueAtTime(vol*AUD.sfx, now); g.gain.exponentialRampToValueAtTime(0.001, now+dur); o.start(now); o.stop(now+dur); };
  if (type === 'blip') tone('square', 620, 880, 0.08, 0.22);
  else if (type === 'can') tone('triangle', 880, 260, 0.14, 0.2);
  else if (type === 'splash') {
    const len = (sfxCtx.sampleRate*0.22)|0, b = sfxCtx.createBuffer(1, len, sfxCtx.sampleRate), d = b.getChannelData(0);
    for (let i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, 2);
    const s = sfxCtx.createBufferSource(); s.buffer = b; const f = sfxCtx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1100;
    s.connect(f); f.connect(g); g.gain.setValueAtTime(0.3*AUD.sfx, now); g.gain.exponentialRampToValueAtTime(0.001, now+0.22); s.start(now);
  }
}
{
  const panel = document.getElementById('audioPanel'), toggle = () => panel.classList.toggle('hidden');
  document.getElementById('audioBtn').addEventListener('click', toggle);
  addEventListener('keydown', e => { if (e.code === 'Escape') { e.preventDefault(); toggle(); } });
  document.getElementById('volMusic').addEventListener('input', e => { AUD.music = e.target.value/100; });
  document.getElementById('volAmb').addEventListener('input', e => { AUD.amb = e.target.value/100; });
  document.getElementById('volSfx').addEventListener('input', e => { AUD.sfx = e.target.value/100; });
  const mute = document.getElementById('muteBtn');
  mute.addEventListener('click', () => { AUD.muted = !AUD.muted; mute.classList.toggle('on', AUD.muted); });
}

/* ─── Loop ────────────────────────────────────────────────── */
let running = false;
function frame(t) { if (running) { update(); updateAudio(); render(t/16); } requestAnimationFrame(frame); }
requestAnimationFrame(frame);

/* ─── Title / start ───────────────────────────────────────── */
const titleEl = document.getElementById('title');
const hintEl = document.getElementById('hint');
const exitEl = document.getElementById('exitBtn');
function start() {
  if (running) return;
  running = true;
  startAudio();
  titleEl.classList.add('hidden'); hintEl.classList.add('show'); exitEl.classList.add('show');
  setTimeout(() => hintEl.classList.remove('show'), 6000);
}
document.getElementById('startBtn').addEventListener('click', start);
addEventListener('keydown', (e) => { if (!running && (e.code==='Enter'||e.code==='Space')) start(); });
