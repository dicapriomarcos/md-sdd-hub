// Genera public/icon.ico y public/icon.png sin dependencias (PNG + contenedor ICO).
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y, size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// Diseño en coordenadas 0..1: cuadrado redondeado índigo con tres líneas (un documento) y un check
function inRoundRect(x, y, r) {
  const cx = Math.min(Math.max(x, r), 1 - r); const cy = Math.min(Math.max(y, r), 1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}
function capsule(x, y, x1, x2, yc, t) {
  const cx = Math.min(Math.max(x, x1), x2);
  return (x - cx) ** 2 + (y - yc) ** 2 <= (t / 2) ** 2;
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function sample(x, y) {
  const m = 0.035;
  const u = (x - m) / (1 - 2 * m); const v = (y - m) / (1 - 2 * m);
  if (u < 0 || u > 1 || v < 0 || v > 1 || !inRoundRect(u, v, 0.23)) return null;
  // degradado índigo
  const t = (u + v) / 2;
  let col = [Math.round(99 - 20 * t), Math.round(102 - 32 * t), Math.round(241 - 12 * t)];
  const th = 0.095;
  const white = capsule(u, v, 0.24, 0.72, 0.30, th) || capsule(u, v, 0.24, 0.58, 0.48, th) || capsule(u, v, 0.24, 0.40, 0.66, th);
  const check = segDist(u, v, 0.53, 0.70, 0.62, 0.79) <= th / 2 || segDist(u, v, 0.62, 0.79, 0.80, 0.58) <= th / 2;
  if (white) col = [255, 255, 255];
  if (check) col = [134, 239, 172];
  return col;
}
function pixel(px, py, size) {
  const S = 4; let r = 0, g = 0, b = 0, a = 0;
  for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) {
    const c = sample((px + (i + 0.5) / S) / size, (py + (j + 0.5) / S) / size);
    if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
  }
  if (!a) return [0, 0, 0, 0];
  return [Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round((a / (S * S)) * 255)];
}

const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = sizes.map((s) => png(s, pixel));
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dir = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e[0] = s === 256 ? 0 : s; e[1] = s === 256 ? 0 : s; e[2] = 0; e[3] = 0;
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(images[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return e;
});
const out = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(out, 'icon.ico'), Buffer.concat([header, ...dir, ...images]));
fs.writeFileSync(path.join(out, 'icon.png'), images[sizes.indexOf(256)]);
console.log('icon.ico y icon.png generados');
