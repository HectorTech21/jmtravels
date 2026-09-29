#!/usr/bin/env node
/* Comprobaciones estáticas del sitio generado (sin dependencias). Sale con código 1 si hay errores. */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const err = (f, m) => errors.push(`${f}: ${m}`);

const pages = readdirSync(join(ROOT, "src/pages")).filter((f) => f.endsWith(".html"));
for (const file of pages) {
  const p = join(ROOT, file);
  if (!existsSync(p)) { err(file, "no generado (ejecuta npm run build)"); continue; }
  const html = readFileSync(p, "utf8");

  if (!/^<!DOCTYPE html>/i.test(html)) err(file, "falta <!DOCTYPE html> al inicio");
  if (!/<html lang="es">/.test(html)) err(file, 'falta <html lang="es">');
  if (/\{\{/.test(html)) err(file, "quedan marcas de plantilla sin procesar");
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) err(file, "debe haber exactamente un <h1>");
  if (!/<title>[^<]{10,}<\/title>/.test(html)) err(file, "falta <title>");
  if (!/<meta name="description" content="[^"]{50,}"/.test(html)) err(file, "falta meta description");

  // Referencias locales
  for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    const ref = m[1] === "/" ? "/index.html" : m[1];
    if (!existsSync(join(ROOT, decodeURIComponent(ref)))) err(file, `referencia local rota: ${m[1]}`);
  }
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(",")) {
      const url = part.trim().split(/\s+/)[0];
      if (url.startsWith("/") && !existsSync(join(ROOT, url))) err(file, `srcset local roto: ${url}`);
    }
  }

  // Imágenes
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0];
    if (!/\balt="/.test(tag)) err(file, `imagen sin alt: ${tag.slice(0, 90)}`);
    if (!/\bwidth="\d+"/.test(tag) || !/\bheight="\d+"/.test(tag)) err(file, `imagen sin width/height: ${tag.slice(0, 90)}`);
    const isLogo = /logo-\d+\.webp/.test(tag);
    const isHero = /fetchpriority="high"/.test(tag);
    if (!isHero && !isLogo && !/loading="lazy"/.test(tag)) err(file, `imagen sin loading="lazy": ${tag.slice(0, 90)}`);
    if (/images\.unsplash\.com/.test(tag) && !/alt="[^"]{8,}"/.test(tag)) err(file, "foto con alt demasiado corto");
  }

  // Contacto
  for (const m of html.matchAll(/https:\/\/wa\.me\/(\d+)/g)) if (m[1] !== "34687111168") err(file, `WhatsApp incorrecto: ${m[1]}`);
  for (const m of html.matchAll(/href="tel:([^"]+)"/g)) if (m[1] !== "+34687111168") err(file, `tel incorrecto: ${m[1]}`);
  if (!html.includes("+34 687 11 11 68")) err(file, "no muestra el teléfono +34 687 11 11 68");
  for (const s of ["B88982244", "CICMA 4321", "JMD Travesías por el Mundo S.L.", "C/ Alcalá 414"]) {
    if (!html.includes(s)) err(file, `falta dato de empresa en la página: ${s}`);
  }

  // IDs únicos y labels
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) err(file, `IDs duplicados: ${[...new Set(dup)].join(", ")}`);
  for (const m of html.matchAll(/<label[^>]*for="([^"]+)"/g)) if (!ids.includes(m[1])) err(file, `label sin control: ${m[1]}`);
  for (const m of html.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)) if (!ids.includes(m[1])) err(file, `aria apunta a id inexistente: ${m[1]}`);
  for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) if (!/rel="noopener/.test(m[0]) && !/href="\//.test(m[0])) err(file, `target=_blank sin rel=noopener: ${m[0].slice(0, 80)}`);

  // JSON-LD
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { err(file, "JSON-LD inválido: " + e.message); }
  }
}

// Sintaxis JS
for (const f of ["assets/js/config.js", "assets/js/main.js"]) {
  try { execFileSync(process.execPath, ["--check", join(ROOT, f)], { stdio: "pipe" }); }
  catch (e) { err(f, "error de sintaxis\n" + e.stderr); }
}
// Recursos obligatorios
for (const f of ["favicon.ico", "apple-touch-icon.png", "og-image.png", "robots.txt", "sitemap.xml", "site.webmanifest", "CREDITS.md",
  "assets/img/icons/favicon-16.png", "assets/img/icons/favicon-32.png", "assets/img/icons/icon-192.png", "assets/img/icons/icon-512.png",
  "assets/img/icons/icon-maskable-512.png", "assets/img/logo-512.png"]) {
  if (!existsSync(join(ROOT, f))) err(f, "no existe");
}

if (errors.length) {
  console.error(`✖ ${errors.length} problema(s):\n  - ` + errors.join("\n  - "));
  process.exit(1);
}
console.log(`✔ Comprobaciones superadas en ${pages.length} páginas.`);
