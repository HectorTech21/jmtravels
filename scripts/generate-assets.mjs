#!/usr/bin/env node
/*
 * Genera favicons, iconos, logos WebP y og-image.png a partir del logo original.
 * No forma parte del build: solo hace falta si cambia el logo o el lema.
 * Requiere (sin guardarlos en package.json):
 *   npm i --no-save sharp playwright @fontsource/bricolage-grotesque @fontsource/jetbrains-mono @fontsource/dm-sans
 * og-image usa Chromium de Playwright (PLAYWRIGHT_BROWSERS_PATH o executablePath).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { default: sharp } = await import(process.env.SHARP_PATH || "sharp");
const SRC = join(ROOT, "assets/img/logo-original.jpg");
const out = (p) => join(ROOT, p);

// Recorte cuadrado del globo (sin el texto inferior) para iconos pequeños
const GLOBE = { left: 207, top: 22, width: 610, height: 610 };
// Recorte circular del logo completo para la cabecera
const meta = await sharp(SRC).metadata();

async function circle(size, file, extract) {
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`);
  let img = sharp(SRC);
  if (extract) img = img.extract(extract);
  const buf = await img.resize(size, size, { fit: "cover" }).toBuffer();
  return sharp(buf).composite([{ input: mask, blend: "dest-in" }]);
}

// Logos de cabecera (logo completo, cuadrado, fondo blanco)
for (const s of [160, 320]) await sharp(SRC).resize(s, s).webp({ quality: 86 }).toFile(out(`assets/img/logo-${s}.webp`));
const PAL = { compressionLevel: 9, palette: true, quality: 92, effort: 10 };
await sharp(SRC).resize(512, 512).png(PAL).toFile(out("assets/img/logo-512.png"));

// Favicons: globo recortado sobre fondo blanco
const favPng = async (s) => sharp(SRC).extract(GLOBE).resize(s, s).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(out("assets/img/icons/favicon-16.png"), await favPng(16));
writeFileSync(out("assets/img/icons/favicon-32.png"), await favPng(32));
writeFileSync(out("assets/img/icons/icon-192.png"), await sharp(SRC).resize(192, 192).png(PAL).toBuffer());
writeFileSync(out("assets/img/icons/icon-512.png"), await sharp(SRC).resize(512, 512).png(PAL).toBuffer());
// Maskable: logo reducido al 80 % sobre blanco (zona segura)
await sharp({ create: { width: 512, height: 512, channels: 3, background: "#ffffff" } })
  .composite([{ input: await sharp(SRC).resize(410, 410).toBuffer(), gravity: "center" }])
  .png(PAL).toFile(out("assets/img/icons/icon-maskable-512.png"));
await sharp(SRC).extract(GLOBE).resize(180, 180).flatten({ background: "#fff" }).png(PAL).toFile(out("apple-touch-icon.png"));

// favicon.ico con PNG embebidos (16, 32, 48)
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map(favPng));
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dir = [];
sizes.forEach((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0); e.writeUInt8(s, 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += pngs[i].length; dir.push(e);
});
writeFileSync(out("favicon.ico"), Buffer.concat([header, ...dir, ...pngs]));

// og-image.png 1200×630 (logo + lema) renderizada con Chromium
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(out("assets/js/config.js"), "utf8"), sandbox);
const site = sandbox.window.JMD_CONFIG;
const logo64 = (await sharp(SRC).resize(520, 520).png().toBuffer()).toString("base64");
// Fuentes incrustadas (Chromium sin red no puede descargar Google Fonts)
const font = (pkg, file) => readFileSync(join(ROOT, "node_modules/@fontsource", pkg, "files", file)).toString("base64");
const face = (fam, w, b64) => `@font-face{font-family:"${fam}";font-weight:${w};src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
const fonts = [
  face("Bricolage Grotesque", 800, font("bricolage-grotesque", "bricolage-grotesque-latin-800-normal.woff2")),
  face("JetBrains Mono", 700, font("jetbrains-mono", "jetbrains-mono-latin-700-normal.woff2")),
  face("DM Sans", 500, font("dm-sans", "dm-sans-latin-500-normal.woff2")),
  face("DM Sans", 700, font("dm-sans", "dm-sans-latin-700-normal.woff2"))
].join("");
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<style>${fonts}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;font-family:"DM Sans",sans-serif;color:#fff;
background:radial-gradient(120% 90% at 15% 0%,#17348a 0%,#0a1a44 45%,#050d24 100%);position:relative}
.g{position:absolute;inset:0;background:radial-gradient(40% 50% at 95% 10%,rgba(225,34,124,.45),transparent 70%),radial-gradient(35% 45% at 60% 110%,rgba(255,200,61,.25),transparent 70%)}
.grid{position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 1px,transparent 1px 60px),repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 60px)}
.logo{position:absolute;left:60px;top:65px;width:500px;height:500px;border-radius:50%;background:#fff;box-shadow:0 30px 80px -20px rgba(0,0,0,.6),0 0 0 10px rgba(255,255,255,.12);overflow:hidden}
.logo img{width:100%;height:100%;object-fit:cover;transform:scale(1.02)}
.t{position:absolute;left:610px;right:56px;top:92px}
.k{font:700 18px "JetBrains Mono";letter-spacing:.18em;text-transform:uppercase;color:#ffc83d;margin-bottom:22px}
h1{font:800 72px/0.98 "Bricolage Grotesque";letter-spacing:-.035em;margin-bottom:26px}
h1 span{background:linear-gradient(100deg,#ffc83d,#ff7a1a 45%,#e1227c);-webkit-background-clip:text;color:transparent}
p{font-size:25px;line-height:1.35;color:#d6def5}
.b{position:absolute;left:610px;bottom:62px;display:flex;gap:12px}
.b span{font:700 17px "JetBrains Mono";padding:10px 16px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25)}
.b span:first-child{background:#ffc83d;color:#050d24;border-color:#ffc83d}
</style></head><body><div class="g"></div><div class="grid"></div>
<div class="logo"><img src="data:image/png;base64,${logo64}" alt=""></div>
<div class="t"><div class="k">Agencia de viajes · Madrid</div>
<h1>No somos virtuales.<br><span>Somos reales.</span></h1>
<p>Vuelos a Latinoamérica con 2 maletas de 23&nbsp;kg y paquetería puerta a puerta Madrid → Lima.</p></div>
<div class="b"><span>2PC · 23KG</span><span>${site.license}</span><span>${site.phone.display}</span></div>
</body></html>`;
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || "playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const shot = await page.screenshot({ type: "png" });
await browser.close();
await sharp(shot).png({ compressionLevel: 9, palette: true, quality: 95, dither: 0.6, effort: 10 }).toFile(out("og-image.png"));
console.log("✔ Assets generados", meta.width + "x" + meta.height);
