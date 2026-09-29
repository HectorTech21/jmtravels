/*
 * JMD Travesías por el Mundo — interacción y animaciones.
 * Mejora progresiva: todo el contenido es visible y los formularios son usables
 * aunque GSAP/Lenis no carguen. Se respeta prefers-reduced-motion.
 */
(function () {
  "use strict";

  var CFG = window.JMD_CONFIG || {};
  var PHONE = (CFG.phone && CFG.phone.whatsapp) || "34687111168";
  var root = document.documentElement;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var REDUCE = mqReduce.matches;
  var FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var lenis = null;

  /* ------------------------------------------------------------------ utilidades */
  function waUrl(text) {
    return "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(text);
  }
  function openWA(text) {
    var url = waUrl(text);
    var w = window.open(url, "_blank", "noopener");
    if (!w) window.location.href = url;
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
    if (lenis) lenis.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: REDUCE ? "auto" : "smooth" });
  }

  /* Validación accesible */
  function setError(input, msg) {
    var err = document.getElementById(input.id + "-err");
    if (msg) {
      input.setAttribute("aria-invalid", "true");
      if (err) { err.textContent = msg; input.setAttribute("aria-describedby", err.id); }
    } else {
      input.removeAttribute("aria-invalid");
      if (err) err.textContent = "";
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
      if (header) header.classList.toggle("is-compact", y > 40);
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
    $$(".nav__list li", menu).forEach(function (li, i) { li.style.setProperty("--i", i); });
    var closeMenu = function (focusBack) {
      menu.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      $(".sr-only", burger).textContent = "Abrir menú";
      document.body.classList.remove("menu-open");
      if (lenis) lenis.start();
      if (focusBack) burger.focus();
    };
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") !== "true";
      if (!open) return closeMenu(false);
      menu.classList.add("is-open");
      burger.setAttribute("aria-expanded", "true");
      $(".sr-only", burger).textContent = "Cerrar menú";
      document.body.classList.add("menu-open");
      if (lenis) lenis.stop();
      var first = $(".nav__link", menu);
      if (first) setTimeout(function () { first.focus(); }, 50);
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
        if (e.shiftKey && idx <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && idx === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    window.matchMedia("(min-width: 1080px)").addEventListener("change", function (m) { if (m.matches) closeMenu(false); });
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

  /* Anclas internas con desplazamiento suave (Lenis si está activo) */
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

  /* ------------------------------------------------------------------ botones: magnético + ripple */
  $$(".btn").forEach(function (btn) {
    btn.addEventListener("pointerdown", function (e) {
      if (REDUCE) return;
      var r = btn.getBoundingClientRect();
      var s = Math.max(r.width, r.height) * 2.2;
      var span = document.createElement("span");
      span.className = "ripple";
      span.style.width = span.style.height = s + "px";
      span.style.left = e.clientX - r.left - s / 2 + "px";
      span.style.top = e.clientY - r.top - s / 2 + "px";
      btn.appendChild(span);
      setTimeout(function () { span.remove(); }, 700);
    });
  });
  if (FINE && !REDUCE && hasGSAP) {
    $$("[data-magnetic]").forEach(function (el) {
      var xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
      var yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.25);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener("pointerleave", function () { xTo(0); yTo(0); });
    });
  }

  /* ------------------------------------------------------------------ tarjetas: tilt 3D */
  if (FINE && !REDUCE) {
    $$("[data-tilt]").forEach(function (card) {
      var raf = 0;
      card.addEventListener("pointermove", function (e) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          card.classList.add("is-tilting");
          card.style.setProperty("--ry", (px * 12).toFixed(2) + "deg");
          card.style.setProperty("--rx", (-py * 10).toFixed(2) + "deg");
        });
      });
      card.addEventListener("pointerleave", function () {
        cancelAnimationFrame(raf);
        card.classList.remove("is-tilting");
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ------------------------------------------------------------------ panel de salidas (split-flap) */
  (function board() {
    var boardEl = $("[data-board]");
    if (!boardEl || !CFG.destinations) return;
    var rows = $$(".board__row", boardEl);
    var CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑ0123456789·";
    var toggle = $("[data-board-toggle]", boardEl);
    var clock = $("[data-clock]", boardEl);
    var dests = CFG.destinations;
    var STATUS = ["PIDE PRECIO", "CONSULTAR", "2 MALETAS"];

    function upper(s) { return s.toLocaleUpperCase("es-ES"); }
    function pad(s, n) { s = s.slice(0, n); while (s.length < n) s += " "; return s; }

    // Convierte cada celda en fichas individuales
    rows.forEach(function (row) {
      $$(".board__cell", row).forEach(function (cell) {
        var len = parseInt(cell.getAttribute("data-len"), 10) || cell.textContent.length;
        var txt = pad(cell.textContent.trim(), len);
        cell.textContent = "";
        for (var i = 0; i < len; i++) {
          var f = document.createElement("span");
          f.className = "flap" + (txt[i] === " " ? " flap--space" : "");
          f.textContent = txt[i];
          cell.appendChild(f);
        }
      });
    });

    function setCell(cell, text, animate) {
      var flaps = $$(".flap", cell);
      var target = pad(text, flaps.length);
      flaps.forEach(function (f, i) {
        var ch = target[i];
        if (f.textContent === ch) return;
        if (!animate || !hasGSAP) {
          f.textContent = ch;
          f.classList.toggle("flap--space", ch === " ");
          return;
        }
        var spins = 3 + Math.floor(Math.random() * 4);
        var tl = gsap.timeline({ delay: i * 0.035 });
        for (var s = 0; s <= spins; s++) {
          (function (last) {
            tl.to(f, { rotationX: -90, duration: 0.06, ease: "none" })
              .add(function () {
                var c = last ? ch : CHARS[Math.floor(Math.random() * CHARS.length)];
                f.textContent = c;
                f.classList.toggle("flap--space", c === " ");
              })
              .fromTo(f, { rotationX: 90 }, { rotationX: 0, duration: 0.06, ease: "none" });
          })(s === spins);
        }
      });
    }

    var queue = dests.slice(6).concat(dests.slice(0, 6));
    var rowIdx = 0;
    var timer = null;
    var paused = REDUCE;
    function tick() {
      var d = queue.shift();
      queue.push(d);
      var row = rows[rowIdx % rows.length];
      rowIdx++;
      var cells = $$(".board__cell", row);
      setCell(cells[0], d.iata, true);
      setCell(cells[1], upper(d.city), true);
      setCell(cells[3], STATUS[Math.floor(Math.random() * STATUS.length)], true);
    }
    function start() { if (!timer) timer = setInterval(tick, 2200); }
    function stop() { clearInterval(timer); timer = null; }

    if (toggle) {
      if (REDUCE) { toggle.textContent = "Animar panel"; toggle.setAttribute("aria-pressed", "true"); }
      toggle.addEventListener("click", function () {
        paused = !paused;
        toggle.setAttribute("aria-pressed", String(paused));
        toggle.textContent = paused ? "Animar panel" : "Pausar panel";
        if (paused) stop(); else if (visible) start();
      });
    }
    var visible = false;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible && !paused) start(); else stop();
      }).observe(boardEl);
    }
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else if (visible && !paused) start(); });

    // Reloj real de Madrid
    if (clock) {
      var fmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });
      var upd = function () { clock.textContent = "MADRID " + fmt.format(new Date()); };
      upd();
      setInterval(upd, 15000);
    }
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
      ok = setError(depart, depart.value ? "" : "Elige la fecha de ida.") && ok;
      var oneWay = form.trip.value === "solo ida";
      if (!oneWay) {
        var msg = !retInput.value ? "Elige la fecha de vuelta." : (retInput.value < depart.value ? "La vuelta debe ser posterior a la ida." : "");
        ok = setError(retInput, msg) && ok;
      }
      ok = setError(name, name.value.trim().length >= 2 ? "" : "Escribe tu nombre.") && ok;
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
      if (hasGSAP && !REDUCE) gsap.fromTo(form, { boxShadow: "0 0 0 0 rgba(255,200,61,.9)" }, { boxShadow: "0 0 0 14px rgba(255,200,61,0)", duration: 1.2, delay: 0.6, ease: "power2.out", clearProps: "boxShadow" });
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
      var ready = kg > 0 || dimsOk;
      if (anyDims && !dimsOk && !err.textContent) err.textContent = "Completa largo, ancho y alto para calcular el volumétrico.";
      billable = ready ? Math.ceil(base * 2) / 2 : 0;
      var prev = out.bill.textContent;
      out.bill.textContent = billable > 0 ? fmtKg(billable) : "—";
      if (prev !== out.bill.textContent && !REDUCE) {
        out.bill.parentElement.classList.remove("is-bump");
        void out.bill.parentElement.offsetWidth;
        out.bill.parentElement.classList.add("is-bump");
      }
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
      ok = setError(kg, num(kg.value) > 0 ? "" : "Indica el peso aproximado en kg.") && ok;
      ok = setError(district, district.value ? "" : "Elige el distrito de entrega.") && ok;
      ok = setError(content, content.value.trim().length >= 3 ? "" : "Describe brevemente el contenido.") && ok;
      if (!ok) { focusFirstInvalid(form); return; }
      var pcs = Math.max(1, parseInt($("#p-pcs", form).value, 10) || 1);
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
      var done = function () {
        btn.classList.add("is-done");
        $("span", btn).textContent = "¡Copiado!";
        toast("Teléfono copiado: " + text);
        setTimeout(function () { btn.classList.remove("is-done"); $("span", btn).textContent = "Copiar"; }, 2200);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else fallback();
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (err) { toast("Copia manualmente: " + text); }
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

  /* ------------------------------------------------------------------ FAQ: un solo panel abierto con animación suave */
  $$(".acc").forEach(function (d) {
    var summary = $("summary", d);
    var body = $(".acc__body", d);
    summary.addEventListener("click", function (e) {
      if (REDUCE || !body.animate) return;
      e.preventDefault();
      if (d.open) {
        var a = body.animate([{ height: body.offsetHeight + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 320, easing: "cubic-bezier(.22,1,.36,1)" });
        a.onfinish = function () { d.open = false; };
      } else {
        $$(".acc[open]").forEach(function (o) { if (o !== d) o.open = false; });
        d.open = true;
        var h = body.offsetHeight;
        body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" });
      }
    });
  });

  /* ------------------------------------------------------------------ ANIMACIONES (GSAP) */
  function markReady() { window.__jmdAnim = true; }

  if (!hasGSAP || REDUCE) {
    // Sin GSAP o con movimiento reducido: todo visible, sin animaciones de scroll.
    root.classList.remove("js");
    markReady();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  markReady();

  /* Lenis: scroll suave sincronizado con ScrollTrigger */
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  if (!$(".hero")) {
    // Páginas interiores: solo reveals genéricos
    initReveals();
    return;
  }

  /* Hero: entrada orquestada */
  var heroTl = gsap.timeline({ defaults: { ease: "expo.out" } });
  heroTl
    .fromTo(".hero__img", { scale: 1.18 }, { scale: 1, duration: 2.4, ease: "power3.out" }, 0)
    .fromTo(".hero__title .w", { yPercent: 110, rotate: 4, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, duration: 1.1, stagger: 0.07 }, 0.15)
    .fromTo("[data-hero='fade']", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.12 }, 0.55)
    .fromTo("[data-hero='route']", { y: 40, opacity: 0, rotateX: 18 }, { y: 0, opacity: 1, rotateX: 0, duration: 1.3 }, 0.5);

  /* Ruta MAD → LIM: trazo + avión siguiendo la curva */
  (function route() {
    var path = document.getElementById("routePath");
    var plane = $("[data-plane]");
    if (!path || !plane) return;
    var len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    var st = { p: 0 };
    function place() {
      var d = st.p * len;
      var pt = path.getPointAtLength(d);
      var pt2 = path.getPointAtLength(Math.min(len, d + 1));
      var ang = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI + 90;
      plane.style.transform = "translate(" + pt.x.toFixed(2) + "px," + pt.y.toFixed(2) + "px) rotate(" + ang.toFixed(1) + "deg)";
      path.style.strokeDashoffset = len * (1 - st.p);
    }
    place();
    heroTl.to(st, { p: 1, duration: 2.6, ease: "power2.inOut", onUpdate: place }, 0.9);
    // Vuelo de ida y vuelta suave mientras el hero está visible
    heroTl.add(function () {
      gsap.to(st, { p: 0.985, duration: 1.6, yoyo: true, repeat: -1, ease: "sine.inOut", onUpdate: place, scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", toggleActions: "play pause resume pause" } });
    });
  })();

  /* Parallax del fondo del hero */
  gsap.to("[data-parallax]", {
    yPercent: 14, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
  });
  gsap.to(".hero__grid", {
    y: -60, opacity: 0.3, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "40% top", end: "bottom top", scrub: true }
  });

  initReveals();

  /* Reveals al hacer scroll (por lotes, con stagger) */
  function initReveals() {
  if (!$("[data-reveal]")) return;
  gsap.set("[data-reveal]:not(.bp)", { y: 40, opacity: 0 });
  ScrollTrigger.batch("[data-reveal]:not(.bp)", {
    start: "top 88%",
    once: true,
    onEnter: function (els) {
      gsap.to(els, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.08, overwrite: true, clearProps: "transform" });
    }
  });
  // Tarjetas de embarque: entrada con giro
  if (!$(".bp[data-reveal]")) return;
  gsap.set(".bp[data-reveal]", { y: 40, opacity: 0, rotateX: -25, transformOrigin: "50% 0%" });
  ScrollTrigger.batch(".bp[data-reveal]", {
    start: "top 90%",
    once: true,
    onEnter: function (els) { gsap.to(els, { rotateX: 0, y: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.09, overwrite: true, clearProps: "transform" }); }
  });
  }

  /* Contadores (solo datos reales) */
  $$("[data-count]").forEach(function (el) {
    var end = parseInt(el.getAttribute("data-count"), 10);
    var o = { v: 0 };
    el.textContent = "0";
    ScrollTrigger.create({
      trigger: el, start: "top 90%", once: true,
      onEnter: function () {
        gsap.to(o, { v: end, duration: 1.6, ease: "power3.out", onUpdate: function () { el.textContent = String(Math.round(o.v)); } });
      }
    });
  });

  /* Ruta de paquetería: la caja viaja al hacer scroll */
  (function parcelRoute() {
    var path = document.getElementById("parcelPath");
    var box = $("[data-parcel-box]");
    var svg = path && path.ownerSVGElement;
    if (!path || !box || !svg) return;
    var mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", function () {
      var len = path.getTotalLength();
      path.style.strokeDasharray = len;
      var st = { p: 0 };
      function place() {
        var pt = path.getPointAtLength(st.p * len);
        var r = svg.getBoundingClientRect();
        var vb = svg.viewBox.baseVal;
        var parentR = box.offsetParent.getBoundingClientRect();
        var x = r.left - parentR.left + (pt.x / vb.width) * r.width;
        var y = r.top - parentR.top + (pt.y / vb.height) * r.height;
        box.style.transform = "translate(" + x + "px," + y + "px) rotate(" + (st.p * 360) + "deg)";
        path.style.strokeDashoffset = len * (1 - st.p);
      }
      place();
      var tw = gsap.to(st, {
        p: 1, ease: "none", onUpdate: place,
        scrollTrigger: { trigger: ".parcel-route", start: "top 80%", end: "bottom 40%", scrub: 0.8, onRefresh: place }
      });
      return function () { tw.kill(); box.style.transform = ""; path.style.strokeDasharray = ""; path.style.strokeDashoffset = ""; };
    });
  })();

  /* "No somos virtuales. Somos reales.": texto fijado y revelado con el scroll */
  (function real() {
    var sec = $("[data-real]");
    if (!sec) return;
    var words = $$(".rw", sec);
    var points = $$("[data-real-point]", sec);
    var mm = gsap.matchMedia();
    mm.add("(min-width: 768px) and (min-height: 600px)", function () {
      var tl = gsap.timeline({
        scrollTrigger: { trigger: sec, start: "top top", end: "+=140%", pin: ".real__pin", scrub: 0.6, anticipatePin: 1 }
      });
      tl.fromTo(".real__img", { scale: 1.25 }, { scale: 1, ease: "none", duration: 3 }, 0)
        .fromTo(words, { opacity: 0.12, yPercent: 30 }, { opacity: 1, yPercent: 0, stagger: 0.35, ease: "power2.out", duration: 0.8 }, 0)
        .fromTo(points, { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.2, duration: 0.6 }, 1.6);
    });
    mm.add("(max-width: 767px), (max-height: 599px)", function () {
      gsap.fromTo(words, { opacity: 0.15, y: 20 }, { opacity: 1, y: 0, stagger: 0.15, ease: "power2.out", scrollTrigger: { trigger: sec, start: "top 70%", end: "center 55%", scrub: 0.6 } });
      gsap.fromTo(points, { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.12, duration: 0.8, scrollTrigger: { trigger: ".real__points", start: "top 85%", once: true } });
    });
  })();

  /* Marquee: velocidad ligada al scroll (sutil) */
  (function marquee() {
    var tracks = $$(".marquee__track");
    if (!tracks.length) return;
    ScrollTrigger.create({
      trigger: ".marquee", start: "top bottom", end: "bottom top",
      onUpdate: function (self) {
        var v = Math.min(3, 1 + Math.abs(self.getVelocity()) / 1500);
        tracks.forEach(function (t) { t.getAnimations().forEach(function (a) { a.playbackRate = v; }); });
      }
    });
  })();

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
