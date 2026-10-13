// Gera os ícones PNG do JavaForge (32, 128, 256 e tamanhos de tile) sem dependências externas.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const dir = "C:/Users/Kelvin/Desktop/JavaForge/src-tauri/icons";
mkdirSync(dir, { recursive: true });

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 0);
  crc.copy(out, 8 + data.length);
  return out;
}
function png(size) {
  const w = size, h = size;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = pixel(x, y, size);
      raw[p++] = r; raw[p++] = g; raw[p++] = b; raw[p++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
function inRoundRect(x, y, size, pad, radius) {
  const min = pad, max = size - pad;
  if (x < min || x > max || y < min || y > max) return false;
  const cx = x < radius ? radius : x > max - radius ? max - radius : x;
  const cy = y < radius ? radius : y > max - radius ? max - radius : y;
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= radius * radius || (x >= radius && x <= max - radius) || (y >= radius && y <= max - radius);
}
function pixel(x, y, size) {
  const pad = Math.max(1, size * 0.08);
  const radius = size * 0.2;
  if (!inRoundRect(x + 0.5, y + 0.5, size, pad, radius)) return [0, 0, 0, 0];
  const u = x / size, v = y / size;
  const lw = size * 0.11;
  const near = (p, c, w) => Math.abs(p - c) <= w / 2 + 0.5;
  if ((near(u, 0.34, lw / size) || near(u, 0.66, lw / size)) && v >= 0.3 && v <= 0.7) return [245, 165, 36, 255];
  const chevron =
    (Math.abs(v - 0.5 - (u - 0.41) * 0.4) <= (lw / size) / 2 && u >= 0.41 && u <= 0.5) ||
    (Math.abs(v - 0.42 + (u - 0.59) * 0.4) <= (lw / size) / 2 && u >= 0.5 && u <= 0.59);
  if (chevron) return [232, 236, 242, 255];
  return [21, 26, 33, 255];
}
function savePng(path, size) {
  writeFileSync(path, png(size));
}
savePng(`${dir}/32x32.png`, 32);
savePng(`${dir}/128x128.png`, 128);
savePng(`${dir}/128x128@2x.png`, 256);
for (const n of [30, 44, 71, 89, 107, 142, 150, 284, 310]) savePng(`${dir}/Square${n}x${n}Logo.png`, n);
savePng(`${dir}/StoreLogo.png`, 50);
console.log("ícones PNG gerados em", dir);
