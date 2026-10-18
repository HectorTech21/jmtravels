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
assets/js/main.js      ← animaciones (GSAP + ScrollTrigger), cotizadores, calculadora, formularios
assets/css/styles.css  ← estilos (paleta del logo, mobile-first)
assets/vendor/         ← GSAP 3.15.0 y ScrollTrigger locales; archivo histórico de Lenis sin cargar
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
2. Ejecuta `npm run build` (Node 22, sin dependencias). Genera el HTML y pasa las comprobaciones.
3. Sube los cambios. El build también copia la web publicable a `public/` (carpeta que usa Vercel por defecto; no se versiona). Otros hostings pueden servir directamente la raíz del repositorio.

## Pendiente (TODO)

- `SITE_URL` en `assets/js/config.js`: dominio definitivo. Mientras esté vacío no se emiten `canonical`, `og:url` ni URLs en `sitemap.xml`, y la `og:image` es relativa (WhatsApp/Facebook necesitan URL absoluta).
- `email`: al rellenarlo aparece en cabecera, footer, oficina y legales, y se activa el botón «Enviar por email».
- `hours`: horario de atención (se muestra al rellenarlo).
- `registry` (opcional): datos de inscripción en el Registro Mercantil para el aviso legal.
- Revisión de los textos legales por un profesional.

## Rediseño editorial y comprobación local

El sistema visual conserva azul marino/dorado y las fuentes Bricolage Grotesque + DM Sans, ahora alojadas en `assets/fonts/` con sus licencias. Las ilustraciones locales de vuelo, costa y paquete están identificadas como imágenes generadas con IA en `CREDITS.md`; las fotografías de destinos mantienen sus autores y fuentes originales.

Las animaciones usan GSAP/ScrollTrigger con `matchMedia`: reaccionan a cambios de movimiento reducido sin recargar, no preocultan el contenido y respetan el scroll nativo. El panel de destinos se anima solo al activarlo. Lenis se conserva como archivo histórico, pero ya no se carga. Sin JavaScript hay enlaces directos a WhatsApp y teléfono; los formularios no envían los datos mediante GET.

Para revisar la salida sin desplegar:

```sh
npm run build
npm run check
python -m http.server 8000 --directory public
```

La aplicación no tiene dependencias npm ni TypeScript. Node 22 es la versión declarada. La regeneración opcional de iconos/OG sigue siendo un flujo aparte: necesita sharp, Playwright, Chromium y los paquetes `@fontsource` que lee `generate-assets.mjs`.

La suite opcional de navegador está en `scripts/qa_browser.py`. Requiere Playwright para Python y Chromium en el entorno de QA; no son dependencias de la aplicación. Se puede preparar en un entorno virtual fuera del repositorio:

```sh
python -m venv /tmp/jmd-qa-venv
/tmp/jmd-qa-venv/bin/pip install playwright
# Si no hay Chromium instalado, instalar el navegador de pruebas:
/tmp/jmd-qa-venv/bin/python -m playwright install chromium
# En otra terminal, servir public/ en el puerto esperado por la suite:
python -m http.server 8001 --directory public
# Con el servidor activo:
/tmp/jmd-qa-venv/bin/python scripts/qa_browser.py
```

En Windows, usa el equivalente de `venv/Scripts/python.exe`; puedes indicar un Chromium existente mediante `CHROMIUM_PATH`. Las variables opcionales `JMD_QA_URL`, `JMD_QA_ARTIFACTS` y `AXE_PATH` cambian el servidor objetivo, la carpeta de capturas y la ruta de un `axe.min.js` de pruebas. Sin AXE_PATH solo se omite la prueba de axe y se informa como skipped. Los mensajes se interceptan: la suite no envía WhatsApps.

Ver [auditoría, decisiones, pruebas y limitaciones](docs/AUDITORIA-REDISENO.md). Los cambios locales no se publican hasta revisar y autorizar su subida/despliegue.
