// Gera icon.ico multi-entrada (16/32/48, BMP 32bpp) para o RC.exe do Windows.
import { writeFileSync } from "node:fs";

const dir = "C:/Users/Kelvin/Desktop/JavaForge/src-tauri/icons";

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function pixel(x, y, size) {
  const u = x / size, v = y / size;
  const pad = Math.max(0.5, size * 0.08);
  const radius = size * 0.2;
  const cx = x < radius ? radius : x > size - radius ? size - radius : x;
  const cy = y < radius ? radius : y > size - radius ? size - radius : y;
  const dx = x - cx, dy = y - cy;
  const inside = x >= pad && x <= size - pad && y >= pad && y <= size - pad &&
    (dx * dx + dy * dy <= radius * radius || x >= radius && x <= size - radius || y >= radius && y <= size - radius);
  if (!inside) return [0, 0, 0, 0];
  const lw = size * 0.11;
  const near = (p, c) => Math.abs(p - c) <= lw / 2 + 0.5;
  if ((near(u, 0.34) || near(u, 0.66)) && v >= 0.3 && v <= 0.7) return [245, 165, 36, 255];
  const chev =
    (Math.abs(v - 0.5 - (u - 0.41) * 0.4) <= lw / 2 && u >= 0.41 && u <= 0.5) ||
    (Math.abs(v - 0.42 + (u - 0.59) * 0.4) <= lw / 2 && u >= 0.5 && u <= 0.59);
  if (chev) return [232, 236, 242, 255];
  return [21, 26, 33, 255];
}
function dib(size) {
  const px = size * size * 4;
  const maskRow = Math.ceil(size / 8 / 4) * 4;
  const mask = maskRow * size;
  const buf = Buffer.alloc(40 + px + mask);
  buf.writeUInt32LE(40, 0);
  buf.writeInt32LE(size, 4);
  buf.writeInt32LE(size * 2, 8);
  buf.writeUInt16LE(1, 12);
  buf.writeUInt16LE(32, 14);
  buf.writeUInt32LE(0, 16);
  buf.writeUInt32LE(px + mask, 20);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, size - 1 - y, size);
      const o = 40 + (y * size + x) * 4;
      buf[o] = b; buf[o + 1] = g; buf[o + 2] = r; buf[o + 3] = 255;
    }
  }
  return buf;
}
const sizes = [16, 32, 48];
const dats = sizes.map(dib);
const headerSize = 6 + 16 * dats.length;
const ico = Buffer.alloc(headerSize + dats.reduce((a, b) => a + b.length, 0));
ico.writeUInt16LE(0, 0);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(dats.length, 4);
let offset = headerSize;
dats.forEach((d, i) => {
  const e = 6 + 16 * i;
  ico[e] = sizes[i] === 256 ? 0 : sizes[i];
  ico[e + 1] = sizes[i] === 256 ? 0 : sizes[i];
  ico[e + 2] = 0;
  ico[e + 3] = 0;
  ico.writeUInt16LE(1, e + 4);
  ico.writeUInt16LE(32, e + 6);
  ico.writeUInt32LE(d.length, e + 8);
  ico.writeUInt32LE(offset, e + 12);
  d.copy(ico, offset);
  offset += d.length;
});
writeFileSync(`${dir}/icon.ico`, ico);
console.log(`icon.ico: ${ico.length} bytes, entradas ${sizes.join("/")}`);
