/*
 * JMD Travesías por el Mundo — interacción y animaciones.
 * Mejora progresiva: todo el contenido es visible y los formularios son usables
 * aunque GSAP no cargue. Se respeta prefers-reduced-motion.
 */
(function () {
  "use strict";

  var CFG = window.JMD_CONFIG || {};
  var PHONE = (CFG.phone && CFG.phone.whatsapp) || "34687111168";
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var REDUCE = mqReduce.matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);

  mqReduce.addEventListener("change", function (event) {
    REDUCE = event.matches;
    if (REDUCE) document.getAnimations().forEach(function (animation) { animation.cancel(); });
  });

  /* ------------------------------------------------------------------ utilidades */
  function waUrl(text) {
    return "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(text);
  }
  function openWA(text) {
    var url = waUrl(text);
    // noopener may return null even when the new tab opens successfully.
    // A real link avoids opening WhatsApp twice or navigating away from the form.
    var link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  var toastEl = $("[data-toast]");
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-show"); }, 3200);
  }
  function fmtDate(v) {
    if (!v) return "";
    var p = v.split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : v;
  }
  function num(v) {
    var n = parseFloat(String(v).replace(",", "."));
    return isFinite(n) ? n : NaN;
  }
  function fmtKg(n) {
    return n.toLocaleString("es-ES", { minimumFractionDigits: n % 1 ? 1 : 0, maximumFractionDigits: 2 });
  }
  function scrollToEl(el, offset) {
    var y = el.getBoundingClientRect().top + window.scrollY - (offset || 90);
    window.scrollTo({ top: y, behavior: REDUCE ? "instant" : "smooth" });
  }

  /* Validación accesible */
  function setError(input, msg) {
    var err = document.getElementById(input.id + "-err");
    if (msg) {
      input.setAttribute("aria-invalid", "true");
      if (err) {
        err.textContent = msg;
        var descriptions = (input.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
        if (descriptions.indexOf(err.id) === -1) descriptions.push(err.id);
        input.setAttribute("aria-describedby", descriptions.join(" "));
      }
    } else {
      input.removeAttribute("aria-invalid");
      if (err) {
        err.textContent = "";
        var remaining = (input.getAttribute("aria-describedby") || "").split(/\s+/).filter(function (id) { return id && id !== err.id; });
        if (remaining.length) input.setAttribute("aria-describedby", remaining.join(" ")); else input.removeAttribute("aria-describedby");
      }
    }
    return !msg;
  }
  function focusFirstInvalid(form) {
    var bad = $("[aria-invalid='true']", form);
    if (bad) bad.focus();
  }

  /* Enlaces de WhatsApp: se regeneran desde config por si cambia el número */
  $$("[data-wa]").forEach(function (a) {
    var key = a.getAttribute("data-wa");
    var msg = (CFG.messages && CFG.messages[key]) || (CFG.messages && CFG.messages.generic) || "Hola JMD Travesías";
    a.href = waUrl(msg);
  });
  $$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ------------------------------------------------------------------ cabecera, progreso, menú */
  var header = $("[data-header]");
  var bar = $(".progress__bar");
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
      }
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var burger = $("[data-burger]");
  var menu = $("[data-menu]");
  if (burger && menu) {
    var closeMenu = function (focusBack) {
      menu.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      $(".sr-only", burger).textContent = "Abrir menú";
      document.body.classList.remove("menu-open");
      $$("[data-menu-inert]").forEach(function (el) { el.inert = false; el.removeAttribute("data-menu-inert"); });
      if (focusBack) burger.focus();
    };
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") !== "true";
      if (!open) return closeMenu(false);
      menu.classList.add("is-open");
      burger.setAttribute("aria-expanded", "true");
      $(".sr-only", burger).textContent = "Cerrar menú";
      document.body.classList.add("menu-open");
      $$("main, footer, .topbar, .fab-wa").forEach(function (el) { if (!el.inert) { el.inert = true; el.setAttribute("data-menu-inert", ""); } });
      var first = $(".nav__link", menu);
      if (first) first.focus();
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) closeMenu(true);
      // Mantener el foco dentro del menú abierto (móvil)
      if (e.key === "Tab" && menu.classList.contains("is-open")) {
        var items = [burger].concat($$("a, button", menu));
        var idx = items.indexOf(document.activeElement);
        e.preventDefault();
        var next = idx < 0 ? 0 : (idx + (e.shiftKey ? -1 : 1) + items.length) % items.length;
        items[next].focus();
      }
    });
    window.matchMedia("(min-width: 1200px)").addEventListener("change", function (m) { if (m.matches) closeMenu(false); });
  }

  /* Enlace activo del menú según la sección visible */
  if ("IntersectionObserver" in window) {
    var links = $$(".nav__link[href^='#']");
    var map = {};
    links.forEach(function (l) { map[l.getAttribute("href").slice(1)] = l; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          links.forEach(function (l) { l.classList.remove("is-active"); l.removeAttribute("aria-current"); });
          map[en.target.id].classList.add("is-active");
          map[en.target.id].setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* Native anchor scrolling respects the current motion preference. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href^='#']");
    if (!a || a.hasAttribute("data-quote")) return;
    var id = a.getAttribute("href").slice(1);
    var target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    scrollToEl(target, (header ? header.offsetHeight : 70) + 8);
    history.pushState(null, "", "#" + id);
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });

  /* Destination board: one cell animation, explicitly enabled, visible and motion-safe. */
  (function board() {
    var boardEl = $("[data-board]");
    if (!boardEl || !CFG.destinations) return;
    var rows = $$(".board__row", boardEl);
    var toggle = $("[data-board-toggle]", boardEl);
    var clock = $("[data-clock]", boardEl);
    var dests = CFG.destinations;
    var index = 6;
    var timer = null;
    var paused = true;
    var visible = false;
    function tick() {
      var d = dests[index % dests.length];
      var row = rows[index % rows.length];
      index++;
      var cells = $$(".board__cell", row);
      cells[0].textContent = d.iata;
      cells[1].textContent = d.city;
      cells[3].textContent = "Consultar";
      if (!REDUCE && row.animate) row.animate([{ opacity: .45, transform: "translateY(5px)" }, { opacity: 1, transform: "none" }], { duration: 350, easing: "ease-out" });
    }
    function sync() {
      clearInterval(timer);
      timer = null;
      if (!paused && visible && !REDUCE && !document.hidden) timer = setInterval(tick, 3500);
      if (toggle) {
        toggle.disabled = REDUCE;
        toggle.setAttribute("aria-pressed", String(!paused && !REDUCE));
        toggle.textContent = REDUCE ? "Movimiento reducido" : paused ? "Animar destinos" : "Pausar destinos";
      }
      if (clock) clock.textContent = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" }).format(new Date()) + " · Madrid";
    }
    if (toggle) toggle.addEventListener("click", function () { paused = !paused; sync(); });
    var observer;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; sync(); });
      observer.observe(boardEl);
    } else visible = true;
    document.addEventListener("visibilitychange", sync);
    mqReduce.addEventListener("change", function () { if (mqReduce.matches) paused = true; sync(); });
    window.addEventListener("pagehide", function () { clearInterval(timer); timer = null; if (observer) observer.disconnect(); });
    window.addEventListener("pageshow", function (e) { if (e.persisted && observer) observer.observe(boardEl); sync(); });
    sync();
  })();

  /* ------------------------------------------------------------------ cotizador de vuelos */
  (function flight() {
    var form = $("#flight-form");
    if (!form) return;
    var dest = $("#f-dest", form);
    var other = $("[data-other]", form);
    var otherInput = $("#f-dest-other", form);
    var ret = $("[data-return]", form);
    var retInput = $("#f-return", form);
    var depart = $("#f-depart", form);
    var today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    var iso = today.toISOString().slice(0, 10);
    depart.min = iso;
    retInput.min = iso;

    function syncTrip() {
      var oneWay = form.trip.value === "solo ida";
      ret.hidden = oneWay;
      if (oneWay) setError(retInput, "");
    }
    function syncOther() {
      other.hidden = dest.value !== "otro";
    }
    $$("input[name='trip']", form).forEach(function (r) { r.addEventListener("change", syncTrip); });
    dest.addEventListener("change", function () { syncOther(); setError(dest, ""); });
    depart.addEventListener("change", function () { retInput.min = depart.value || iso; });
    syncTrip();
    syncOther();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      var origin = $("#f-origin", form);
      var name = $("#f-name", form);
      ok = setError(origin, origin.value.trim() ? "" : "Indica la ciudad de origen.") && ok;
      ok = setError(dest, dest.value ? "" : "Elige un destino.") && ok;
      if (dest.value === "otro") ok = setError(otherInput, otherInput.value.trim() ? "" : "Escribe el destino.") && ok;
      ok = setError(depart, !depart.value ? "Elige la fecha de ida." : depart.value < iso ? "La ida no puede ser anterior a hoy." : "") && ok;
      var oneWay = form.trip.value === "solo ida";
      if (!oneWay) {
        var msg = !retInput.value ? "Elige la fecha de vuelta." : (retInput.value < depart.value ? "La vuelta debe ser posterior a la ida." : "");
        ok = setError(retInput, msg) && ok;
      }
      ok = setError(name, name.value.trim().length >= 2 ? "" : "Escribe tu nombre.") && ok;
      var adultsInput = $("#f-adults", form), kidsInput = $("#f-kids", form);
      function validCount(input, min, max) { var value = Number(input.value); return input.value !== "" && Number.isInteger(value) && value >= min && value <= max; }
      ok = setError(adultsInput, validCount(adultsInput, 1, 20) ? "" : "Indica entre 1 y 20 adultos.") && ok;
      ok = setError(kidsInput, validCount(kidsInput, 0, 20) ? "" : "Indica entre 0 y 20 niños.") && ok;
      if (!ok) { focusFirstInvalid(form); return; }

      var destName = dest.value === "otro"
        ? otherInput.value.trim()
        : dest.options[dest.selectedIndex].text;
      var adults = Math.max(1, parseInt($("#f-adults", form).value, 10) || 1);
      var kids = Math.max(0, parseInt($("#f-kids", form).value, 10) || 0);
      var lines = [
        CFG.messages ? CFG.messages.flight : "Hola JMD Travesías, quiero precio de un vuelo con 2 maletas de 23 kg:",
        "",
        "• Tipo: " + (oneWay ? "Solo ida" : "Ida y vuelta"),
        "• Origen: " + origin.value.trim(),
        "• Destino: " + destName,
        "• Ida: " + fmtDate(depart.value)
      ];
      if (!oneWay) lines.push("• Vuelta: " + fmtDate(retInput.value));
      lines.push("• Pasajeros: " + adults + (adults === 1 ? " adulto" : " adultos") + (kids ? ", " + kids + (kids === 1 ? " niño" : " niños") : ""));
      lines.push("• Equipaje: 2 maletas de 23 kg (2PC)");
      lines.push("• Nombre: " + name.value.trim());
      openWA(lines.join("\n"));
      toast("Abriendo WhatsApp con tu consulta…");
    });

    // Botones "Pedir precio" de las tarjetas de destino
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-quote]");
      if (!b) return;
      e.preventDefault();
      var id = b.getAttribute("data-quote");
      dest.value = id;
      syncOther();
      setError(dest, "");
      scrollToEl(form, (header ? header.offsetHeight : 70) + 16);
      setTimeout(function () { (id === "otro" ? otherInput : depart).focus({ preventScroll: true }); }, REDUCE ? 50 : 1100);
    });
  })();

  /* Steppers (+/−) */
  $$(".stepper").forEach(function (st) {
    var input = $("input", st);
    $$("[data-step]", st).forEach(function (b) {
      b.addEventListener("click", function () {
        var v = (parseInt(input.value, 10) || 0) + parseInt(b.getAttribute("data-step"), 10);
        var min = parseInt(input.min, 10), max = parseInt(input.max, 10);
        if (!isNaN(min)) v = Math.max(min, v);
        if (!isNaN(max)) v = Math.min(max, v);
        input.value = v;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
  });

  /* ------------------------------------------------------------------ calculadora volumétrica */
  var billable = 0;
  (function calc() {
    var form = $("#calc-form");
    if (!form) return;
    var err = $("#calc-err", form);
    var out = { real: $("[data-out='real']", form), vol: $("[data-out='vol']", form), bill: $("[data-out='bill']", form) };
    var useBtn = $("[data-calc-use]", form);
    function compute() {
      var l = num(form.l.value), w = num(form.w.value), h = num(form.h.value), kg = num(form.kg.value);
      var dimsOk = l > 0 && w > 0 && h > 0;
      var anyDims = form.l.value || form.w.value || form.h.value;
      err.textContent = "";
      if ([l, w, h, kg].some(function (v) { return v < 0; })) err.textContent = "Los valores no pueden ser negativos.";
      var vol = dimsOk ? (l * w * h) / 5000 : NaN;
      out.real.textContent = kg > 0 ? fmtKg(kg) : "—";
      out.vol.textContent = dimsOk ? fmtKg(Math.round(vol * 100) / 100) : "—";
      var base = Math.max(kg > 0 ? kg : 0, dimsOk ? vol : 0);
      var ready = (kg > 0 || dimsOk) && !(anyDims && !dimsOk) && ![l, w, h, kg].some(function (v) { return v < 0; });
      if (anyDims && !dimsOk && !err.textContent) err.textContent = "Completa largo, ancho y alto para calcular el volumétrico.";
      billable = ready && isFinite(base) ? Math.ceil(base * 2) / 2 : 0;
      var prev = out.bill.textContent;
      out.bill.textContent = billable > 0 ? fmtKg(billable) : "—";
      if (prev !== out.bill.textContent && !REDUCE && out.bill.animate) out.bill.animate([{ opacity: .5 }, { opacity: 1 }], { duration: 220 });
      useBtn.disabled = !(billable > 0);
    }
    form.addEventListener("input", compute);
    form.addEventListener("submit", function (e) { e.preventDefault(); compute(); });
    useBtn.addEventListener("click", function () {
      var pf = $("#parcel-form");
      if (!pf || !(billable > 0)) return;
      var kgInput = $("#p-kg", pf);
      kgInput.value = billable;
      setError(kgInput, "");
      scrollToEl(pf, (header ? header.offsetHeight : 70) + 16);
      toast("Peso a facturar (" + fmtKg(billable) + " kg) añadido al cotizador");
      setTimeout(function () { $("#p-name", pf).focus({ preventScroll: true }); }, REDUCE ? 50 : 900);
    });
    compute();
  })();

  /* ------------------------------------------------------------------ cotizador de paquetería */
  (function parcel() {
    var form = $("#parcel-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#p-name", form), kg = $("#p-kg", form), district = $("#p-district", form), content = $("#p-content", form);
      var ok = true;
      ok = setError(name, name.value.trim().length >= 2 ? "" : "Escribe el nombre del remitente.") && ok;
      ok = setError(kg, num(kg.value) >= 0.5 && Number.isInteger(num(kg.value) * 2) ? "" : "Indica un peso desde 0,5 kg, en incrementos de 0,5 kg.") && ok;
      ok = setError(district, district.value ? "" : "Elige el distrito de entrega.") && ok;
      ok = setError(content, content.value.trim().length >= 3 ? "" : "Describe brevemente el contenido.") && ok;
      var pcsInput = $("#p-pcs", form);
      var pcsValue = Number(pcsInput.value);
      ok = setError(pcsInput, pcsInput.value !== "" && Number.isInteger(pcsValue) && pcsValue >= 1 && pcsValue <= 50 ? "" : "Indica entre 1 y 50 bultos.") && ok;
      if (!ok) { focusFirstInvalid(form); return; }
      var pcs = Number($("#p-pcs", form).value);
      var lines = [
        CFG.messages ? CFG.messages.parcel : "Hola JMD Travesías, quiero precio para un envío de paquetería Madrid → Lima:",
        "",
        "• Remitente: " + name.value.trim(),
        "• Peso: " + fmtKg(num(kg.value)) + " kg",
        "• Bultos: " + pcs,
        "• Distrito de entrega (Lima): " + (district.value === "otro" ? "Otro (ver contenido)" : district.value),
        "• Contenido: " + content.value.trim()
      ];
      openWA(lines.join("\n"));
      toast("Abriendo WhatsApp con tu envío…");
    });
  })();

  /* ------------------------------------------------------------------ formulario de contacto */
  (function contact() {
    var form = $("#contact-form");
    if (!form) return;
    var via = "wa";
    $$("[data-send]", form).forEach(function (b) {
      b.addEventListener("click", function () { via = b.getAttribute("data-send"); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#k-name", form), phone = $("#k-phone", form), email = $("#k-email", form), msg = $("#k-msg", form), rgpd = $("#k-rgpd", form);
      var ok = true;
      var digits = phone.value.replace(/[^\d]/g, "");
      ok = setError(name, name.value.trim().length >= 2 ? "" : "Escribe tu nombre.") && ok;
      ok = setError(phone, digits.length >= 9 && digits.length <= 15 ? "" : "Escribe un teléfono válido (mínimo 9 dígitos).") && ok;
      ok = setError(email, !email.value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) ? "" : "Revisa el formato del email.") && ok;
      ok = setError(msg, msg.value.trim().length >= 10 ? "" : "Cuéntanos un poco más (mínimo 10 caracteres).") && ok;
      ok = setError(rgpd, rgpd.checked ? "" : "Debes aceptar la política de privacidad para continuar.") && ok;
      if (!ok) { focusFirstInvalid(form); return; }
      var topic = $("#k-topic", form).value;
      var lines = [
        (CFG.messages && CFG.messages.contact) || "Hola JMD Travesías, os escribo desde la web:",
        "",
        "• Nombre: " + name.value.trim(),
        "• Teléfono: " + phone.value.trim()
      ];
      if (email.value.trim()) lines.push("• Email: " + email.value.trim());
      lines.push("• Motivo: " + topic, "", msg.value.trim());
      var body = lines.join("\n");
      if (via === "mail" && CFG.email) {
        window.location.href = "mailto:" + CFG.email + "?subject=" + encodeURIComponent("Consulta web: " + topic) + "&body=" + encodeURIComponent(body);
        toast("Abriendo tu programa de correo…");
      } else {
        openWA(body);
        toast("Abriendo WhatsApp con tu mensaje…");
      }
    });
    $$("input, textarea, select", form).forEach(function (el) {
      el.addEventListener("input", function () { if (el.getAttribute("aria-invalid") === "true") setError(el, ""); });
      el.addEventListener("change", function () { if (el.getAttribute("aria-invalid") === "true") setError(el, ""); });
    });
  })();

  // Limpia errores al corregir en todos los formularios
  $$("#flight-form, #parcel-form").forEach(function (form) {
    $$("input, textarea, select", form).forEach(function (el) {
      el.addEventListener("input", function () { if (el.getAttribute("aria-invalid") === "true") setError(el, ""); });
    });
  });

  /* ------------------------------------------------------------------ oficina: copiar teléfono y mapa diferido */
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var originalLabel = $("span", btn).textContent;
      var done = function () {
        btn.classList.add("is-done");
        $("span", btn).textContent = "Copiado";
        toast("Teléfono copiado: " + text);
        setTimeout(function () { btn.classList.remove("is-done"); $("span", btn).textContent = originalLabel; }, 2200);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else fallback();
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { if (document.execCommand("copy")) done(); else toast("Copia manualmente: " + text); } catch (err) { toast("Copia manualmente: " + text); }
        ta.remove();
      }
    });
  });
  var mapBtn = $("[data-map-load]");
  if (mapBtn && CFG.address) {
    mapBtn.addEventListener("click", function () {
      var box = $("[data-map]");
      var ifr = document.createElement("iframe");
      ifr.src = CFG.address.mapsEmbed;
      ifr.title = "Mapa: " + CFG.address.full;
      ifr.loading = "lazy";
      ifr.referrerPolicy = "no-referrer-when-downgrade";
      box.appendChild(ifr);
      var ov = $(".map__overlay", box);
      if (ov) ov.remove();
      ifr.focus();
    });
  }

  /* Native details remain keyboard-operable; opacity-only feedback cannot race open/close. */
  $$(".acc").forEach(function (details) {
    var body = $(".acc__body", details);
    var animation;
    details.addEventListener("toggle", function () {
      if (animation) animation.cancel();
      if (details.open) {
        $$(".acc[open]").forEach(function (other) { if (other !== details) other.open = false; });
        if (!REDUCE && body.animate) animation = body.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 220 });
      }
    });
  });

  /* Motion is enhancement only. No CSS hidden state, no wheel hijack, no idle-callback race.
     matchMedia reverts every GSAP style/trigger when the OS/browser preference changes. */
  var motionMedia = null;
  function initMotion() {
    window.__jmdAnim = true;
    if (!hasGSAP) return;
    gsap.registerPlugin(ScrollTrigger);
    motionMedia = gsap.matchMedia();
    motionMedia.add("(prefers-reduced-motion: no-preference)", function () {
      var cleanup = [];
      var hero = $(".hero");
      if (hero) {
        var intro = gsap.timeline({ defaults: { ease: "power3.out", duration: .85 } });
        intro.fromTo("[data-hero='title']", { y: 24, opacity: .25 }, { y: 0, opacity: 1, clearProps: "transform,opacity" }, 0)
          .fromTo("[data-hero='fade']", { y: 18, opacity: .35 }, { y: 0, opacity: 1, stagger: .1, clearProps: "transform,opacity" }, .12)
          .fromTo("[data-hero='visual']", { y: 20, opacity: .35 }, { y: 0, opacity: 1, clearProps: "transform,opacity" }, .2);
        var path = $("#routePath");
        var plane = $("[data-plane]");
        if (path && plane) {
          var length = path.getTotalLength();
          var position = { p: 0 };
          function place() {
            var point = path.getPointAtLength(position.p * length);
            var next = path.getPointAtLength(Math.min(length, position.p * length + 1));
            var angle = Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI + 90;
            plane.style.transform = "translate(" + point.x + "px," + point.y + "px) rotate(" + angle + "deg)";
            path.style.strokeDasharray = length;
            path.style.strokeDashoffset = length * (1 - position.p);
          }
          intro.to(position, { p: .995, duration: 1.8, ease: "power2.inOut", onUpdate: place }, .4);
          cleanup.push(function () { plane.style.transform = ""; path.style.strokeDasharray = ""; path.style.strokeDashoffset = ""; });
        }
      }
      $$("[data-reveal]").forEach(function (element) {
        var played = false;
        ScrollTrigger.create({
          trigger: element, start: "top 94%", once: true,
          onEnter: function () {
            if (played) return;
            played = true;
            // Already visible before an entrance: a failed script can never strand it at opacity 0.
            gsap.fromTo(element, { y: element.classList.contains("bp") ? 18 : 24, opacity: .3 }, { y: 0, opacity: 1, duration: .7, ease: "power3.out", clearProps: "transform,opacity" });
          }
        });
      });
      $$("[data-count]").forEach(function (element) {
        var end = Number(element.getAttribute("data-count"));
        var value = { n: 0 };
        ScrollTrigger.create({ trigger: element, start: "top 92%", once: true, onEnter: function () {
          gsap.to(value, { n: end, duration: 1, ease: "power2.out", onUpdate: function () { element.textContent = String(Math.round(value.n)); }, onComplete: function () { element.textContent = String(end); } });
        } });
        cleanup.push(function () { element.textContent = String(end); });
      });
      var parcelPath = $("#parcelPath");
      var box = $("[data-parcel-box]");
      if (parcelPath && box) {
        var svg = parcelPath.ownerSVGElement;
        var parcelLength = parcelPath.getTotalLength();
        var state = { p: 0 };
        function placeBox() {
          if (!box.offsetParent) return;
          var point = parcelPath.getPointAtLength(state.p * parcelLength);
          var rect = svg.getBoundingClientRect();
          var parent = box.offsetParent.getBoundingClientRect();
          var viewBox = svg.viewBox.baseVal;
          box.style.transform = "translate(" + (rect.left - parent.left + point.x * rect.width / viewBox.width) + "px," + (rect.top - parent.top + point.y * rect.height / viewBox.height) + "px)";
          parcelPath.style.strokeDasharray = parcelLength;
          parcelPath.style.strokeDashoffset = parcelLength * (1 - state.p);
        }
        gsap.to(state, { p: 1, ease: "none", onUpdate: placeBox, scrollTrigger: { trigger: ".parcel-route", start: "top 85%", end: "bottom 45%", scrub: .5, onRefresh: placeBox } });
        cleanup.push(function () { box.style.transform = ""; parcelPath.style.strokeDasharray = ""; parcelPath.style.strokeDashoffset = ""; });
      }
      // Local images and fonts can change geometry after the initial parse.
      var refresh = function () { ScrollTrigger.refresh(); };
      window.addEventListener("load", refresh, { once: true });
      if (document.fonts) document.fonts.ready.then(function () { if (!mqReduce.matches && motionMedia) refresh(); });
      refresh();
      return function () { window.removeEventListener("load", refresh); cleanup.forEach(function (fn) { fn(); }); };
    });
  }
  try { initMotion(); }
  catch (error) {
    if (motionMedia) motionMedia.revert();
    console.warn("JMD: el contenido sigue disponible sin animaciones.", error);
  }
  window.addEventListener("pagehide", function () { if (motionMedia) { motionMedia.revert(); motionMedia = null; } });
  window.addEventListener("pageshow", function (event) { if (event.persisted && !motionMedia) initMotion(); });
  $$("[data-form-fields], [data-requires-js]").forEach(function (element) { element.disabled = false; });
  document.documentElement.classList.add("js");
  window.__jmdMain = true;
})();
