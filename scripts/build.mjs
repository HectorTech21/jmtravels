#!/usr/bin/env node
/*
 * Build estático sin dependencias.
 *
 *  src/pages/*.html + src/partials/*.html + assets/js/config.js + src/data/*.json
 *    → *.html en la raíz, sitemap.xml, robots.txt, site.webmanifest y CREDITS.md
 *
 * Sintaxis de plantillas:
 *   {{ ruta.al.dato }}        valor escapado
 *   {{{ ruta.al.dato }}}      valor sin escapar (HTML)
 *   {{> parcial }}            incluye src/partials/parcial.html
 *   {{#if ruta}}…{{else}}…{{/if}}
 *   {{@img clave preset "clases"}}   <img> responsive desde src/data/photos.json
 *
 * Metadatos de página: primera línea de cada plantilla  <!--page { ...json... }-->
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const warnings = [];

/* ---------- Datos ---------- */
const sandbox = { window: {} };
vm.runInNewContext(read("assets/js/config.js"), sandbox, { filename: "config.js" });
const site = sandbox.window.JMD_CONFIG;
if (!site) throw new Error("assets/js/config.js no define window.JMD_CONFIG");
const photos = JSON.parse(read("src/data/photos.json"));
const districts = JSON.parse(read("src/data/lima-districts.json"));

const SITE_URL = (site.SITE_URL || "").replace(/\/+$/, "");
if (!SITE_URL) warnings.push("SITE_URL vacío en assets/js/config.js: no se emiten canonical, og:url ni URLs en sitemap.xml.");
if (!site.email) warnings.push("email vacío: se ocultan email y envío por email.");
if (!site.hours) warnings.push("hours vacío: se oculta el horario.");

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
const abs = (p) => (SITE_URL ? SITE_URL + p : p);

/* ---------- Imágenes ---------- */
const PRESETS = {
  hero: { widths: [640, 960, 1280, 1920], sizes: "100vw", eager: true },
  wide: { widths: [640, 960, 1400], sizes: "(min-width: 1024px) 60vw, 100vw" },
  card: { widths: [400, 600, 900], sizes: "(min-width: 1000px) 380px, (min-width: 640px) 45vw, 92vw" },
  feature: { widths: [600, 900, 1400], sizes: "(min-width: 1000px) 780px, 92vw" },
  half: { widths: [480, 720, 900], sizes: "(min-width: 900px) 45vw, 92vw" }
};
function unsplash(src, w) {
  return `${src}?auto=format&fit=crop&w=${w}&q=75`;
}
function img(key, presetName = "card", cls = "") {
  const p = photos[key];
  if (!p) throw new Error(`Foto desconocida: ${key}`);
  const pr = PRESETS[presetName];
  if (!pr) throw new Error(`Preset desconocido: ${presetName}`);
  const maxW = pr.widths[pr.widths.length - 1];
  const h = Math.round((maxW * p.h) / p.w);
  const srcset = pr.widths.map((w) => `${unsplash(p.src, w)} ${w}w`).join(", ");
  const loading = pr.eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
  return `<img class="${esc(cls)}" src="${esc(unsplash(p.src, pr.widths[1] || maxW))}" srcset="${esc(srcset)}" sizes="${esc(pr.sizes)}" width="${maxW}" height="${h}" alt="${esc(p.alt)}" ${loading} onerror="this.classList.add('img-err')">`;
}

/* ---------- Bloques generados ---------- */
const upper = (s) => s.toLocaleUpperCase("es-ES");

function barcode(seed) {
  // Código de barras decorativo determinista (SVG), a partir del código IATA.
  let x = 0, bars = "";
  let n = [...seed].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  for (let i = 0; i < 38; i++) {
    n = (n * 1103515245 + 12345) & 0x7fffffff;
    const w = 1 + (n % 3);
    if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="40"/>`;
    x += w + 1;
  }
  return `<svg class="bp__barcode" viewBox="0 0 ${x} 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">${bars}</svg>`;
}

const destCards = site.destinations
  .map((d, i) => {
    const feature = i === 0; // primer destino (Lima) destacado: especialidad de la agencia
    const media = d.img
      ? img(d.img, feature ? "feature" : "card", "bp__img")
      : `<div class="bp__art" aria-hidden="true"><span>${esc(d.iata)}</span></div>`;
    return `
        <li class="bp${feature ? " bp--feature" : ""}" data-reveal="card">
          <article class="bp__inner" data-tilt>
            <div class="bp__media">${media}<span class="bp__country">${esc(d.country)}</span></div>
            <div class="bp__body">
              <div class="bp__route" aria-label="Ruta Madrid a ${esc(d.city)}">
                <span class="bp__code">MAD</span>
                <svg class="bp__plane" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>
                <span class="bp__code">${esc(d.iata)}</span>
              </div>
              <h3 class="bp__city">${esc(d.city)}</h3>
              <dl class="bp__meta">
                <div><dt>Equipaje</dt><dd>2PC · 23KG</dd></div>
                <div><dt>Salida</dt><dd>Madrid</dd></div>
                <div><dt>Precio</dt><dd>Consultar</dd></div>
              </dl>
            </div>
            <div class="bp__stub">
              ${barcode(d.iata)}
              <button type="button" class="btn btn--gold btn--sm" data-quote="${esc(d.id)}" data-magnetic>Pedir precio<span class="sr-only"> de vuelos a ${esc(d.city)}</span></button>
            </div>
          </article>
        </li>`;
  })
  .join("");

const boardRows = site.destinations
  .slice(0, 6)
  .map(
    (d) => `
          <div class="board__row" role="presentation">
            <span class="board__cell board__cell--code" data-len="3">${esc(d.iata)}</span>
            <span class="board__cell board__cell--city" data-len="13">${esc(upper(d.city))}</span>
            <span class="board__cell board__cell--bag" data-len="10">2PC · 23KG</span>
            <span class="board__cell board__cell--status" data-len="11">PIDE PRECIO</span>
          </div>`
  )
  .join("");

const marqueeItems = site.destinations
  .map((d) => `<li><span class="mq__code">${esc(d.iata)}</span>${esc(d.city)}</li>`)
  .join("");

const destOptions = site.destinations
  .map((d) => `<option value="${esc(d.id)}">${esc(d.city)} (${esc(d.iata)}) · ${esc(d.country)}</option>`)
  .join("");

const destList = site.destinations.map((d) => `${esc(d.city)} (${esc(d.country)})`).join(", ");

const districtOptions = districts.map((d) => `<option>${esc(d)}</option>`).join("");

/* ---------- JSON-LD ---------- */
function jsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": ["TravelAgency", "LocalBusiness"],
    name: site.brandName,
    alternateName: site.tradeName,
    legalName: site.legalName,
    taxID: site.cif,
    slogan: site.slogan,
    description:
      "Agencia de viajes y multiservicios en Madrid especializada en vuelos a Latinoamérica con 2 maletas de 23 kg y paquetería puerta a puerta Madrid → Lima.",
    telephone: site.phone.e164,
    image: abs("/og-image.png"),
    logo: abs("/assets/img/logo-512.png"),
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      postalCode: site.address.postalCode,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      addressCountry: site.address.country
    },
    hasMap: site.address.mapsUrl,
    areaServed: [
      { "@type": "City", name: "Madrid" },
      { "@type": "Country", name: "España" },
      ...[...new Set(site.destinations.map((d) => d.country))].map((c) => ({ "@type": "Country", name: c }))
    ],
    knowsAbout: [...site.specialties, ...site.services],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: site.phone.e164,
      contactType: "customer service",
      availableLanguage: ["es"]
    }
  };
  if (SITE_URL) {
    data.url = SITE_URL + "/";
    data["@id"] = SITE_URL + "/#agencia";
  }
  if (site.email) data.email = site.email;
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

/* ---------- Motor de plantillas ---------- */
function render(tpl, ctx, depth = 0) {
  if (depth > 10) throw new Error("Parciales anidados en exceso");
  let out = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
    const p = `src/partials/${name}.html`;
    if (!existsSync(join(ROOT, p))) throw new Error(`Parcial no encontrado: ${p}`);
    return render(read(p), ctx, depth + 1);
  });
  // #if más internos primero (permite anidar)
  const ifRe = /\{\{#if\s+(!?)([\w.]+)\s*\}\}((?:(?!\{\{#if)[\s\S])*?)\{\{\/if\}\}/;
  let m;
  while ((m = ifRe.exec(out))) {
    const [whole, neg, path, body] = m;
    const [yes, no = ""] = body.split(/\{\{else\}\}/);
    let v = get(ctx, path);
    if (Array.isArray(v)) v = v.length;
    const truthy = neg ? !v : !!v;
    out = out.slice(0, m.index) + (truthy ? yes : no) + out.slice(m.index + whole.length);
  }
  out = out.replace(/\{\{@img\s+([\w-]+)\s+([\w-]+)(?:\s+"([^"]*)")?\s*\}\}/g, (_, k, p, c) => img(k, p, c || ""));
  out = out.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, path) => {
    const v = get(ctx, path);
    if (v === undefined) throw new Error(`Variable sin definir: ${path}`);
    return String(v);
  });
  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const v = get(ctx, path);
    if (v === undefined) throw new Error(`Variable sin definir: ${path}`);
    return esc(v);
  });
  return out;
}

/* ---------- Páginas ---------- */
const pagesDir = join(ROOT, "src/pages");
const pages = readdirSync(pagesDir).filter((f) => f.endsWith(".html"));
const year = new Date().getFullYear();
const built = [];

for (const file of pages) {
  let tpl = readFileSync(join(pagesDir, file), "utf8");
  let meta = {};
  tpl = tpl.replace(/^<!--page\s*([\s\S]*?)-->\s*/, (_, json) => {
    meta = JSON.parse(json);
    return "";
  });
  const path = file === "index.html" ? "/" : "/" + file;
  const page = {
    title: meta.title || site.brandName,
    description: meta.description || "",
    path,
    canonical: SITE_URL ? SITE_URL + path : "",
    ogUrl: SITE_URL ? SITE_URL + path : "",
    ogImage: abs("/og-image.png"),
    robots: meta.noindex ? "noindex, follow" : "index, follow",
    isHome: file === "index.html",
    noindex: !!meta.noindex,
    updated: meta.updated || ""
  };
  const ctx = {
    site,
    page,
    year,
    keywords: site.keywords.join(", "),
    wa: Object.fromEntries(
      Object.entries(site.messages).map(([k, msg]) => [k, `${site.phone.whatsappUrl}?text=${encodeURIComponent(msg)}`])
    ),
    gen: {
      destCards,
      boardRows,
      marqueeItems,
      destOptions,
      destList,
      districtOptions,
      jsonLd: page.isHome ? jsonLd() : "",
      destCount: site.destinations.length
    }
  };
  const html = render(tpl, ctx).replace(
    /^<!DOCTYPE html>\n/i,
    `<!DOCTYPE html>\n<!-- Generado por scripts/build.mjs desde src/pages/${file}. No editar a mano: edita src/ y ejecuta "npm run build". -->\n`
  );
  writeFileSync(join(ROOT, file), html);
  built.push({ file, path, noindex: page.noindex, priority: meta.priority ?? 0.5 });
}

/* ---------- sitemap / robots / manifest ---------- */
const today = new Date().toISOString().slice(0, 10);
const urls = SITE_URL
  ? built
      .filter((p) => !p.noindex)
      .map((p) => `  <url>\n    <loc>${SITE_URL}${p.path}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${p.priority}</priority>\n  </url>`)
      .join("\n")
  : "  <!-- TODO: define SITE_URL en assets/js/config.js y ejecuta \"npm run build\" para generar las URLs. -->";
writeFileSync(
  join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
);
writeFileSync(
  join(ROOT, "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: /src/\nDisallow: /scripts/\n` + (SITE_URL ? `\nSitemap: ${SITE_URL}/sitemap.xml\n` : `\n# TODO: añade "Sitemap: <SITE_URL>/sitemap.xml" definiendo SITE_URL y ejecutando npm run build\n`)
);
writeFileSync(
  join(ROOT, "site.webmanifest"),
  JSON.stringify(
    {
      name: site.brandName,
      short_name: site.shortName,
      lang: "es",
      start_url: "/",
      display: "standalone",
      background_color: "#06122e",
      theme_color: "#0a1a44",
      icons: [
        { src: "/assets/img/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/assets/img/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/assets/img/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
      ]
    },
    null,
    2
  ) + "\n"
);

/* ---------- CREDITS.md ---------- */
const credits = Object.entries(photos)
  .filter(([k]) => !k.startsWith("_"))
  .map(([k, p]) => `| \`${k}\` | ${p.alt} | [${p.author}](https://unsplash.com/@${p.username}) | [Ver en Unsplash](${p.page}) |`)
  .join("\n");
writeFileSync(
  join(ROOT, "CREDITS.md"),
  `# Créditos\n\n> Archivo generado por \`npm run build\` desde \`src/data/photos.json\`.\n\n## Fotografías\n\nTodas las fotografías proceden de [Unsplash](https://unsplash.com) y se usan bajo la [Licencia Unsplash](https://unsplash.com/license) (uso gratuito, comercial incluido, sin atribución obligatoria; se acredita igualmente por cortesía). Se sirven desde \`images.unsplash.com\` con parámetros de tamaño y calidad (\`?auto=format&fit=crop&w=…&q=75\`).\n\n| Clave | Descripción (alt) | Autor | Foto |\n|---|---|---|---|\n${credits}\n\n## Tipografías\n\n- [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque), [DM Sans](https://fonts.google.com/specimen/DM+Sans) y [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) — Google Fonts, SIL Open Font License 1.1.\n\n## Librerías\n\n- [GSAP](https://gsap.com) 3.15.0 + ScrollTrigger — GreenSock Standard License (uso gratuito).\n- [Lenis](https://github.com/darkroomengineering/lenis) 1.3.26 — MIT.\n\n## Logotipo\n\n- Logotipo de ${site.legalName}, propiedad de la empresa (\`assets/img/logo-original.jpg\`).\n`
);

console.log(`✔ Build completado: ${built.map((b) => b.file).join(", ")} + sitemap.xml, robots.txt, site.webmanifest, CREDITS.md`);
for (const w of warnings) console.log(`  TODO → ${w}`);
