# JMD Travesías por el Mundo — web

Web estática (HTML + CSS + JS, sin framework) de **JMD Travesías por el Mundo — Agencia de Viajes & Multiservicios** (Madrid).
*No somos virtuales. Somos reales.*

## Estructura

```
index.html, aviso-legal.html, privacidad.html,   ← HTML GENERADO (no editar a mano)
cookies.html, condiciones.html, 404.html
sitemap.xml, robots.txt, site.webmanifest,       ← generados por el build
CREDITS.md
favicon.ico, apple-touch-icon.png, og-image.png  ← generados desde el logo

assets/js/config.js    ← ÚNICA fuente de datos de la empresa (teléfono, CIF, dirección, SITE_URL, email, horario…)
assets/js/main.js      ← animaciones (GSAP + ScrollTrigger + Lenis), cotizadores, calculadora, formularios
assets/css/styles.css  ← estilos (paleta del logo, mobile-first)
assets/vendor/         ← GSAP 3.15.0, ScrollTrigger, Lenis 1.3.26 (copias locales)
assets/img/            ← logo original, logos WebP y favicons

src/pages/*.html       ← plantillas de cada página
src/partials/*.html    ← cabecera, footer, head, iconos…
src/data/photos.json   ← fotografías (Unsplash) con autor y alt
src/data/lima-districts.json

scripts/build.mjs            ← genera el HTML desde src/ + config.js (sin dependencias)
scripts/check.mjs            ← comprobaciones (enlaces, alt, WhatsApp, JSON-LD, IDs…)
scripts/generate-assets.mjs  ← regenera favicons y og-image (opcional, requiere sharp + playwright)
```

## Cómo se trabaja

1. Edita los datos en `assets/js/config.js` o los textos en `src/`.
2. Ejecuta `npm run build` (Node ≥ 18, sin dependencias). Genera el HTML y pasa las comprobaciones.
3. Sube los cambios. El build también copia la web publicable a `public/` (carpeta que usa Vercel por defecto; no se versiona). Otros hostings pueden servir directamente la raíz del repositorio.

## Pendiente (TODO)

- `SITE_URL` en `assets/js/config.js`: dominio definitivo. Mientras esté vacío no se emiten `canonical`, `og:url` ni URLs en `sitemap.xml`, y la `og:image` es relativa (WhatsApp/Facebook necesitan URL absoluta).
- `email`: al rellenarlo aparece en cabecera, footer, oficina y legales, y se activa el botón «Enviar por email».
- `hours`: horario de atención (se muestra al rellenarlo).
- `registry` (opcional): datos de inscripción en el Registro Mercantil para el aviso legal.
- Revisión de los textos legales por un profesional.
