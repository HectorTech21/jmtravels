# Auditoría y rediseño de JMD Travesías

Fecha: 18 de octubre de 2026. Base revisada: `98f1a02`.
Alcance: código del repositorio y salida de producción `public/`, servida por HTTP local. No se ha hecho push, fusionado a main ni publicado en Vercel.

## Arquitectura y alcance de la lectura

Web estática HTML/CSS/JavaScript, sin framework, backend, TypeScript, SSR ni hidratación. Node 22 genera seis páginas a partir de `src/pages/`, `src/partials/`, `src/data/` y `assets/js/config.js`; `scripts/check.mjs` valida el resultado. La misma salida sirve para desarrollo y para Vercel. No hay instalación de dependencias de aplicación: `package.json` solo declara los scripts build/check y Node 22.

Se revisaron las plantillas y parciales, la configuración comercial completa, los datos de fotos y distritos, las 793 líneas originales de main.js, las 874 de CSS y los scripts build/check/generate-assets. Las librerías minificadas se identificaron por sus cabeceras, API y uso; no se realizó una revisión interna de su implementación minificada. Los archivos de imagen se comprobaron por referencias y uso. Las skills y su biblioteca se habían auditado en el mismo trabajo.

Toda la información de empresa, teléfono, CIF, licencia, dirección, destinos, servicios y mensajes base sigue en config.js y no se ha cambiado. Tampoco se han inventado ofertas, tarifas, testimonios, reseñas o proveedores. El build conserva las seis páginas y copia la salida completa a public/. Los documentos legales solo cambian de presentación y actualizan los hechos técnicos sobre fuentes locales e ilustraciones de IA.

## Hallazgos demostrados

| Prioridad | Evidencia | Corrección o estado |
| --- | --- | --- |
| Importante, privacidad | Los formularios originales no tenían action/method y seguían activos sin JS. Una entrega nativa de formulario usa GET por defecto: podía colocar los datos en la URL del mismo sitio. | Fieldsets y botones de envío desactivados por defecto; se habilitan al registrar los manejadores. Alternativas directas WhatsApp/teléfono y explicación noscript. |
| Importante, movimiento | REDUCE se leía una sola vez. Al cargar con movimiento reducido y cambiar a no-preference, la preferencia cambiaba pero seguía habiendo cero ScrollTriggers. | gsap.matchMedia crea y revierte estilos/triggers al cambiar la preferencia, también sin recargar. Se actualizan los demás manejadores y se detiene el panel. |
| Importante, robustez | CSS ocultaba data-reveal y casi todo el Hero antes de que GSAP arrancara; la marca __jmdAnim se establecía antes de preparar los reveals. Un fallo posterior podía dejar contenido oculto. | No existe preocultación CSS; si main.js llega después del watchdog de 3 s se restaura la clase de mejora del menú. Cada entrada empieza al entrar en pantalla, desde opacidad parcial. Sin GSAP el contenido y los formularios siguen disponibles. |
| Importante, navegación | El cierre de foco del menú suponía que el botón de menú precedía al nav en el DOM, pero estaba después; Shift+Tab podía salir del circuito previsto. | Recorrido explícito en ambas direcciones, Escape, restauración del foco e inert en el contenido de fondo. Se libera al pasar a desktop. |
| Importante, contacto | Se interpretaba window.open(..., 'noopener') === null como bloqueo. Ese retorno también es normal cuando la pestaña sí se abre. | Enlace real con target=_blank y rel=noopener noreferrer, sin una segunda navegación en la pestaña del formulario. |
| Importante, datos | Los min/max de HTML no se validaban al usar novalidate. Se admitían una ida en el pasado y cifras escritas de pasajeros/bultos fuera del rango previsto. | Validación explícita de fecha de ida, orden de vuelta, adultos 1–20, niños 0–20 y bultos 1–50, con errores asociados al campo. |
| Importante, cálculo | Una dimensión negativa o incompleta podía mostrar error y aun así dejar activo Usar este peso si había peso real. | Error invalida la salida facturable y deshabilita la transferencia. Se conserva divisor 5000 y redondeo a 0,5 kg. |
| Importante, accesibilidad | Las pruebas del rediseño detectaron un título blanco sobre fondo claro y un fallo del circuito de teclado. | Ambos corregidos; axe no encontró violaciones WCAG A/AA en las dos anchuras comprobadas, también tras resolver las imágenes diferidas. |
| Rendimiento | Lenis mantenía un ticker de GSAP para suavizar la rueda; había loops del avión, pulsos, marquesina y cientos de animaciones de caracteres en el panel. | Scroll nativo; entradas finitas, ruta aérea una vez, ruta de paquete ligada al scroll. Panel explícitamente activable, una animación por fila, detenido fuera de pantalla o con pestaña oculta/reduce. No se carga Lenis; se conserva su archivo histórico. |
| Mantenimiento | Barcode generado, data-magnetic/data-spot, tilt y estilos de efectos que ya no aportaban al nuevo diseño. | Eliminadas sus referencias y lógica después de comprobar el uso. No se han borrado funcionalidades comerciales. |
| Recursos | El proxy de este entorno rechaza images.unsplash.com y Google Fonts con 403. No demuestra que esas URLs estén rotas en la web pública. | Dos fuentes de marca alojadas localmente con sus licencias; tres ilustraciones editoriales locales en WebP. Las fotos de destinos conservan autor, alt, fuente y licencia y tienen un estado alternativo legible. |
| SEO pendiente | SITE_URL, email y hours están vacíos en la configuración original; registry también. Canonical, og:url y sitemap absoluto no pueden completarse con un dominio inventado. | Datos sin modificar. El titular debe introducir los valores reales y ejecutar el build antes del lanzamiento definitivo. |

No se ha demostrado una vulnerabilidad de ejecución remota ni un fallo de hidratación; no hay una aplicación SSR que hidratar.

## Diagnóstico del comportamiento desktop/móvil

Prueba inicial con Chromium y la versión anterior:

| Vista | Movimiento | ScrollTriggers iniciales | Excepciones JS |
| --- | --- | ---: | ---: |
| 1920 × 1080 | Normal | 51 | 0 |
| 1366 × 768 | Normal | 51 | 0 |
| 768 × 1024 | Normal | 50 | 0 |
| 390 × 844 | Normal | 51 | 0 |
| 1920 × 1080 | Reducido | 0 | 0 |

La ruta aérea y el scroll se ejecutaban en desktop con movimiento normal. Por tanto, no se reproduce aquí una avería general de animaciones exclusiva de desktop. Sí se reproduce el defecto de cambio de preferencia: cargar en reduce y cambiar después a no-preference dejaba cero triggers. En el sentido inverso la variable REDUCE y los manejadores tampoco reaccionaban correctamente.

El fallo observado por el usuario en producción aún puede depender de la preferencia de accesibilidad de Windows/navegador, una versión antigua en caché, una extensión que bloquee scripts, rendimiento de GPU o una diferencia de versión desplegada. Estas son hipótesis, no causas confirmadas. No se recibió/validó la URL concreta de Vercel ni se ejecutaron Chrome, Opera o Safari reales. Chromium no equivale a certificar esos tres navegadores.

La corrección responde al defecto demostrado y endurece los estados de fallo; no intenta forzar animaciones para usuarios que han elegido reducirlas. Ya se comprueba la transición normal → reduce → normal y reduce inicial → normal.

## Dirección visual y uso real de skills

Principal: design-taste-frontend v2. Se ejecutó draw.mjs con seed 414, sector hospitality, tono editorial, conservando palette/type. Se eligió uneven-photographs: superficies abiertas, imágenes de distinto tamaño, jerarquía de dos tipografías, titular breve y ritmos distintos entre secciones. Concepto: la conexión real de la oficina de Alcalá 414 con los viajeros y los envíos Madrid–Lima se convierte en un recorrido desde la ilusión de viajar hasta la conversación con una persona. El elemento interactivo útil es la preparación real de la consulta (destino/fechas/equipaje), más la calculadora de envíos.

Redesign-existing-projects guió la conservación del stack, los IDs de navegación, los datos y los cuatro formularios. High-end-visual-design aportó contraste tipográfico, espaciado y feedback táctil; gpt-taste aportó claridad de jerarquía, CTA, alineación y adaptación móvil. No se trasladaron React/Tailwind, bento obligatorio, glassmorphism, cifras inventadas ni simulaciones de ejecución de Python de esas guías: contradecían el stack o el encargo.

Adaptaciones deliberadas al blueprint: no hay retratos propios de la oficina/equipo, así que no se simulan; la segunda pieza del Hero es una ruta funcional en lugar de una supuesta fotografía del negocio. No se fija una sección durante varios viewports ni se añaden loops para alcanzar una cuota de movimiento. No se usó image-to-code: no existía una referencia visual de interfaz que copiar. La generación de imágenes se usó solo como material editorial, no para generar un diseño y afirmar que se ha copiado.

Cambios visibles: Hero con titular en dos líneas y CTA visible; ruta Madrid–Lima legible; panel de destinos limpio con animación optativa y advertencia de que no es un horario; especialidades en dos escalas; formularios comunes; galería de los 12 destinos; pasos de paquetería y calculadora; servicios sin huecos de grid; lema sin largo pin; oficina, FAQ, contacto, footer y páginas legales con el mismo sistema. El ratón de scroll eliminado anteriormente no vuelve a aparecer.

Imágenes: journey-editorial.webp (vuelo imaginado), parcel-editorial.webp (paquete y bolsa), coast-editorial.webp (costa imaginada), generadas con IA, optimizadas a WebP y declaradas en CREDITS.md y en el footer. No son fotografías de clientes, oficina, proveedores o destinos contratables. Las fuentes variables Latin son Bricolage Grotesque y DM Sans, con licencia SIL OFL incluida en assets/fonts/.

## Pruebas y límites

- npm run build: seis páginas generadas y comprobaciones propias correctas.
- npm run check: validaciones de referencias, alt/dimensiones, contacto, labels, IDs, JSON-LD y sintaxis JS.
- Suite scripts/qa_browser.py: 12 pruebas, con subcasos de las cuatro resoluciones pedidas y todos los casos completados, sin omisiones en la ejecución con AXE_PATH. Formularios, mensajes interceptados, fechas/cantidades, calculadora, preferencia de movimiento y limpieza, menú con teclado, FAQ, seis páginas, anclas, bloqueo de vendors, noscript, panel opt-in, mapa diferido y recuperación del menú si main.js tarda más de 3 s.
- Los mensajes de WhatsApp se capturan en el navegador: no se envía ningún mensaje ni se contacta a una persona.
- El mapa se prueba con una respuesta simulada: se verifica que no existe iframe antes de pulsar y que el destino/título son correctos. No se valida el servicio externo real de Google Maps.
- axe-core 4.10.3: ninguna violación detectada de las etiquetas WCAG 2 A/AA y 2.1 AA en 1366 y 390 px. Esto no sustituye una revisión manual con lector de pantalla.
- Sin excepciones JavaScript en los recorridos probados. Sin desbordamiento horizontal en 1920, 1366, 768 y 390 px. Contenido visible si GSAP no carga; formularios desactivados y vías directas de contacto si JavaScript está deshabilitado.
- No existe typecheck de TypeScript ni linter de proyecto: no se presentan como pruebas ejecutadas. La prueba opcional de navegador no añade dependencias de producción.
- Se inspeccionaron capturas de las secciones y de las cuatro anchuras, antes/después. El inspector de la skill también produjo capturas y medidas a 1440/768/390. Su resultado estético es independiente del build y de axe.
- Lint de diseño: resultado 2 FAIL y 2 WARN. Dos FAIL por los scrims neutros sobre imágenes (excepción admitida por la propia guía), dos WARN por borde de control y uso de guiones en comentarios. No se ha desactivado el linter ni ocultado sus resultados.
- Inspector visual de la skill: resultado 3 FAIL y 2 WARN. Quedan avisos heurísticos sobre metadatos de rutas interpretados como eyebrows, tarjetas de destinos interpretadas como icon-cards y texto al pasar bajo la cabecera sticky. También avisa de escala tipográfica y ausencia de vídeo. Son decisiones documentadas, no una afirmación de cero FAIL ni una certificación de calidad. La cabecera respeta el offset de las anclas; el desplazamiento ordinario de texto bajo una cabecera sticky no demuestra por sí solo que un botón esté tapado.
- No se ha ejecutado Lighthouse de producción ni medido Core Web Vitals de usuarios reales, FPS sostenido o condiciones de red de Vercel. Las capturas locales tienen fotos remotas bloqueadas: no representan una comprobación de todas las fotografías públicas.

La revisión visual aún gana con fotografías reales de la oficina y del equipo, y con revisar las fotos de destinos en una conexión autorizada. No se asignan puntuaciones Awwwards ni se promete rendimiento sin medirlo.

## Cómo revisar sin publicar

1. Revisar git diff y los archivos fuente; no editar los HTML generados a mano.
2. Con Node 22, ejecutar npm run build y npm run check. No se necesita npm install.
3. Servir public/ con python -m http.server 8000 --directory public y abrir esa versión local en el navegador. También se puede usar un servidor estático equivalente. Recargar sin caché después de cambiar CSS/JS.
4. Revisar las cuatro resoluciones y los flujos; probar la opción del sistema de reducir animaciones antes y después de cargar.
5. Para QA automatizado, usar Playwright para Python y Chromium en un entorno de pruebas. Arrancar el servidor en 8001 y ejecutar python scripts/qa_browser.py. CHROMIUM_PATH permite un ejecutable ya instalado; AXE_PATH activa el caso de axe. Los artefactos van a /tmp/jmd-browser-qa o a JMD_QA_ARTIFACTS, no al checkout. El lanzador temporal de este contenedor usa --no-sandbox porque el sandbox SUID de Chromium no está configurado; no se necesita trasladar ese ajuste a un PC normal.
6. No hay push automático. Crear una rama/PR y un despliegue de Preview solo tras la autorización correspondiente. Revisar el Preview en Chrome, Opera y Safari/iOS y contrastar los datos comerciales antes de desplegar producción.
7. En Vercel mantener build npm run build y salida public, como ya describe el repositorio. No se han alterado sus ajustes. El éxito del build local no confirma los ajustes privados del proyecto de Vercel.

Para contrastar el fallo de desktop: abrir DevTools, revisar errores de consola y respuestas de gsap.min.js/ScrollTrigger.min.js/main.js; comprobar matchMedia('(prefers-reduced-motion: reduce)').matches, limpiar caché, probar sin extensiones y registrar navegador, versión y URL exacta. La preferencia reduce debe dejar todo legible y estático; normal debe mostrar entradas puntuales, no un avión moviéndose indefinidamente.
